import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Branch } from '../types';
import { X, MapPin, Loader2, Sparkles } from 'lucide-react';

interface BranchFormModalProps {
  branch?: Branch | null; // If populated, we are in Edit mode
  onClose: () => void;
}

export const BranchFormModal: React.FC<BranchFormModalProps> = ({ branch, onClose }) => {
  const { hierarchyLevels, branches, addBranch, editBranch } = useAppStore();
  
  const [name, setName] = useState('');
  const [country, setCountry] = useState('Uganda');
  const [city, setCity] = useState('Kampala');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('0.34759');
  const [longitude, setLongitude] = useState('32.58252');
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [parentId, setParentId] = useState('');
  const [branchColor, setBranchColor] = useState('#8B5CF6');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Hydrate form in edit mode
  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setCountry(branch.country);
      setCity(branch.city);
      setAddress(branch.address);
      setLatitude(String(branch.latitude));
      setLongitude(String(branch.longitude));
      setLeaderName(branch.leaderName);
      setLeaderPhone(branch.leaderPhone || '');
      setLeaderEmail(branch.leaderEmail || '');
      setHierarchyLevel(branch.hierarchyLevel);
      setParentId(branch.parentId || '');
      setBranchColor(branch.branchColor || '#8B5CF6');
      setNotes(branch.notes || '');
    } else if (hierarchyLevels.length > 0) {
      // Preselect first hierarchy level
      setHierarchyLevel(hierarchyLevels[0].id);
      setBranchColor(hierarchyLevels[0].color);
      setParentId('');
    }
  }, [branch, hierarchyLevels]);

  // Sync level color
  const handleLevelChange = (levelId: string) => {
    setHierarchyLevel(levelId);
    const selected = hierarchyLevels.find(l => l.id === levelId);
    if (selected) {
      setBranchColor(selected.color);
    }
  };

  const fillQuickKampala = () => {
    setLatitude('0.34759');
    setLongitude('32.58252');
    setCity('Kampala');
    setCountry('Uganda');
    setAddress('Worship Harvest MC, Lubaga Road, Kampala');
  };

  const fillQuickNairobi = () => {
    setLatitude('-1.29207');
    setLongitude('36.82195');
    setCity('Nairobi');
    setCountry('Kenya');
    setAddress('Kilimani Road, Nairobi');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    // Field validation checks before submitting
    if (!name.trim()) return triggerError("Add a descriptive branch name.");
    if (!country.trim()) return triggerError("Specify a country.");
    if (!city.trim()) return triggerError("Specify a city.");
    if (!leaderName.trim()) return triggerError("Specify a lead overseer name.");
    if (!hierarchyLevel) return triggerError("Assocaiate branch with an organizational hierarchy tier.");
    
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return triggerError("Latitude coordinates must be a number between -90 and 90.");
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return triggerError("Longitude coordinates must be a number between -180 and 180.");
    }

    try {
      const payload = {
        name: name.trim(),
        country: country.trim(),
        city: city.trim(),
        address: address.trim(),
        latitude: latNum,
        longitude: lngNum,
        leaderName: leaderName.trim(),
        leaderPhone: leaderPhone.trim(),
        leaderEmail: leaderEmail.trim(),
        hierarchyLevel,
        parentId: parentId || '',
        branchColor,
        notes: notes.trim()
      };

      if (branch) {
        await editBranch(branch.id, payload);
      } else {
        await addBranch(payload);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while saving branch to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] font-sans">
      <div className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header decoration */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 border border-white/5 text-purple-400 font-mono font-semibold tracking-wider uppercase">
              {branch ? 'Editor Console' : 'New Intake Registry'}
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-1.5">
              <span>{branch ? `Edit: ${branch.name}` : 'Establish Worship Harvest Branch'}</span>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {errorMsg && (
            <div className="bg-red-950/40 border border-red-500/35 p-3.5 rounded-xl text-xs text-red-200">
              <span className="font-semibold text-red-100">Operation Safeguard Warning:</span> {errorMsg}
            </div>
          )}

          {/* Quick presets */}
          {!branch && (
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-sans">
                <Sparkles size={12} className="text-yellow-400" />
                <span>Quick Location Core Presets:</span>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={fillQuickKampala}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 text-[10px] text-purple-400 hover:bg-white/10 hover:text-purple-300 font-mono transition cursor-pointer font-bold"
                >
                  Kampala HQ (Uganda)
                </button>
                <button 
                  type="button" 
                  onClick={fillQuickNairobi}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 text-[10px] text-indigo-400 hover:bg-white/10 hover:text-indigo-300 font-mono transition cursor-pointer font-bold"
                >
                  Nairobi (Kenya)
                </button>
              </div>
            </div>
          )}

          {/* Core metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Branch Name *</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Lubaga Campus"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono">Structural Hierarchy Level *</label>
              {hierarchyLevels.length === 0 ? (
                <div className="text-xs text-amber-500 mt-2.5">
                  No organization Levels set. Bootstrap levels in Settings or Hierarchy builder first.
                </div>
              ) : (
                <select 
                  value={hierarchyLevel}
                  onChange={e => handleLevelChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
                >
                  {hierarchyLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id} className="bg-[#0a0a0f] text-slate-200">
                      {lvl.name} (Priority {lvl.orderIndex})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Parent selection to support nesting and marking entire regions & regions within regions */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Parent Region / Location (Optional - Marks "Region Within Region" Relations)
            </label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-205 focus:outline-none focus:border-purple-500/50 transition cursor-pointer"
            >
              <option value="" className="bg-[#0a0a0f] text-slate-400">-- No Parent Location (Root Level Node) --</option>
              {branches
                .filter(b => b.id !== branch?.id)
                .map((parent) => {
                  const pLevel = hierarchyLevels.find(l => l.id === parent.hierarchyLevel);
                  return (
                    <option key={parent.id} value={parent.id} className="bg-[#0a0a0f] text-slate-205">
                      {parent.name} [{pLevel?.name || 'Unassigned'}] - {parent.city}, {parent.country}
                    </option>
                  );
                })}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Select the parent item or region to group coordinates and plot nesting connections on the telemetry grid.
            </p>
          </div>

          {/* Leaders Info */}
          <div className="bg-white/[0.02] p-4 border border-white/5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Lead Overseer details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Leader Name *</label>
                <input 
                  type="text" 
                  required
                  value={leaderName}
                  onChange={e => setLeaderName(e.target.value)}
                  placeholder="e.g. Pastor Moses"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Leader Phone</label>
                <input 
                  type="tel" 
                  value={leaderPhone}
                  onChange={e => setLeaderPhone(e.target.value)}
                  placeholder="+256 701 123456"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Leader Email</label>
                <input 
                  type="email" 
                  value={leaderEmail}
                  onChange={e => setLeaderEmail(e.target.value)}
                  placeholder="pastor.moses@worshipharvest.org"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
                />
              </div>
            </div>
          </div>

          {/* Coordinates & Geography */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Country *</label>
              <input 
                type="text" 
                required
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Uganda"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-205 focus:outline-none focus:border-purple-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">City *</label>
              <input 
                type="text" 
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Kampala"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-205 focus:outline-none focus:border-purple-500/50 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Physical Site Location / Address</label>
            <input 
              type="text" 
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Plot 10 Kampala Road, Kampala"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-205 focus:outline-none focus:border-purple-500/50 transition"
            />
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center justify-between">
              <span>Geographic Pins</span>
              <span className="text-[10px] text-slate-500 font-normal normal-case">Decimal grid degrees representation</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono">LATITUDE (Y) *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 text-slate-650" size={14} />
                  <input 
                    type="number" 
                    step="0.00001"
                    required
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    placeholder="0.34759"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-sm text-slate-205 focus:outline-none focus:border-purple-500/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-mono">LONGITUDE (X) *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 text-slate-650" size={14} />
                  <input 
                    type="number" 
                    step="0.00001"
                    required
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    placeholder="32.58252"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-sm text-slate-205 focus:outline-none focus:border-purple-500/50 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Color & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Custom Marker Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={branchColor}
                  onChange={e => setBranchColor(e.target.value)}
                  className="w-12 h-11 bg-white/5 border border-white/10 rounded-xl cursor-pointer p-1"
                />
                <input 
                  type="text" 
                  value={branchColor}
                  onChange={e => setBranchColor(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-300 font-mono text-center focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Administrative & Presence Notes</label>
              <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter community size, target goals, service timelines or general comments."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-205 focus:outline-none focus:border-purple-500/50 transition"
              />
            </div>
          </div>

        </form>

        {/* Action Panel Footer */}
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
            disabled={isSubmitting || hierarchyLevels.length === 0}
            className="px-5 py-2 text-xs font-medium text-white rounded-xl bg-gradient-to-r from-purple-600 to-indigo-750 hover:from-purple-500 hover:to-indigo-650 shadow-[0_0_20px_rgba(124,58,237,0.35)] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving to Cloud...</span>
              </>
            ) : (
              <span>{branch ? 'Apply Updates' : 'Publish Branch'}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
