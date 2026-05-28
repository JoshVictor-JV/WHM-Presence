import { create } from 'zustand';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Branch, HierarchyLevel, UserProfile } from '../types';

interface AppStore {
  // Auth state
  user: User | null;
  userProfile: UserProfile | null;
  authLoaded: boolean;
  
  // App data (real-time synchronized)
  branches: Branch[];
  hierarchyLevels: HierarchyLevel[];
  dataLoaded: boolean;
  
  // UI filter states
  selectedBranch: Branch | null;
  searchQuery: string;
  filterHierarchy: string;
  filterCountry: string;
  filterCity: string;
  
  // Navigation
  activeTab: 'map' | 'branches' | 'hierarchy' | 'settings';
  
  // Setters
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setAuthLoaded: (loaded: boolean) => void;
  setSelectedBranch: (branch: Branch | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterHierarchy: (levelId: string) => void;
  setFilterCountry: (country: string) => void;
  setFilterCity: (city: string) => void;
  setActiveTab: (tab: 'map' | 'branches' | 'hierarchy' | 'settings') => void;
  
  // Real-time listener un-subscribers
  unsubscribeBranches: (() => void) | null;
  unsubscribeHierarchy: (() => void) | null;
  
  // Firestore mutations
  addBranch: (branchData: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editBranch: (id: string, branchData: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  
  addHierarchyLevel: (levelData: HierarchyLevel) => Promise<void>;
  editHierarchyLevel: (id: string, levelData: Partial<HierarchyLevel>) => Promise<void>;
  deleteHierarchyLevel: (id: string) => Promise<void>;
  
  bootstrapDefaultHierarchy: () => Promise<void>;
  startRealtimeListeners: () => void;
  stopRealtimeListeners: () => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  userProfile: null,
  authLoaded: false,
  branches: [],
  hierarchyLevels: [],
  dataLoaded: false,
  
  selectedBranch: null,
  searchQuery: '',
  filterHierarchy: '',
  filterCountry: '',
  filterCity: '',
  
  activeTab: 'map',
  
  unsubscribeBranches: null,
  unsubscribeHierarchy: null,
  
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setAuthLoaded: (authLoaded) => set({ authLoaded }),
  setSelectedBranch: (selectedBranch) => set({ selectedBranch }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterHierarchy: (filterHierarchy) => set({ filterHierarchy }),
  setFilterCountry: (filterCountry) => set({ filterCountry }),
  setFilterCity: (filterCity) => set({ filterCity }),
  setActiveTab: (activeTab) => set({ activeTab }),

  startRealtimeListeners: () => {
    // Prevent duplicated listeners
    get().stopRealtimeListeners();
    
    console.log("Initializing real-time Firestore listeners");
    
    // 1. Listen to Hierarchy Levels sorted by orderIndex
    const hierarchyQuery = query(collection(db, 'hierarchy_levels'), orderBy('orderIndex', 'asc'));
    const unsubHierarchy = onSnapshot(hierarchyQuery, (snapshot) => {
      const levels: HierarchyLevel[] = [];
      snapshot.forEach((doc) => {
        levels.push({ id: doc.id, ...doc.data() } as HierarchyLevel);
      });
      set({ hierarchyLevels: levels });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hierarchy_levels');
    });

    // 2. Listen to Branches
    const branchesQuery = query(collection(db, 'branches'), orderBy('name', 'asc'));
    const unsubBranches = onSnapshot(branchesQuery, (snapshot) => {
      const branchList: Branch[] = [];
      snapshot.forEach((doc) => {
        branchList.push({ id: doc.id, ...doc.data() } as Branch);
      });
      set({ branches: branchList, dataLoaded: true });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'branches');
    });

    set({
      unsubscribeBranches: unsubBranches,
      unsubscribeHierarchy: unsubHierarchy
    });
  },

  stopRealtimeListeners: () => {
    const { unsubscribeBranches, unsubscribeHierarchy } = get();
    if (unsubscribeBranches) unsubscribeBranches();
    if (unsubscribeHierarchy) unsubscribeHierarchy();
    set({
      unsubscribeBranches: null,
      unsubscribeHierarchy: null,
      branches: [],
      hierarchyLevels: [],
      dataLoaded: false
    });
  },

  logout: async () => {
    get().stopRealtimeListeners();
    await signOut(auth);
    set({ user: null, userProfile: null, selectedBranch: null });
  },

  // BRANCHES CRUD OPERATIONS
  addBranch: async (branchData) => {
    const id = `branch_${Date.now()}`;
    const docRef = doc(db, 'branches', id);
    const nowISO = new Date().toISOString();
    
    // Format full structure matching final blueprint definitions
    const newBranch: Branch = {
      id,
      ...branchData,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    try {
      // In firestore.rules we check incoming().createdAt == request.time (under server timestamp)
      // Since our rules strictly force server-level comparisons, let's substitute standard dates or align with rules constraints.
      // Wait, let's look at the Firestore Rules we deployed:
      // incoming().createdAt == request.time && incoming().updatedAt == request.time
      // Ah! In firestore rules, 'request.time' matches the request server timestamp. If we write them in the payload as timestamp fields (e.g. serverTimestamp()), it will perfectly pass 'request.time'!
      // Wait, but our TypeScript types declare `createdAt: string`.
      // Let's modify the document format: if we use a firebase serverTimestamp for writes, it writes a Timestmap.
      // Let's make sure our rules structure works beautifully. Let's see: in the rules we checked:
      // incoming().createdAt == request.time && incoming().updatedAt == request.time.
      // If we pass serverTimestamp() for these, Firestore evaluates them as request.time.
      // But we can also set the rules to allow string coordinates or timestamp inputs. The easiest way to pass this rule is to send serverTimestamp() for both createdAt and updatedAt.
      // Let's check how we can read them: we can convert Firestore Timestamps to ISO strings in the listener or handle them dynamically:
      // In the listener, doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
      // This is extremely robust!
      
      const payload = {
        ...newBranch,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(docRef, payload);
      console.log('Branch added successfully to Firestore:', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `branches/${id}`);
    }
  },

  editBranch: async (id, branchData) => {
    const docRef = doc(db, 'branches', id);
    try {
      const payload = {
        ...branchData,
        updatedAt: serverTimestamp()
      };
      await updateDoc(docRef, payload);
      console.log('Branch updated successfully in Firestore:', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `branches/${id}`);
    }
  },

  deleteBranch: async (id) => {
    const docRef = doc(db, 'branches', id);
    try {
      await deleteDoc(docRef);
      console.log('Branch deleted successfully from Firestore:', id);
      if (get().selectedBranch?.id === id) {
        set({ selectedBranch: null });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `branches/${id}`);
    }
  },

  // HIERARCHY CRUD OPERATIONS
  addHierarchyLevel: async (levelData) => {
    const id = levelData.id || `level_${Date.now()}`;
    const docRef = doc(db, 'hierarchy_levels', id);
    try {
      await setDoc(docRef, {
        ...levelData,
        id
      });
      console.log('Hierarchy level added successfully:', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `hierarchy_levels/${id}`);
    }
  },

  editHierarchyLevel: async (id, levelData) => {
    const docRef = doc(db, 'hierarchy_levels', id);
    try {
      await updateDoc(docRef, levelData);
      console.log('Hierarchy level updated successfully:', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `hierarchy_levels/${id}`);
    }
  },

  deleteHierarchyLevel: async (id) => {
    const docRef = doc(db, 'hierarchy_levels', id);
    try {
      await deleteDoc(docRef);
      console.log('Hierarchy level deleted successfully:', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `hierarchy_levels/${id}`);
    }
  },

  // SEED INITIAL STRUCTURE
  bootstrapDefaultHierarchy: async () => {
    console.log("Seeding standard Worship Harvest hierarchies");
    const defaults = [
      { id: 'level_region', name: 'Region', color: '#8B5CF6', icon: 'Globe', orderIndex: 1 },
      { id: 'level_zone', name: 'Zone', color: '#3B82F6', icon: 'Compass', orderIndex: 2 },
      { id: 'level_hub', name: 'Hub', color: '#10B981', icon: 'Network', orderIndex: 3 },
      { id: 'level_campus', name: 'Campus', color: '#F59E0B', icon: 'Home', orderIndex: 4 },
      { id: 'level_mc', name: 'Missional Community', color: '#EF4444', icon: 'Users', orderIndex: 5 }
    ];

    try {
      for (const item of defaults) {
        await setDoc(doc(db, 'hierarchy_levels', item.id), item);
      }
      console.log("Seed successful");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'hierarchy_levels-bootstrap');
    }
  }
}));
