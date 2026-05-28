import React from 'react';
import { useAppStore } from '../store/appStore';
import { HierarchyLevel } from '../types';
import { Edit2, Trash2, Plus, Sparkles, AlertCircle, Layers, Award, Shield } from 'lucide-react';

interface HierarchyLevelViewProps {
  onEditLevel: (level: HierarchyLevel) => void;
  onAddLevel: () => void;
}

export const HierarchyLevelView: React.FC<HierarchyLevelViewProps> = ({ 
  onEditLevel, 
  onAddLevel 
}) => {
  const { 
    hierarchyLevels, 
    branches, 
    userProfile, 
    deleteHierarchyLevel, 
    bootstrapDefaultHierarchy 
  } = useAppStore();

  const isAdmin = userProfile?.role === 'admin';

  const handleLevelDelete = async (id: string, name: string) => {
    // Safety check check whether any branches are depending on this hierarchy level
    const dependencies = branches.filter(b => b.hierarchyLevel === id);
    if (dependencies.length > 0) {
      alert(`Safety Guard Warning: Cannot delete this Level! There are ${dependencies.length} active branches categorized under "${name}". First re-assign those branches to another level.`);
      return;
    }

    if (confirm(`Are you sure you want to delete the "${name}" hierarchy level?`)) {
      try {
        await deleteHierarchyLevel(id);
      } catch (err: any) {
        alert("Permission denied or database storage error occurred.");
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro section */}
      <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 relative z-10 max-w-xl">
          <span className="px-2.5 py-0.5 rounded text-[10px] bg-purple-500/10 border border-white/10 text-purple-400 font-mono tracking-wider font-semibold uppercase">
            Architect Studio
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight mt-1">Dynamic Structural Hierarchy Builder</h2>
          <p className="text-xs text-slate-400">
            Define organizational church leveling dynamically. Tiers control marker styling on interactive maps and enforce nested sorting alignments.
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-3 shrink-0 relative z-10">
            {hierarchyLevels.length === 0 && (
              <button 
                onClick={() => bootstrapDefaultHierarchy()}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-purple-500/20 text-purple-400 hover:text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition select-none cursor-pointer"
              >
                <Sparkles size={13} className="text-yellow-400 animate-pulse" />
                <span>Seed Default Levels</span>
              </button>
            )}
            <button 
              onClick={onAddLevel}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-[0_0_20px_rgba(124,58,237,0.3)] transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Level</span>
            </button>
          </div>
        )}
      </div>

      {hierarchyLevels.length === 0 ? (
        /* Empty Seeding display card */
        <div className="p-16 text-center bg-[#0a0a0f] border border-dashed border-white/10 rounded-2xl max-w-lg mx-auto">
          <Layers className="mx-auto text-slate-600 animate-bounce mb-4" size={40} />
          <h3 className="text-sm font-semibold text-white">No Hierarchical Levels Defined</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Worship Harvest uses dynamic tiers to organize global coordinates properly. Seed default corporate tiers in exactly 1-click.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button 
              onClick={() => bootstrapDefaultHierarchy()}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xl hover:text-purple-300 transition cursor-pointer"
            >
              <Sparkles size={14} className="text-yellow-400 shrink-0" />
              <span>Bootstrap Worship Harvest Levels</span>
            </button>
          </div>
        </div>
      ) : (
        /* Render Hierarchy sequence */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hierarchyLevels.map((lvl, index) => {
            // Count branches associated with this specific level
            const matchedBranchCount = branches.filter(b => b.hierarchyLevel === lvl.id).length;
            
            return (
              <div 
                key={lvl.id}
                className="glass-card rounded-2xl p-6 border border-white/10 hover:border-white/25 transition relative group"
              >
                {/* Visual side accent */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" 
                  style={{ backgroundColor: lvl.color }}
                />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border text-slate-200"
                      style={{ 
                        borderColor: `${lvl.color}33`, 
                        backgroundColor: `${lvl.color}11`,
                        color: lvl.color
                      }}
                    >
                      <Layers size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{lvl.name}</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-0.5">
                        Priority rank index: {lvl.orderIndex}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-550 font-bold bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                    #{(index + 1).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Info block */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] border-t border-white/5 pt-4">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono">COLOR PALETTE</span>
                    <span className="font-mono text-slate-300 block mt-1">{lvl.color}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500 font-mono">ASSIGNED BRANCHES</span>
                    <span className="font-semibold text-slate-300 block mt-1">
                      {matchedBranchCount} {matchedBranchCount === 1 ? 'branch' : 'branches'}
                    </span>
                  </div>
                </div>

                {/* Operations overlay inside the card */}
                {isAdmin && (
                  <div className="mt-4 flex justify-end gap-1.5 border-t border-white/5 pt-4 opacity-75 group-hover:opacity-100 transition duration-150">
                    <button 
                      onClick={() => onEditLevel(lvl)}
                      className="p-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center gap-1 text-[10px] transition cursor-pointer font-medium"
                    >
                      <Edit2 size={11} />
                      <span>Configure</span>
                    </button>
                    <button 
                      onClick={() => handleLevelDelete(lvl.id, lvl.name)}
                      className="p-1.5 px-3 rounded-lg bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-900 text-slate-400 hover:text-red-400 flex items-center gap-1 text-[10px] transition cursor-pointer font-medium"
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Helper documentation guide layout */}
      <div className="p-5 bg-[#0a0a0f]/60 border border-white/5 rounded-2xl space-y-2">
        <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle size={13} className="text-purple-400" />
          <span>Hierarchy Structuring Best Practices</span>
        </h4>
        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
          The dynamic tree levels allow mapping of WHM campuses globally. When you configure structural order indices (e.g. 1, 2, 3), nested filters will arrange nodes on lists based on priority hierarchies. Setting cohesive color codes makes spatial identification faster when browsing overlapping locations.
        </p>
      </div>

    </div>
  );
};
export default HierarchyLevelView;
