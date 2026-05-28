import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useAppStore } from './store/appStore';
import { AuthScreen } from './components/AuthScreen';
import { MapLibreDashboard } from './components/MapLibreDashboard';
import { BranchesListView } from './components/BranchesListView';
import { HierarchyLevelView } from './components/HierarchyLevelView';
import { SettingsView } from './components/SettingsView';
import { BranchFormModal } from './components/BranchFormModal';
import { HierarchyFormModal } from './components/HierarchyFormModal';
import { Branch, HierarchyLevel } from './types';
import { 
  Compass, 
  Layers, 
  Map, 
  Settings, 
  LogOut, 
  User, 
  Compass as CompassIcon,
  Search, 
  Loader2, 
  Phone, 
  Mail, 
  ExternalLink, 
  Edit, 
  Trash,
  Info,
  ChevronRight,
  Sparkles,
  MapPin,
  X
} from 'lucide-react';

export default function App() {
  const {
    user,
    userProfile,
    authLoaded,
    branches,
    hierarchyLevels,
    selectedBranch,
    activeTab,
    setUser,
    setUserProfile,
    setAuthLoaded,
    setSelectedBranch,
    setActiveTab,
    startRealtimeListeners,
    stopRealtimeListeners,
    logout,
    deleteBranch,
    searchQuery,
    setSearchQuery,
    filterHierarchy,
    setFilterHierarchy
  } = useAppStore();

  const [branchModalData, setBranchModalData] = useState<{ open: boolean; branch: Branch | null }>({ open: false, branch: null });
  const [levelModalData, setLevelModalData] = useState<{ open: boolean; level: HierarchyLevel | null }>({ open: false, level: null });

  // 1. Initial Authentication observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as any);
          } else {
            // Profile fallback
            const fallbackProfile = {
              uid: authUser.uid,
              email: authUser.email || '',
              displayName: authUser.displayName || authUser.email?.split('@')[0] || 'User',
              role: (authUser.email === 'jvjoshvictor@gmail.com' || authUser.email?.startsWith('admin')) ? 'admin' : 'viewer',
              createdAt: new Date().toISOString()
            };
            setUserProfile(fallbackProfile as any);
          }
          // Launch standard real-time listeners for authenticated state
          startRealtimeListeners();
        } catch (err) {
          console.error("Auth profile hydration error:", err);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        stopRealtimeListeners();
      }
      setAuthLoaded(true);
    });

    return () => unsub();
  }, []);

  // Helpers
  const handleEditBranchTrigger = (branch: Branch) => {
    setBranchModalData({ open: true, branch });
  };

  const handleCreateBranchTrigger = () => {
    setBranchModalData({ open: true, branch: null });
  };

  const handleEditLevelTrigger = (level: HierarchyLevel) => {
    setLevelModalData({ open: true, level });
  };

  const handleCreateLevelTrigger = () => {
    setLevelModalData({ open: true, level: null });
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the "${name}" branch?`)) {
      try {
        await deleteBranch(id);
      } catch (err) {
        alert("Action denied or permission insufficient.");
      }
    }
  };

  // Loading Screen
  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-slate-400">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-purple-500/10 border border-white/5 rounded-2xl glow-purple animate-pulse">
            <CompassIcon className="text-purple-400 animate-spin" size={32} />
          </div>
          <div>
            <h1 className="text-sm font-mono tracking-widest uppercase font-bold text-white">WHM Presence</h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-mono">Synchronizing Control Room Protocols...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return <AuthScreen />;
  }

  const isAdmin = userProfile?.role === 'admin';
  const selectedBranchLevel = selectedBranch ? hierarchyLevels.find(l => l.id === selectedBranch.hierarchyLevel) : null;
  const activeLevelColor = selectedBranchLevel?.color || selectedBranch?.branchColor || '#8B5CF6';

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 flex h-screen overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-[#0a0a0f] border-r border-white/5 flex flex-col justify-between shrink-0 select-none">
        
        {/* Brand Core */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <CompassIcon size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">WHM <span className="text-purple-500">Presence</span></h1>
              <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-0.5">Global Church System</span>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <nav className="flex-1 p-4 py-6 space-y-2.5 overflow-y-auto">
          
          <span className="block px-3.5 mb-2 text-[9px] font-mono font-semibold text-slate-500 tracking-widest uppercase">
            OPERATIONAL SYSTEMS
          </span>

          {/* Map Tab */}
          <button
            onClick={() => setActiveTab('map')}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'map' 
                ? 'bg-purple-500/10 border border-white/10 text-purple-400 font-bold shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Map size={15} />
            <span>Presence Map</span>
          </button>

          {/* Branches Tab */}
          <button
            onClick={() => setActiveTab('branches')}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'branches' 
                ? 'bg-purple-500/10 border border-white/10 text-purple-400 font-bold shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass size={15} />
            <span>Church Divisions</span>
            <span className="ml-auto text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-mono font-bold">
              {branches.length}
            </span>
          </button>

          {/* Hierarchy Tab */}
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'hierarchy' 
                ? 'bg-purple-500/10 border border-white/10 text-purple-400 font-bold shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={15} />
            <span>Hierarchy Builder</span>
            <span className="ml-auto text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-mono font-bold">
              {hierarchyLevels.length}
            </span>
          </button>

          <span className="block px-3.5 pt-4 mb-2 text-[9px] font-mono font-semibold text-slate-500 tracking-widest uppercase">
            RESOURCES & CONFIG
          </span>

          {/* Settings Tab */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'settings' 
                ? 'bg-purple-500/10 border border-white/10 text-purple-400 font-bold shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings size={15} />
            <span>Operator Console</span>
          </button>
        </nav>

        {/* User Session Widget & Logout */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0 font-bold text-xs uppercase">
              {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'U'}
            </div>
            <div className="overflow-hidden">
              <span className="block text-[11px] font-bold text-white truncate">{userProfile?.displayName || 'Overseer'}</span>
              <span className="block text-[9px] text-slate-500 font-mono truncate uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block shrink-0 animate-pulse"></span>
                <span>{userProfile?.role === 'admin' ? 'Administrator' : 'General Viewer'}</span>
              </span>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-left text-[11px] font-mono hover:bg-white/5 text-slate-500 hover:text-red-400 rounded-lg flex items-center gap-3 transition cursor-pointer"
          >
            <LogOut size={13} />
            <span>EXIT STATION</span>
          </button>
        </div>

      </aside>

      {/* 2. CHOOSE SCREEN AREA */}
      <main className="flex-1 flex flex-col h-full bg-[#050508]">
        
        {/* Top Navbar Header */}
        <header className="h-20 border-b border-white/5 px-8 bg-[#0a0a0f] flex items-center justify-between z-10 select-none">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-white tracking-tight uppercase font-sans">
              WH <span className="text-purple-500">Presence</span>
            </h2>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE GLOBAL FEED
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-3 py-1.5 border border-white/10 rounded-full select-all">
              GMT 2026-05-28 12:30
            </span>
          </div>
        </header>

        {/* Dynamic Inner screens list */}
        <div className={`flex-1 p-6 w-full min-h-0 ${activeTab === 'map' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
          {activeTab === 'map' && (
            <div className="w-full h-full flex flex-col lg:flex-row gap-6 relative overflow-hidden">
              
              {/* Left col: Map */}
              <div className="flex-1 h-full min-h-[450px]">
                <MapLibreDashboard />
              </div>

              {/* Right col / Side Drawer: Active Branch Detail panel */}
              {selectedBranch ? (
                <div className="w-full lg:w-80 bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 flex flex-col justify-between shrink-0 shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">
                  
                  {/* Visual header panel with custom color */}
                  <div>
                    <div className="flex items-start justify-between">
                      <span 
                        className="px-2.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-bold border"
                        style={{ 
                          borderColor: `${activeLevelColor}33`, 
                          backgroundColor: `${activeLevelColor}11`, 
                          color: activeLevelColor 
                        }}
                      >
                        {selectedBranchLevel?.name || 'Unassigned'}
                      </span>
                      
                      <button 
                        onClick={() => setSelectedBranch(null)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-white mt-4">{selectedBranch.name}</h3>
                    <p className="text-xs text-slate-450 font-mono mt-1">{selectedBranch.city}, {selectedBranch.country}</p>
                    
                    <div className="border-t border-white/5 my-4"></div>

                    {/* Geography Coordinates */}
                    <div className="space-y-4 text-xs font-sans">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-mono">SITE ADDRESS</span>
                        <p className="text-slate-300 mt-1 text-[11.5px] leading-relaxed select-all">
                          {selectedBranch.address || 'No location address documented'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-white/5 p-2.5 border border-white/10 rounded-xl text-[10px] font-mono">
                        <div>
                          <span className="text-slate-500 block">LATITUDE</span>
                          <span className="text-slate-300 select-all">{selectedBranch.latitude}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">LONGITUDE</span>
                          <span className="text-slate-300 select-all">{selectedBranch.longitude}</span>
                        </div>
                      </div>

                      {/* Leadership section */}
                      <div className="bg-white/5 p-4 border border-white/10 rounded-xl space-y-3">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">LEADERSHIP DETAIL</span>
                        <div className="font-semibold text-white">{selectedBranch.leaderName}</div>
                        
                        {selectedBranch.leaderPhone && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-450 font-mono">
                            <Phone size={12} className="text-purple-400 shrink-0" />
                            <a href={`tel:${selectedBranch.leaderPhone}`} className="hover:text-purple-300 hover:underline">{selectedBranch.leaderPhone}</a>
                          </div>
                        )}
                        
                        {selectedBranch.leaderEmail && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-450 font-mono overflow-hidden">
                            <Mail size={12} className="text-purple-400 shrink-0" />
                            <a href={`mailto:${selectedBranch.leaderEmail}`} className="hover:text-purple-300 hover:underline truncate w-full decoration-indigo-500">{selectedBranch.leaderEmail}</a>
                          </div>
                        )}
                      </div>

                      {/* General remarks */}
                      {selectedBranch.notes && (
                        <div>
                          <span className="text-[10px] text-slate-500 block font-mono">PRESENCE NOTES</span>
                          <p className="text-slate-400 text-[11px] leading-relaxed mt-1 italic max-h-24 overflow-y-auto">
                            "{selectedBranch.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer wrapper if administrator */}
                  <div className="border-t border-white/5 pt-4 flex justify-between gap-2.5 text-xs">
                    {isAdmin ? (
                      <>
                        <button 
                          onClick={() => handleEditBranchTrigger(selectedBranch)}
                          className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-250 flex items-center justify-center gap-1.5 rounded-xl transition font-medium select-none cursor-pointer"
                        >
                          <Edit size={12} className="text-purple-400" />
                          <span>Customize</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteBranch(selectedBranch.id, selectedBranch.name)}
                          className="py-2.5 px-3 bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-900 text-slate-400 hover:text-red-400 rounded-xl flex items-center justify-center gap-1.5 transition select-none cursor-pointer"
                        >
                          <Trash size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="text-[10px] text-slate-500 font-mono uppercase text-center w-full bg-white/5 p-2.5 rounded-xl py-1.5 italic border border-white/5">
                        View privileges only
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* Unselected Prompt panel */
                <div className="w-full lg:w-80 bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center shrink-0 shadow-lg select-none">
                  <Compass size={28} className="text-slate-600 mb-3" />
                  <span className="text-xs font-semibold text-white tracking-wide">Browse Global Network</span>
                  <p className="text-[11px] text-slate-400 mt-2 max-w-xs leading-relaxed">
                    Filter and select any glowing church coordinate pin on the interactive Map to inspect pastoral leaders, hierarchy tiers, address keys, and operational details instantly.
                  </p>
                </div>
              )}

            </div>
          )}

          {activeTab === 'branches' && (
            <BranchesListView 
              onEditBranch={handleEditBranchTrigger} 
              onAddBranch={handleCreateBranchTrigger} 
            />
          )}

          {activeTab === 'hierarchy' && (
            <HierarchyLevelView 
              onEditLevel={handleEditLevelTrigger} 
              onAddLevel={handleCreateLevelTrigger} 
            />
          )}

          {activeTab === 'settings' && <SettingsView />}
        </div>

      </main>

      {/* 3. MODALS SWITCHER PORTAL */}
      {branchModalData.open && (
        <BranchFormModal 
          branch={branchModalData.branch} 
          onClose={() => setBranchModalData({ open: false, branch: null })} 
        />
      )}

      {levelModalData.open && (
        <HierarchyFormModal 
          level={levelModalData.level} 
          onClose={() => setLevelModalData({ open: false, level: null })} 
        />
      )}

    </div>
  );
}
