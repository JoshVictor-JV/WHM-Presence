import React from 'react';
import { useAppStore } from '../store/appStore';
import { 
  User, 
  MapPin, 
  ShieldAlert, 
  Settings, 
  ExternalLink, 
  Terminal, 
  FileText, 
  Compass, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { userProfile, bootstrapDefaultHierarchy, hierarchyLevels } = useAppStore();

  const triggerManualSeed = async () => {
    try {
      await bootstrapDefaultHierarchy();
      alert("Corporate hierarchy structures seeded to Firestore successfully.");
    } catch (e) {
      alert("Error occurred. Double check Firestore active connection statuses.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      
      {/* Profile Overview Card */}
      <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <User size={28} className="text-purple-400" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded text-[9px] bg-purple-500/10 border border-white/10 text-purple-400 font-mono font-semibold tracking-wider uppercase">
              Authenticated Session
            </span>
            <h3 className="text-base font-bold text-white mt-1.5">{userProfile?.displayName || 'District Overseer'}</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">{userProfile?.email}</p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <span className="text-[10px] text-slate-500 block font-mono">ROLE PRIVILEGE TIER</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-white/10 text-purple-400 mt-1.5 font-mono uppercase">
            {userProfile?.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'GENERAL VIEWER'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core Keys configuration section */}
        <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
            <Settings size={14} className="text-purple-400" />
            <span>Map Tile Services</span>
          </h4>
          
          <p className="text-xs text-slate-400 leading-relaxed">
            WHM Presence reads geographic markers dynamically on a high-performance vector tile map. This build has been upgraded to MapLibre GL JS and OpenFreeMap vector styles.
          </p>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <div>
              <span className="block text-[10px] text-slate-500 font-mono">TILE SYSTEM ARCHITECTURE</span>
              <span className="text-purple-400 font-mono text-xs block mt-0.5 select-all">MapLibre GL JS & OpenFreeMap</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-mono">REGISTRATION REQUIREMENT</span>
              <p className="text-[10.5px] text-slate-400 mt-1">
                Zero. This system requires <strong className="text-purple-300">NO credit cards, NO user registration, and NO API keys</strong>, rendering secure vector elements directly on the public domain style layers.
              </p>
            </div>
          </div>
        </div>

        {/* Database seed utilities */}
        <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-400" />
              <span>Bootstrap Operations</span>
            </h4>
            
            <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
              If your database setup is empty, seed corporate level presets (Region, Zone, Hub, Campus, Missional Community) dynamically to start indexing church branch coordinates.
            </p>
          </div>

          <div className="bg-white/5 p-4 border border-white/10 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">EXISTING LEVELS</span>
              <span className="font-bold text-slate-300 font-mono mt-0.5 block">{hierarchyLevels.length} hierarchy levels on cloud</span>
            </div>
            
            <button
              onClick={triggerManualSeed}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-purple-450 hover:text-purple-400 flex items-center gap-1.5 transition cursor-pointer select-none"
            >
              <RefreshCw size={12} className="text-purple-400" />
              <span>Force Seed</span>
            </button>
          </div>
        </div>

      </div>

      {/* Developer instructions block */}
      <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
          <Terminal size={14} className="text-indigo-400" />
          <span>Production Vercel & Firebase Deployments</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
          <div className="space-y-2">
            <h5 className="font-semibold text-white">Production Build & Publish:</h5>
            <ol className="list-decimal list-inside space-y-1 text-slate-450 leading-relaxed">
              <li>Deploy standard code directly to Vercel/Cloud Run.</li>
              <li>No map tokens inside environmental structures are required.</li>
              <li>The Vite build asset outputs are bundled into optimized assets inside folder <code className="text-slate-300 font-mono text-[10px]">/dist</code>.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-white">Firestore Rules Operations:</h5>
            <ul className="list-disc list-inside space-y-1 text-slate-450 leading-relaxed">
              <li>Security rules are stored inside <code className="text-slate-300 font-mono text-[10px]">firestore.rules</code> file.</li>
              <li>Deploy rules on command line using: <code className="text-slate-350 font-mono text-[10px]">firebase deploy --only firestore:rules</code>.</li>
              <li>Always check integrity on the Google Firebase Dashboard console.</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
export default SettingsView;
