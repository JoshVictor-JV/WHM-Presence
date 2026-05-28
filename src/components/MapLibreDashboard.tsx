import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../store/appStore';
import { Branch } from '../types';
import { 
  MapPin, 
  Layers, 
  Search, 
  Sun, 
  Moon, 
  Maximize2, 
  Minimize2, 
  HelpCircle, 
  BookOpen, 
  X,
  Compass, 
  Network, 
  Share2
} from 'lucide-react';

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
  const [isLightMode, setIsLightMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

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

  // Escape key global event handler to return to page from fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Force Map resize triggers when fullscreen changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.resize();
      }, 50);
      setTimeout(() => {
        mapRef.current?.resize();
      }, 200);
      setTimeout(() => {
        mapRef.current?.resize();
      }, 450);
    }
  }, [isFullscreen, showGuide]);

  // MapLibre GL core initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: isLightMode ? 'https://tiles.openfreemap.org/styles/positron' : 'https://tiles.openfreemap.org/styles/dark',
        center: [32.5825, 0.3476], // Kampala center as default
        zoom: 2.5,
        pitch: 30, // 3D elevation pitch
        bearing: 0,
        logoPosition: 'bottom-right'
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('load', () => {
        setMapLoaded(true);
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

  // Support changing tile style layers dynamic action
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setStyle(
        isLightMode 
          ? 'https://tiles.openfreemap.org/styles/positron' 
          : 'https://tiles.openfreemap.org/styles/dark'
      );
    }
  }, [isLightMode, mapLoaded]);

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

  // Dynamic Parent-Child vector network lines effect
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    try {
      const lineFeatures = filteredBranches
        .map(branch => {
          if (!branch.parentId) return null;
          const parent = branches.find(b => b.id === branch.parentId);
          if (!parent) return null;
          const level = hierarchyLevels.find(l => l.id === branch.hierarchyLevel);
          return {
            type: 'Feature' as const,
            properties: {
              color: level?.color || branch.branchColor || '#a855f7'
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [branch.longitude, branch.latitude],
                [parent.longitude, parent.latitude]
              ]
            }
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      const sourceId = 'parent-child-lines';
      const layerId = 'parent-child-lines-layer';
      const map = mapRef.current;

      const drawLinesOnMapStyle = () => {
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: lineFeatures
          });
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: lineFeatures
            }
          });

          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 2.5,
              'line-opacity': 0.8,
              'line-dasharray': [3, 2]
            }
          });
        }
      };

      if (map.isStyleLoaded() || map.loaded()) {
        drawLinesOnMapStyle();
      } else {
        map.once('idle', drawLinesOnMapStyle);
      }
    } catch (err) {
      console.error("GeoJSON nested lines setup failed:", err);
    }
  }, [filteredBranches, branches, mapLoaded, isLightMode, hierarchyLevels]);

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
          <div class="flex items-center justify-between gap-1.5 pb-1 border-b border-light-dark">
            <h4 class="text-sm font-bold text-header truncate max-w-[170px]">${branch.name}</h4>
            <span class="px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-badge border border-badge-border text-badge-fore font-bold shrink-0">
              ${level?.name || 'Unassigned'}
            </span>
          </div>
          
          <div class="text-[11px] text-desc space-y-1">
            <div class="flex items-start gap-1.5">
              <span class="text-label font-bold font-mono">📍 TERRITORY:</span>
              <span class="text-value">${branch.city || 'No City'}, ${branch.country || 'No Country'}</span>
            </div>
            ${branch.leaderName ? `
              <div class="flex items-start gap-1.5">
                <span class="text-label font-bold font-mono">👤 OVERSEER:</span>
                <span class="text-value font-medium">${branch.leaderName}</span>
              </div>
            ` : ''}
            ${branch.leaderPhone ? `
              <div class="flex items-start gap-1.5">
                <span class="text-label font-bold font-mono">📞 CONNECT:</span>
                <a href="tel:${branch.leaderPhone}" class="text-link hover:text-link-hover font-mono font-medium hover:underline transition">
                  ${branch.leaderPhone}
                </a>
              </div>
            ` : ''}
          </div>

          ${branch.notes ? `
            <div class="mt-2 pt-1.5 border-t border-light-dark text-[10px] text-notes leading-relaxed italic max-h-[60px] overflow-y-auto">
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

  }, [filteredBranches, hierarchyLevels, setSelectedBranch, isLightMode]);

  return (
    <div className={`flex flex-col w-full h-full min-h-[750px] relative rounded-2xl overflow-hidden font-sans shadow-2xl border transition-all duration-350 
      ${isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-none' : ''} 
      ${isLightMode ? 'bg-[#f8fafc] border-slate-200 text-slate-800 light-mode-map' : 'bg-[#06060a] border-white/10 text-white'}`}
    >
      
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

        /* Light mode popup overrides */
        .light-mode-map .custom-maplibre-popup .maplibregl-popup-content {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          color: #0f172a !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
        }
        .light-mode-map .custom-maplibre-popup .maplibregl-popup-tip {
          border-top-color: rgba(255, 255, 255, 0.95) !important;
          border-bottom-color: rgba(255, 255, 255, 0.95) !important;
          border-left-color: rgba(255, 255, 255, 0.95) !important;
          border-right-color: rgba(255, 255, 255, 0.95) !important;
        }
        .light-mode-map .custom-maplibre-popup .maplibregl-popup-close-button {
          color: #475569 !important;
        }
        .light-mode-map .custom-maplibre-popup .maplibregl-popup-close-button:hover {
          background: rgba(0, 0, 0, 0.05) !important;
          color: #000000 !important;
        }
        .light-mode-map .maplibregl-ctrl-group {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
        }
        .light-mode-map .maplibregl-ctrl-group button span {
          filter: none !important;
        }

        /* Custom mapping helper classes for popup styles */
        .custom-maplibre-popup .text-header { color: #f1f5f9; }
        .custom-maplibre-popup .border-light-dark { border-color: rgba(255, 255, 255, 0.08); }
        .custom-maplibre-popup .bg-badge { background-color: rgba(168, 85, 247, 0.1); }
        .custom-maplibre-popup .border-badge-border { border-color: rgba(168, 85, 247, 0.2); }
        .custom-maplibre-popup .text-badge-fore { color: #d8b4fe; }
        .custom-maplibre-popup .text-desc { color: #cbd5e1; }
        .custom-maplibre-popup .text-label { color: #64748b; }
        .custom-maplibre-popup .text-value { color: #e2e8f0; }
        .custom-maplibre-popup .text-link { color: #c084fc; }
        .custom-maplibre-popup .text-link-hover { color: #d8b4fe; }
        .custom-maplibre-popup .text-notes { color: #94a3b8; }

        .light-mode-map .custom-maplibre-popup .text-header { color: #0f172a; }
        .light-mode-map .custom-maplibre-popup .border-light-dark { border-color: rgba(0, 0, 0, 0.08); }
        .light-mode-map .custom-maplibre-popup .bg-badge { background-color: rgba(147, 51, 234, 0.08); }
        .light-mode-map .custom-maplibre-popup .border-badge-border { border-color: rgba(147, 51, 234, 0.15); }
        .light-mode-map .custom-maplibre-popup .text-badge-fore { color: #7e22ce; }
        .light-mode-map .custom-maplibre-popup .text-desc { color: #334155; }
        .light-mode-map .custom-maplibre-popup .text-label { color: #64748b; }
        .light-mode-map .custom-maplibre-popup .text-value { color: #1e293b; }
        .light-mode-map .custom-maplibre-popup .text-link { color: #9333ea; }
        .light-mode-map .custom-maplibre-popup .text-link-hover { color: #7e22ce; }
        .light-mode-map .custom-maplibre-popup .text-notes { color: #475569; }
      `}</style>

      {/* TOP FILTERS PANEL & OPERATIONS CONTROLS */}
      <div className={`w-full p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b transition-colors duration-300 z-10 select-none ${isLightMode ? 'bg-[#ffffff] border-slate-200' : 'bg-[#0a0a0f] border-white/5'}`}>
        
        {/* Visual Title Header and Theme Switching Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 justify-between w-full lg:w-auto shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border transition-colors ${isLightMode ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-purple-500/10 border-white/5 text-purple-400'}`}>
                Presence Command
              </span>
              {(searchQuery || filterHierarchy || filterCountry || filterCity) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterHierarchy('');
                    setFilterCountry('');
                    setFilterCity('');
                  }}
                  className={`px-2 py-0.5 text-[8px] font-black rounded border cursor-pointer uppercase ${isLightMode ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20'}`}
                >
                  RESET FILTERS
                </button>
              )}
            </div>
            <h2 className={`text-lg font-bold tracking-tight mt-1 transition-colors flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              <span>Spatial Operations</span>
              {isFullscreen && (
                <span className="text-[10px] bg-red-500/10 border border-red-500/35 text-red-400 px-2 py-0.5 rounded font-mono animate-pulse uppercase">
                  Fullscreen Mode
                </span>
              )}
            </h2>
            <p className={`text-xs transition-colors ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Manage global corporate locations with optimized telemetry and controls.
            </p>
          </div>

          {/* Compact visual Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Interactive Telemetry Manual guide activator */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold tracking-wide transition cursor-pointer ${showGuide ? (isLightMode ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-purple-500/20 border-purple-500/30 text-purple-300') : (isLightMode ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5')}`}
            >
              <BookOpen size={13} />
              <span>{showGuide ? 'Hide Manual' : 'Show Manual'}</span>
            </button>

            {/* Simulated Fullscreen control trigger */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold tracking-wide transition cursor-pointer ${isFullscreen ? 'bg-red-600 border-red-600 text-white' : (isLightMode ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5')}`}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={13} />
                  <span>Exit Full [Esc]</span>
                </>
              ) : (
                <>
                  <Maximize2 size={13} />
                  <span>View Fullscreen</span>
                </>
              )}
            </button>

            {/* Inline Theme Toggle Switch */}
            <div className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                {isLightMode ? <Sun size={11} className="text-amber-500" /> : <Moon size={11} className="text-purple-400" />} Theme:
              </span>
              <button
                onClick={() => setIsLightMode(!isLightMode)}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLightMode ? 'bg-purple-600' : 'bg-slate-705'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isLightMode ? 'translate-x-3.5' : 'translate-x-0'}`}
                />
              </button>
            </div>

          </div>
        </div>

        {/* Global Node statistics counts and search, filter fields mapping matrix style */}
        <div className="flex flex-col md:flex-row w-full items-stretch gap-4 flex-1">
          
          {/* Filters Fields Grid - Dynamic and fully responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 flex-1">
            
            {/* Search Query */}
            <div className="space-y-1">
              <label className={`block text-[10px] font-bold font-mono uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>Search</label>
              <div className="relative">
                <Search className={`absolute left-3.5 top-3.5 ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`} size={13} />
                <input 
                  type="text" 
                  placeholder="Name, leader or city..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl p-3 pl-10 text-xs font-semibold focus:outline-none focus:border-purple-500/50 transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/10 text-slate-200 placeholder-slate-500'}`}
                />
              </div>
            </div>

            {/* Hierarchy tiers */}
            <div className="space-y-1">
              <label className={`block text-[10px] font-bold font-mono uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>Tier Level</label>
              <select
                value={filterHierarchy}
                onChange={e => setFilterHierarchy(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 transition-all cursor-pointer ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#0a0a0f] border-white/10 text-slate-200'}`}
              >
                <option value="" className={isLightMode ? 'bg-white text-slate-800' : 'bg-[#0a0a0f] text-slate-300'}>All Tiers</option>
                {hierarchyLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id} className={isLightMode ? 'bg-white text-slate-800' : 'bg-[#0a0a0f] text-slate-250'}>
                    {lvl.name} ({branches.filter(b => b.hierarchyLevel === lvl.id).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Territorial Country */}
            <div className="space-y-1">
              <label className={`block text-[10px] font-bold font-mono uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>Territorial Country</label>
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 transition-all cursor-pointer ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#0a0a0f] border-white/10 text-slate-200'}`}
              >
                <option value="" className={isLightMode ? 'bg-white text-slate-800' : 'bg-[#0a0a0f] text-slate-300'}>All Countries</option>
                {uniqueCountries.map((c) => (
                  <option key={c} value={c} className={isLightMode ? 'bg-white text-slate-800' : 'bg-[#0a0a0f] text-slate-250'}>{c}</option>
                ))}
              </select>
            </div>

            {/* City lookup */}
            <div className="space-y-1">
              <label className={`block text-[10px] font-bold font-mono uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>District / City</label>
              <select
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 transition-all cursor-pointer ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#0a0a0f] border-white/10 text-slate-200'}`}
              >
                <option value="" className={isLightMode ? 'bg-white text-slate-800' : 'bg-[#0a0a0f] text-slate-300'}>All Districts</option>
                {uniqueCities.map((ct) => (
                  <option key={ct} value={ct} className={isLightMode ? 'bg-white text-slate-800' : 'bg-[#0a0a0f] text-slate-250'}>{ct}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Quick Counter Bento panel */}
          <div className={`p-4 border rounded-2xl grid grid-cols-2 gap-4 shrink-0 transition-colors md:w-56 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
            <div className="text-left">
              <span className={`block text-[9px] font-bold font-mono tracking-wider uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>Active Nodes</span>
              <span className={`text-2xl font-black font-mono mt-0.5 block ${isLightMode ? 'text-purple-600' : 'text-purple-400'}`}>{filteredBranches.length}</span>
            </div>
            <div className={`text-left pl-4 border-l transition-colors ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
              <span className={`block text-[9px] font-bold font-mono tracking-wider uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>Total Nodes</span>
              <span className={`text-2xl font-black font-mono mt-0.5 block ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>{branches.length}</span>
            </div>
          </div>

        </div>

      </div>

      {/* LOWER MAP CONTROLLER & VIEWPORT SPACE */}
      <div className="flex-1 w-full min-h-[500px] lg:min-h-[550px] relative flex overflow-hidden">
        
        {/* Core Canvas Element container */}
        <div className="flex-1 h-full min-h-0 relative">
          <div className="absolute inset-0 w-full h-full z-0" ref={mapContainerRef} />

          {/* Compass / Coordinate overview layer */}
          <div className="absolute bottom-5 left-5 z-10 pointer-events-none select-none">
            <div className={`backdrop-blur border rounded-xl px-3 py-2 text-[10px] font-mono flex items-center gap-1.5 shadow-lg transition-all ${isLightMode ? 'bg-white/85 border-slate-200 text-slate-700 shadow-slate-100' : 'bg-black/60 border-white/5 text-slate-400'}`}>
              <Layers size={11} className={isLightMode ? 'text-purple-650' : 'text-purple-400'} />
              <span>TERRITORY: {viewport.lng}° E, {viewport.lat}° N @ ZOOM {viewport.zoom}</span>
            </div>
          </div>

          {/* Selection overlay layout for coordinates integration if enabled */}
          {isSelectingCoords && (
            <div className="absolute inset-0 border-3 border-dashed border-purple-500/30 pointer-events-none flex items-center justify-center bg-black/45 z-20">
              <div className={`border px-5 py-4 rounded-2xl text-center shadow-[0_0_35px_rgba(124,58,237,0.25)] max-w-xs animate-bounce pointer-events-auto transition-colors ${isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0c0c16]/95 border-purple-500/20 text-white'}`}>
                <MapPin className="text-purple-500 mx-auto animate-pulse mb-2" size={24} />
                <p className="text-xs font-bold">Click Map to Select Pin Coordinates</p>
                <p className={`text-[10px] mt-1 ${isLightMode ? 'text-slate-500' : 'text-purple-300'}`}>Select location precisely on the matrix style grid to bind form fields.</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating / Sliding Dynamic Telemetry Manual Sidebar */}
        {showGuide && (
          <div className={`w-80 h-full border-l flex flex-col z-10 select-text outline-none relative shrink-0 overflow-y-auto transition-colors duration-300 ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#08080d] border-white/5'}`}>
            
            <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#08080d]/80 backdrop-blur-xl z-20">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-purple-400" />
                <span className="text-xs font-black font-mono uppercase tracking-wider text-slate-350">Telemetry Manual</span>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
              >
                <X size={12} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-purple-450 font-mono uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  1. Pinning Locations
                </h4>
                <p className="text-[11.5px] text-slate-400 leading-relaxed">
                  To pin new branches, go to the <strong className="text-slate-300">Branches list screen</strong> and click <strong className="text-purple-400">Establish Branch</strong>. 
                  Use the integrated Coordinate selection crosshair helper tool, click precisely on any point on this live map, and publish to synchronize real-time with Firebase.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-blue-450 font-mono uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  2. Defining Entire Regions
                </h4>
                <p className="text-[11.5px] text-slate-400 leading-relaxed">
                  Organizational hierarchies are dynamically compiled under the <strong className="text-slate-300">Hierarchy builder</strong>. 
                  Creating or assigning high-tier structures like <strong className="text-purple-300 font-semibold">"Region"</strong> or <strong className="text-blue-300 font-semibold">"Zone"</strong> acts as the central boundary roots.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-450 font-mono uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  3. Creating Nested Regions
                </h4>
                <p className="text-[11.5px] text-slate-400 leading-relaxed font-sans">
                  To establish regions within regions (e.g. nested hubs under key zones, campuses under hubs, or MC cell groups under campuses), open the creation form and pick a 
                  <strong className="text-emerald-400"> Parent Region / Location</strong> dropdown. 
                </p>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 font-mono">
                  <div className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
                    <Network size={10} /> Live Tracer Vector Projection:
                  </div>
                  <p className="text-[10px] text-slate-550 leading-relaxed">
                    MapLibre dynamic network engines automatically render dotted physical lines connecting nested nodes, compiling an visual hierarchy structure overlay on the public style domain coordinates.
                  </p>
                </div>
              </div>

              {/* Connected relations statistics panel if any parents exist */}
              {branches.some(b => b.parentId) && (
                <div className="p-4 rounded-xl border border-dashed border-purple-500/25 bg-purple-500/5 space-y-1.5">
                  <div className="text-[10.5px] font-black font-mono text-purple-300 uppercase tracking-widest flex items-center gap-1">
                    <Share2 size={11} /> Global Network Links
                  </div>
                  <p className="text-[10px] text-slate-450">
                    A total of <strong className="text-purple-300 font-mono">{branches.filter(b => b.parentId).length} hierarchical nested structures</strong> are currently linked and projecting spatial dependency telemetry rules.
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
