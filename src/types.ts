export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export interface HierarchyLevel {
  id: string;
  name: string;
  color: string;
  icon: string; // Name of Lucide icon to draw
  orderIndex: number;
}

export interface Branch {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  leaderName: string;
  leaderPhone: string;
  leaderEmail: string;
  hierarchyLevel: string; // links to HierarchyLevel.id
  branchColor?: string; // custom color override
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
