import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../store/appStore';
import { Branch } from '../types';
import { MapPin, AlertTriangle, Key, Compass, ZoomIn, ZoomOut, Layers, Search } from 'lucide-react';

interface MapLibreDashboardProps {
  onSelectCoords?: (lat: number, lng: number) => void;
  isSelectingCoords?: boolean;
}

export const MapLibreDashboard: React.FC<MapLibreDashboardProps> = ({ 
  onSelectCoords, 
  isSelectingCoords = false 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const { 
    branches, 
    hierarchyLevels, 
    selectedBranch, 
    setSelectedBranch, 
    searchQuery, 
    setSearchQuery, 
    filterHierarchy, 
    setFilterHierarchy, 
    filterCountry, 
    setFilterCountry, 
    filterCity, 
    setFilterCity 
  } = useAppStore();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewport, setViewport] = useState({ lat: 0.3476, lng: 32.5825, zoom: 2.5 });

  // Filter calculations from active store state
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const matchesSearch = 
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.country.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesHierarchy = filterHierarchy === '' || branch.hierarchyLevel === filterHierarchy;
      const matchesCountry = filterCountry === '' || branch.country === filterCountry;
      const matchesCity = filterCity === '' || branch.city === filterCity;
      
      return matchesSearch && matchesHierarchy && matchesCountry && matchesCity;
    });
  }, [branches, searchQuery, filterHierarchy, filterCountry, filterCity]);

  // Unique elements list for selectors
  const uniqueCountries = useMemo(() => {
    const list = branches.map(b => b.country).filter((c): c is string => !!c);
    return Array.from(new Set(list)).sort();
  }, [branches]);

  const uniqueCities = useMemo(() => {
    const list = branches.map(b => b.city).filter((c): c is string => !!c);
    return Array.from(new Set(list)).sort();
  }, [branches]);

  // MapLibre GL core initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [32.5825, 0.3476], // Kampala center as default
        zoom: 2.5,
        pitch: 30, // 3D elevation pitch
        bearing: 0,
        logoPosition: 'bottom-right'
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('load', () => {
        setMapLoaded(true);
        // Ensure map is correctly painted under flexible containers
        map.resize();
        setTimeout(() => {
          map.resize();
        }, 150);
        setTimeout(() => {
          map.resize();
        }, 400);
      });

      map.on('move', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        setViewport({
          lat: Number(center.lat.toFixed(4)),
          lng: Number(center.lng.toFixed(4)),
          zoom: Number(zoom.toFixed(1))
        });
      });

      map.on('click', (e) => {
        if (isSelectingCoords && onSelectCoords) {
          onSelectCoords(e.lngLat.lat, e.lngLat.lng);
        }
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error("MapLibre GL JS core canvas initialization failed:", err);
    }
  }, [isSelectingCoords, onSelectCoords]);

  // Fly mapping center to active selected branch
  useEffect(() => {
    if (mapRef.current && selectedBranch) {
      mapRef.current.flyTo({
        center: [selectedBranch.longitude, selectedBranch.latitude],
        zoom: 13,
        speed: 1.6,
        curve: 1.2,
        essential: true
      });
    }
  }, [selectedBranch]);

  // Sync Vector Marker Overlays reactive hooks
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    // Remove any stale markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filteredBranches.forEach((branch) => {
      const level = hierarchyLevels.find(l => l.id === branch.hierarchyLevel);
      const markerColor = level?.color || branch.branchColor || '#a855f7';

      // Custom sleek DOM element for Marker
      const el = document.createElement('div');
      el.className = 'custom-libre-marker group relative cursor-pointer';
      
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-3.5 rounded-full opacity-35 blur-md duration-300 animate-pulse transition-all group-hover:opacity-60" 
               style="background-color: ${markerColor}; width: 28px; height: 28px;"></div>
          <div class="relative w-4.5 h-4.5 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition duration-200 group-hover:scale-130" 
               style="background-color: ${markerColor}; box-shadow: 0 0 12px ${markerColor};">
          </div>
        </div>
      `;

      // Set up click action to trigger state update
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedBranch(branch);
      });

      // Build premium custom-styled glassmorphic popup overlay
      const popup = new maplibregl.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: true,
        className: 'custom-maplibre-popup'
      }).setHTML(`
        <div class="p-1 space-y-2 text-left font-sans select-text pointer-events-auto">
          <div class="flex items-center justify-between gap-1.5 pb-1 border-b border-white/5">
            <h4 class="text-sm font-bold text-white truncate max-w-[170px]">${branch.name}</h4>
            <span class="px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold shrink-0">
              ${level?.name || 'Unassigned'}
            </span>
          </div>
          
          <div class="text-[11px] text-slate-300 space-y-1">
            <div class="flex items-start gap-1.5">
              <span class="text-slate-500 font-bold font-mono">📍 TERRITORY:</span>
              <span class="text-slate-200">${branch.city || 'No City'}, ${branch.country || 'No Country'}</span>
            </div>
            <div class="flex items-start gap-1.5">
              <span class="text-slate-500 font-bold font-mono">👤 OVERSEER:</span>
              <span class="text-slate-200 font-medium">${branch.leaderName || 'Unknown Leader'}</span>
            </div>
            ${branch.leaderPhone ? `
              <div class="flex items-start gap-1.5">
                <span class="text-slate-500 font-bold font-mono">📞 CONNECT:</span>
                <a href="tel:${branch.leaderPhone}" class="text-purple-400 hover:text-purple-300 font-mono font-medium hover:underline transition">
                  ${branch.leaderPhone}
                </a>
              </div>
            ` : ''}
          </div>

          ${branch.notes ? `
            <div class="mt-2 pt-1.5 border-t border-white/5 text-[10px] text-slate-400 leading-relaxed italic max-h-[60px] overflow-y-auto">
              ${branch.notes}
            </div>
          ` : ''}
        </div>
      `);

      try {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([branch.longitude, branch.latitude])
          .setPopup(popup)
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      } catch (err) {
        console.error("Failed pinning marker:", err);
      }
    });

  }, [filteredBranches, hierarchyLevels, setSelectedBranch]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[500px] relative bg-[#06060a] border border-white/10 rounded-2xl overflow-hidden font-sans shadow-2xl">
      
      {/* GLOBAL CUSTOM CSS OVERRIDES STYLE BLOCK */}
      <style>{`
        /* Strip default MapLibre grey elements */
        .custom-maplibre-popup .maplibregl-popup-content {
          background: rgba(10, 10, 18, 0.85) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 16px !important;
          color: #e2e8f0 !important;
          padding: 14px 16px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65) !important;
        }
        .custom-maplibre-popup .maplibregl-popup-tip {
          border-top-color: rgba(10, 10, 18, 0.85) !important;
          border-bottom-color: rgba(10, 10, 18, 0.85) !important;
          border-left-color: rgba(10, 10, 18, 0.85) !important;
          border-right-color: rgba(10, 10, 18, 0.85) !important;
        }
        .custom-maplibre-popup .maplibregl-popup-close-button {
          color: #94a3b8 !important;
          padding: 4px 6px !important;
          font-size: 14px !important;
          line-height: 1 !important;
          font-weight: bold !important;
          top: 8px !important;
          right: 8px !important;
          cursor: pointer;
        }
        .custom-maplibre-popup .maplibregl-popup-close-button:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #ffffff !important;
          border-radius: 6px !important;
        }
        .maplibregl-ctrl-group {
          background: rgba(10, 10, 18, 0.7) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4) !important;
        }
        .maplibregl-ctrl-group button {
          width: 32px !important;
          height: 32px !important;
          background-color: transparent !important;
          border: 0 !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          cursor: pointer !important;
        }
        .maplibregl-ctrl-group button:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .maplibregl-ctrl-group button span {
          filter: invert(1) !important;
        }
        .maplibregl-ctrl-attrib {
          background: transparent !important;
          color: rgba(148, 163, 184, 0.4) !important;
          font-size: 9px !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
        }
        .maplibregl-ctrl-attrib a {
          color: rgba(148, 163, 184, 0.5) !important;
          text-decoration: none !important;
        }
        .maplibregl-ctrl-attrib a:hover {
          text-decoration: underline !important;
          color: #ffffff !important;
        }
      `}</style>

      {/* LEFT SIDE FILTER PANEL */}
      <div className="w-full lg:w-80 bg-[#0a0a0f] border-b lg:border-r border-white/5 p-5 flex flex-col gap-5 overflow-y-auto shrink-0 z-10 select-none">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 border border-white/5 text-purple-400 font-mono font-bold tracking-wider uppercase">
            Presence Command
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight mt-1">Spatial Operations</h2>
          <p className="text-xs text-slate-400 mt-1">Manage global corporate locations with precision filters.</p>
        </div>

        {/* Global Stats bento cards */}
        <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl grid grid-cols-2 gap-3 shadow-inner">
          <div className="text-left pl-1">
            <span className="block text-[9px] text-slate-500 font-bold font-mono tracking-wider uppercase">Active Nodes</span>
            <span className="text-2xl font-black font-mono text-purple-400 mt-0.5 block">{filteredBranches.length}</span>
          </div>
          <div className="text-left pl-3 border-l border-white/5">
            <span className="block text-[9px] text-slate-500 font-bold font-mono tracking-wider uppercase">Global Base</span>
            <span className="text-2xl font-black font-mono text-slate-300 mt-0.5 block">{branches.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Search Query field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Search Branches</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="Name, leader or city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition font-medium"
              />
            </div>
          </div>

          {/* Classification level selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Hierarchy Level</label>
            <select
              value={filterHierarchy}
              onChange={e => setFilterHierarchy(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 transition cursor-pointer font-medium"
            >
              <option value="" className="bg-[#0b0b12] text-slate-300">All Tiers</option>
              {hierarchyLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id} className="bg-[#0b0b12] text-slate-250">
                  {lvl.name} ({branches.filter(b => b.hierarchyLevel === lvl.id).length})
                </option>
              ))}
            </select>
          </div>

          {/* Country selection lookup */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Territorial Country</label>
            <select
              value={filterCountry}
              onChange={e => setFilterCountry(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 transition cursor-pointer font-medium"
            >
              <option value="" className="bg-[#0b0b12] text-slate-300">All Countries</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c} className="bg-[#0b0b12] text-slate-250">{c}</option>
              ))}
            </select>
          </div>

          {/* District or City selection lookup */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">District / City</label>
            <select
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 transition cursor-pointer font-medium"
            >
              <option value="" className="bg-[#0b0b12] text-slate-300">All Districts</option>
              {uniqueCities.map((ct) => (
                <option key={ct} value={ct} className="bg-[#0b0b12] text-slate-250">{ct}</option>
              ))}
            </select>
          </div>

          {/* Parameter Reset operations */}
          {(searchQuery || filterHierarchy || filterCountry || filterCity) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterHierarchy('');
                setFilterCountry('');
                setFilterCity('');
              }}
              className="w-full mt-2 py-3 text-xs font-bold text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl hover:text-white transition cursor-pointer font-mono uppercase tracking-widest text-center block"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Informational tips */}
        <div className="mt-auto p-3.5 bg-purple-500/5 border border-purple-500/10 rounded-xl text-[10px] text-purple-300/80 leading-relaxed font-sans flex items-start gap-2">
          <span className="text-xs shrink-0 mt-0.5">ℹ️</span>
          <span>Click any marker pin on the map to interact, view notes, and trigger contact paths directly.</span>
        </div>
      </div>

      {/* RIGHT SIDE MAP RENDERER */}
      <div className="flex-1 h-full min-h-[350px] lg:min-h-0 relative">
        <div className="absolute inset-0 w-full h-full z-0" ref={mapContainerRef} />

        {/* Compass / Coordinate overview layer */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none select-none">
          <div className="bg-white/5 backdrop-blur border border-white/5 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-400 flex items-center gap-1.5 shadow-lg">
            <Layers size={11} className="text-purple-400" />
            <span>GRID: {viewport.lng}° E, {viewport.lat}° N @ ZOOM {viewport.zoom}</span>
          </div>
        </div>

        {/* Selection overlay layout for coordinates integration if enabled */}
        {isSelectingCoords && (
          <div className="absolute inset-0 border-2 border-dashed border-purple-500/25 pointer-events-none flex items-center justify-center bg-black/40 z-20">
            <div className="bg-[#0c0c16]/95 border border-purple-500/20 px-4 py-3.5 rounded-2xl text-center shadow-[0_0_35px_rgba(124,58,237,0.25)] max-w-xs animate-bounce pointer-events-auto">
              <MapPin className="text-purple-400 mx-auto animate-pulse mb-1.5" size={24} />
              <p className="text-xs font-semibold text-white">Click Map to Select Pin Coordinates</p>
              <p className="text-[10px] text-purple-300 mt-1">Select location precisely on the matrix style grid to bind form fields.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
