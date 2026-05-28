import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { HierarchyLevel } from '../types';
import { X, Loader2, Award } from 'lucide-react';
import { LucideIcon } from './LucideIcon';

interface HierarchyFormModalProps {
  level?: HierarchyLevel | null; // Populated in EDIT mode
  onClose: () => void;
}

// Neat Lucide icons suggestions to select from
const SUGGESTED_ICONS = [
  'Globe',
  'Compass',
  'Network',
  'Home',
  'Users',
  'MapPin',
  'Flame',
  'Bookmark',
  'Award',
  'Shield',
  'Anchor',
  'Navigation'
];

export const HierarchyFormModal: React.FC<HierarchyFormModalProps> = ({ level, onClose }) => {
  const { addHierarchyLevel, editHierarchyLevel } = useAppStore();
  
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [icon, setIcon] = useState('MapPin');
  const [orderIndex, setOrderIndex] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (level) {
      setName(level.name);
      setColor(level.color);
      setIcon(level.icon);
      setOrderIndex(level.orderIndex);
    }
  }, [level]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg("Please enter a name for the hierarchy level (e.g. Campus).");
      setIsSubmitting(false);
      return;
    }

    try {
      if (level) {
        // Edit existing level
        await editHierarchyLevel(level.id, {
          name: name.trim(),
          color,
          icon,
          orderIndex: Number(orderIndex)
        });
      } else {
        // Set unique level Id
        const levelId = `level_${name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        await addHierarchyLevel({
          id: levelId,
          name: name.trim(),
          color,
          icon,
          orderIndex: Number(orderIndex)
        });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while saving hierarchy tier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] font-sans">
      <div className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-white/5 text-indigo-400 font-mono font-semibold tracking-wider uppercase">
              {level ? 'Modifier Panel' : 'Structural Architects Blueprint'}
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-1.5">
              <span>{level ? `Edit Level: ${level.name}` : 'Construct Hierarchy Level'}</span>
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="bg-red-950/40 border border-red-500/20 p-3 rounded-xl text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono uppercase tracking-wider">Hierarchy Tier Name *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Region, Zone, Hub, Campus"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">This represents the classification name that branches will inherit.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono uppercase tracking-wider">Display Priority Level *</label>
              <input 
                type="number" 
                min="0"
                max="100"
                required
                value={orderIndex}
                onChange={e => setOrderIndex(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">Lower values are ranked higher in sorting layout tiers.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono uppercase tracking-wider">Marker Theme Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-12 h-11 bg-white/5 border border-white/10 rounded-xl cursor-pointer p-1"
                />
                <input 
                  type="text" 
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-2 text-xs text-slate-300 font-mono text-center focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono uppercase tracking-wider">Aesthetic Icon Representation *</label>
            <div className="grid grid-cols-4 gap-2.5 max-h-40 overflow-y-auto p-2 bg-white/[0.01] border border-white/5 rounded-xl">
              {SUGGESTED_ICONS.map((icName) => {
                const isSelected = icon === icName;
                return (
                  <button
                    key={icName}
                    type="button"
                    onClick={() => setIcon(icName)}
                    className={`p-2 rounded-xl border text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-purple-500/10 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-slate-300">
                      <LucideIcon name={icName} size={15} />
                    </span>
                    <span className="text-[9px] truncate w-full text-center font-bold">{icName}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="p-4 bg-white/[0.01] border-t border-white/5 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-medium text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center gap-1.5 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Storing...</span>
              </>
            ) : (
              <span>{level ? 'Save Changes' : 'Publish Hierarchy'}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
