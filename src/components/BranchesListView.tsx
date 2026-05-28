import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { Branch } from '../types';
import { Edit2, Trash2, Plus, Search, MapPin, Eye, ExternalLink, Download } from 'lucide-react';

interface BranchesListViewProps {
  onEditBranch: (branch: Branch) => void;
  onAddBranch: () => void;
}

export const BranchesListView: React.FC<BranchesListViewProps> = ({ 
  onEditBranch, 
  onAddBranch 
}) => {
  const { 
    branches, 
    hierarchyLevels, 
    userProfile, 
    deleteBranch,
    searchQuery,
    setSearchQuery,
    filterHierarchy,
    setFilterHierarchy,
    filterCountry,
    setFilterCountry,
    setSelectedBranch,
    setActiveTab
  } = useAppStore();

  const isAdmin = userProfile?.role === 'admin';

  // State for column sorting
  const [sortField, setSortField] = useState<keyof Branch>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Derive list of unique countries and cities for filters
  const countries = useMemo(() => {
    const list = branches.map(b => b.country);
    return Array.from(new Set(list)).filter(Boolean);
  }, [branches]);

  const handleSort = (field: keyof Branch) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Live filter algorithm
  const filteredAndSortedBranches = useMemo(() => {
    let result = branches.filter(branch => {
      const matchesSearch = 
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.country.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesHierarchy = filterHierarchy === '' || branch.hierarchyLevel === filterHierarchy;
      const matchesCountry = filterCountry === '' || branch.country === filterCountry;
      
      return matchesSearch && matchesHierarchy && matchesCountry;
    });

    // Handle string & number columns sorting
    result.sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [branches, searchQuery, filterHierarchy, filterCountry, sortField, sortAsc]);

  // Export utility as CSV as required
  const exportToCSV = () => {
    if (branches.length === 0) return;
    
    const headers = ['Name', 'Hierarchy Level', 'Leader Name', 'Leader Email', 'Leader Phone', 'Country', 'City', 'Address', 'Latitude', 'Longitude', 'Notes'];
    const rows = branches.map(b => {
      const lvl = hierarchyLevels.find(l => l.id === b.hierarchyLevel);
      return [
        `"${b.name}"`,
        `"${lvl?.name || ''}"`,
        `"${b.leaderName}"`,
        `"${b.leaderEmail}"`,
        `"${b.leaderPhone}"`,
        `"${b.country}"`,
        `"${b.city}"`,
        `"${b.address}"`,
        b.latitude,
        b.longitude,
        `"${b.notes || ''}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WHM_Branches_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const jumpToBranchOnMap = (branch: Branch) => {
    setSelectedBranch(branch);
    setActiveTab('map');
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the ${name} branch?`)) {
      try {
        await deleteBranch(id);
      } catch (err) {
        alert("Action denied or database error occurred.");
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Strip */}
      <div className="p-4 bg-[#0a0a0f] border border-white/5 rounded-xl flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-3.5 text-slate-500" size={15} />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search branch name, pastorship, city or country..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Level Filter */}
          <select
            value={filterHierarchy}
            onChange={e => setFilterHierarchy(e.target.value)}
            className="bg-white/5 border border-white/10 text-xs text-slate-300 rounded-xl p-3 px-4 focus:outline-none focus:border-purple-500/50 transition grow lg:grow-0"
          >
            <option value="">All Hierarchy Levels</option>
            {hierarchyLevels.map(lvl => (
              <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
            ))}
          </select>

          {/* Country Filter */}
          <select
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            className="bg-white/5 border border-white/10 text-xs text-slate-300 rounded-xl p-3 px-4 focus:outline-none focus:border-purple-500/50 transition grow lg:grow-0"
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Actions */}
          <button 
            onClick={exportToCSV}
            disabled={branches.length === 0}
            className="p-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition grow lg:grow-0 disabled:opacity-40 select-none cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {isAdmin && (
            <button 
              onClick={onAddBranch}
              className="p-3 px-5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(124,58,237,0.3)] transition cursor-pointer grow lg:grow-0"
            >
              <Plus size={14} />
              <span>Add Branch</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabular View Grid */}
      <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase select-none">
                <th className="p-4 pl-6 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>Branch Name</th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('hierarchyLevel')}>Alignment Level</th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('leaderName')}>Lead Overseer</th>
                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('city')}>Geography</th>
                <th className="p-4">Contact Detail</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredAndSortedBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-12 text-slate-400 select-none">
                    <MapPin className="mx-auto text-slate-600 animate-pulse mb-3" size={32} />
                    <p className="font-semibold text-white">No Worship Harvest branches found</p>
                    <p className="text-[11px] text-slate-500 mt-1">Refine your search parameters or register a new branch.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedBranches.map((b) => {
                  const level = hierarchyLevels.find(l => l.id === b.hierarchyLevel);
                  const levelColor = level?.color || b.branchColor || '#8B5CF6';
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition duration-150">
                      
                      {/* Name */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: levelColor }} />
                          <div>
                            <span className="font-semibold text-white block">{b.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono italic">{b.address || 'No address set'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Level Tag */}
                      <td className="p-4">
                        <span 
                          className="px-2.5 py-0.5 rounded text-[9px] font-semibold border uppercase tracking-wider"
                          style={{ 
                            borderColor: `${levelColor}22`, 
                            backgroundColor: `${levelColor}0D`, 
                            color: levelColor 
                          }}
                        >
                          {level?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Leader */}
                      <td className="p-4">
                        <div className="font-medium text-slate-300">{b.leaderName}</div>
                        {b.leaderEmail && <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">{b.leaderEmail}</div>}
                      </td>

                      {/* Location details */}
                      <td className="p-4">
                        <span className="text-slate-300 font-medium">{b.city}</span>
                        <span className="text-slate-500 ml-1">({b.country})</span>
                      </td>

                      {/* Tel */}
                      <td className="p-4 text-slate-405 font-mono text-[10.5px]">
                        {b.leaderPhone || <span className="text-slate-700">-</span>}
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button 
                            onClick={() => jumpToBranchOnMap(b)}
                            title="Jump on global Map" 
                            className="p-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer text-[10.5px]"
                          >
                            <ExternalLink size={12} />
                            <span>Jump</span>
                          </button>
                          
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => onEditBranch(b)}
                                title="Edit Branch metadata" 
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => handleDelete(b.id, b.name)}
                                title="Delete Branch" 
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-900 text-slate-400 hover:text-red-400 transition cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default BranchesListView;
