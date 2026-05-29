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
  Share2,
  ZoomIn
} from 'lucide-react';

interface MapLibreDashboardProps {
  onSelectCoords?: (lat: number, lng: number) => void;
  isSelectingCoords?: boolean;
  isFullscreen?: boolean;
  setIsFullscreen?: (val: boolean) => void;
}

const getStyleSpecification = (styleId: string): string | any => {
  const isRetina = typeof window !== 'undefined' && window.devicePixelRatio > 1;

  if (styleId === 'osm') {
    return {
      version: 8,
      sources: {
        'osm-raster': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap developers</a>'
        }
      },
      layers: [
        {
          id: 'osm-raster-layer',
          type: 'raster',
          source: 'osm-raster',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };
  }
  
  if (styleId === 'opentopomap') {
    return {
      version: 8,
      sources: {
        'topo-raster': {
          type: 'raster',
          tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: 'Map &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>, <a href="http://viewfinderpanoramas.org" target="_blank">SRTM</a>'
        }
      },
      layers: [
        {
          id: 'topo-raster-layer',
          type: 'raster',
          source: 'topo-raster',
          minzoom: 0,
          maxzoom: 17
        }
      ]
    };
  }

  if (styleId === 'cartodb-light') {
    const tileSuffix = isRetina ? '@2x.png' : '.png';
    return {
      version: 8,
      sources: {
        'cartodb-light-raster': {
          type: 'raster',
          tiles: [
            `https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}${tileSuffix}`,
            `https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}${tileSuffix}`,
            `https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}${tileSuffix}`,
            `https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}${tileSuffix}`
          ],
          tileSize: isRetina ? 512 : 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
        }
      },
      layers: [
        {
          id: 'cartodb-light-layer',
          type: 'raster',
          source: 'cartodb-light-raster',
          minzoom: 0,
          maxzoom: 20
        }
      ]
    };
  }

  if (styleId === 'cartodb-dark') {
    const tileSuffix = isRetina ? '@2x.png' : '.png';
    return {
      version: 8,
      sources: {
        'cartodb-dark-raster': {
          type: 'raster',
          tiles: [
            `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${tileSuffix}`,
            `https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${tileSuffix}`,
            `https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${tileSuffix}`,
            `https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${tileSuffix}`
          ],
          tileSize: isRetina ? 512 : 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
        }
      },
      layers: [
        {
          id: 'cartodb-dark-layer',
          type: 'raster',
          source: 'cartodb-dark-raster',
          minzoom: 0,
          maxzoom: 20
        }
      ]
    };
  }

  return `https://tiles.openfreemap.org/styles/${styleId}`;
};

export const MapLibreDashboard: React.FC<MapLibreDashboardProps> = ({ 
  onSelectCoords, 
  isSelectingCoords = false,
  isFullscreen: propIsFullscreen,
  setIsFullscreen: propSetIsFullscreen
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
  const [localIsFullscreen, setLocalIsFullscreen] = useState(false);
  const isFullscreen = propIsFullscreen !== undefined ? propIsFullscreen : localIsFullscreen;
  const setIsFullscreen = propSetIsFullscreen !== undefined ? propSetIsFullscreen : setLocalIsFullscreen;
  const [showGuide, setShowGuide] = useState(true);
  
  // Custom Map style with dynamic options selector
  const [selectedStyle, setSelectedStyle] = useState<'liberty' | 'dark' | 'positron' | 'bright' | 'osm' | 'opentopomap' | 'cartodb-light' | 'cartodb-dark'>('liberty');

  // Dynamic map label font scale multiplier
  const [labelTextSizeScale, setLabelTextSizeScale] = useState<number>(1.3);
  const originalTextSizesRef = useRef<Record<string, any>>({});

  // Increment when styledata loads so custom layers can be redrawn
  const [styleLoadedToken, setStyleLoadedToken] = useState(0);

  // Visual Zoom Magnification Factor to visually scale up map representation at fixed scale
  const [magnification, setMagnification] = useState<number>(1.0);

  // Nominatim Autocomplete Suggestions State
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  // Nominatim Places API suggestion fetch loop
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setPlaceSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPlaceSuggestions(data);
        }
      } catch (err) {
        console.warn("Places autocomplete search fallback active:", err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (place: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: 11,
        speed: 1.5,
        essential: true
      });
    }
    
    setPlaceSuggestions([]);
  };

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
        style: getStyleSpecification(selectedStyle),
        center: [32.5825, 0.3476], // Kampala center as default
        zoom: 2.5,
        pitch: 30, // 3D elevation pitch
        bearing: 0,
        logoPosition: 'bottom-right'
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

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

      map.on('styledata', () => {
        setStyleLoadedToken(prev => prev + 1);
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

  // Helper to check if expressions container any zoom-specific evaluation rules
  const hasZoomExpr = (val: any): boolean => {
    if (val === 'zoom' || (Array.isArray(val) && val[0] === 'zoom')) {
      return true;
    }
    if (Array.isArray(val)) {
      return val.some(hasZoomExpr);
    }
    return false;
  };

  // Helper to safely multiply step/interpolate stop sizes by scale factor without breaking MapLibre AST constraints
  const scaleValue = (val: any, scale: number): any => {
    if (typeof val === 'number') {
      return val * scale;
    }
    if (Array.isArray(val)) {
      const op = val[0];
      if (op === 'interpolate') {
        const result = [...val];
        for (let i = 4; i < result.length; i += 2) {
          result[i] = scaleValue(result[i], scale);
        }
        return result;
      }
      if (op === 'step') {
        const result = [...val];
        result[2] = scaleValue(result[2], scale);
        for (let i = 4; i < result.length; i += 2) {
          result[i] = scaleValue(result[i], scale);
        }
        return result;
      }
      if (!hasZoomExpr(val)) {
        return ['*', val, scale];
      }
    }
    return val;
  };

  // Scale label text sizes dynamically across loaded symbol layers
  const applyLabelScaling = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const style = map.getStyle();
      if (!style || !style.layers) return;
      
      style.layers.forEach((layer: any) => {
        if (layer.type === 'symbol') {
          const layerId = layer.id;
          let originalSize = originalTextSizesRef.current[layerId];
          if (originalSize === undefined) {
            originalSize = map.getLayoutProperty(layerId, 'text-size');
            if (originalSize === undefined) {
              originalSize = 12; // default standard
            }
            originalTextSizesRef.current[layerId] = originalSize;
          }

          if (labelTextSizeScale === 1.0) {
            map.setLayoutProperty(layerId, 'text-size', originalSize);
          } else {
            const scaled = scaleValue(originalSize, labelTextSizeScale);
            map.setLayoutProperty(layerId, 'text-size', scaled);
          }
        }
      });
    } catch (err) {
      console.warn("Dynamic label scaling adjustment skipped on some layers:", err);
    }
  };

  // Support changing tile style layers dynamic action
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      originalTextSizesRef.current = {}; // Reset baseline styles cache
      mapRef.current.setStyle(getStyleSpecification(selectedStyle));
    }
  }, [selectedStyle, mapLoaded]);

  // Apply text size scale factors when style loads or selector changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      const timer = setTimeout(() => {
        applyLabelScaling();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [labelTextSizeScale, styleLoadedToken, mapLoaded]);

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
  }, [filteredBranches, branches, mapLoaded, isLightMode, hierarchyLevels, selectedStyle, styleLoadedToken]);

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
    <div className={`flex flex-col w-full h-full ${isFullscreen ? 'min-h-0' : 'min-h-[750px]'} relative rounded-2xl overflow-hidden font-sans shadow-2xl border transition-all duration-350 
      ${isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-none shadow-none' : ''} 
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
      <div className={`w-full ${isFullscreen ? 'py-1.5 px-4 h-12 border-b flex-nowrap shadow-md z-40' : 'py-2.5 px-4 border-b flex-wrap'} flex items-center justify-between gap-3 select-none text-xs transition-all ${isLightMode ? 'bg-white border-slate-202' : 'bg-[#0a0a0f] border-white/5'}`}>
        
        {/* Filters cluster */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          
          {/* Main search field with floating autocomplete dropdown */}
          <div className="relative w-full max-w-[200px] sm:max-w-[240px]">
            <Search className={`absolute left-2.5 top-2.5 ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`} size={11} />
            <input 
              type="text" 
              placeholder="Search global places & nodes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] focus:outline-none focus:border-purple-500/50 border transition-all ${isLightMode ? 'bg-slate-50 border-slate-202 text-slate-805 placeholder-slate-404' : 'bg-white/5 border-white/10 text-slate-205 placeholder-slate-505'}`}
            />
            {isSearchingPlaces && (
              <span className="absolute right-2.5 top-2.5 text-[9px] text-purple-400 animate-pulse font-mono font-bold uppercase">
                Loading...
              </span>
            )}

            {/* Float Suggestions list */}
            {((searchQuery.trim().length >= 2 && filteredBranches.length > 0) || placeSuggestions.length > 0) && (
              <div 
                className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-[0_22px_45px_rgba(0,0,0,0.55)] z-[99] text-left overflow-hidden max-h-72 overflow-y-auto ${
                  isLightMode 
                    ? 'bg-white border-slate-202 text-slate-800 shadow-slate-300' 
                    : 'bg-[#0b0c15] border-white/10 text-slate-200 shadow-black'
                }`}
              >
                {/* 1. INTERNAL DATABASE BRANCH STATIONS */}
                {searchQuery.trim().length >= 2 && filteredBranches.length > 0 && (
                  <div>
                    <div className={`px-3 py-1 text-[8px] font-bold font-mono uppercase tracking-widest border-b ${isLightMode ? 'bg-slate-100 text-slate-500 border-slate-202' : 'bg-white/[0.02] text-slate-500 border-white/5'}`}>
                      Church Stations
                    </div>
                    {filteredBranches.slice(0, 4).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBranch(b);
                          setPlaceSuggestions([]);
                        }}
                        className={`w-full px-3 py-2 text-left text-[11px] font-bold transition flex flex-col gap-0.5 border-b border-transparent ${isLightMode ? 'hover:bg-slate-50 border-slate-100 text-slate-800' : 'hover:bg-white/5 border-white/[0.01] text-white'}`}
                      >
                        <span className="truncate block font-semibold text-purple-400">{b.name}</span>
                        <span className="text-[9px] text-slate-450 font-mono italic">{b.city}, {b.country}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. OSM GLOBAL GEOLOCATION SUGGESTIONS */}
                {placeSuggestions.length > 0 && (
                  <div>
                    <div className={`px-3 py-1 text-[8px] font-bold font-mono uppercase tracking-widest border-b border-t ${isLightMode ? 'bg-slate-100 text-slate-500 border-slate-202' : 'bg-white/[0.02] text-slate-550 border-white/5'}`}>
                      Global Places & Streets
                    </div>
                    {placeSuggestions.map((place, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectSuggestion(place)}
                        className={`w-full px-3 py-2 text-left text-[11px] transition flex flex-col gap-0.5 border-b border-transparent ${isLightMode ? 'hover:bg-slate-50 border-slate-100 text-slate-800' : 'hover:bg-white/5 border-white/[0.01] text-slate-300'}`}
                      >
                        <span className="truncate block font-bold text-slate-200">{place.display_name.split(',')[0]}</span>
                        <span className="text-[9px] text-slate-450 truncate block font-sans">{place.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isFullscreen && (
            <>
              {/* Tier select */}
              <select
                value={filterHierarchy}
                onChange={e => setFilterHierarchy(e.target.value)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold border transition focus:outline-none focus:border-purple-500/50 cursor-pointer ${isLightMode ? 'bg-slate-50 border-slate-202 text-slate-805' : 'bg-[#0a0a0f] border-white/10 text-slate-300'}`}
              >
                <option value="">All Tiers</option>
                {hierarchyLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                ))}
              </select>

              {/* Country select */}
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold border transition focus:outline-none focus:border-purple-500/50 cursor-pointer ${isLightMode ? 'bg-slate-50 border-slate-202 text-slate-805' : 'bg-[#0a0a0f] border-white/10 text-slate-300'}`}
              >
                <option value="">All Countries</option>
                {uniqueCountries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* City select */}
              <select
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold border transition focus:outline-none focus:border-purple-500/55 cursor-pointer ${isLightMode ? 'bg-slate-50 border-slate-202 text-slate-805' : 'bg-[#0a0a0f] border-white/10 text-slate-300'}`}
              >
                <option value="">All Cities</option>
                {uniqueCities.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>

              {/* Clean indicator with Reset */}
              {(searchQuery || filterHierarchy || filterCountry || filterCity) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterHierarchy('');
                    setFilterCountry('');
                    setFilterCity('');
                  }}
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border cursor-pointer ${isLightMode ? 'border-red-200 bg-red-50 text-red-650 hover:bg-red-100' : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                >
                  Reset
                </button>
              )}

              {/* Active Nodes Count label */}
              <span className={`text-[10px] font-mono font-semibold px-2 py-1 border rounded-lg ${isLightMode ? 'bg-slate-100 border-slate-202 text-slate-650' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                {filteredBranches.length}/{branches.length} Nodes
              </span>
            </>
          )}

        </div>

        {/* Global actions cluster - STYLE DROP DOWN + FULLSCREEN + THEME + GUIDE */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Map Style Chooser Dropdown */}
          <select
            value={selectedStyle}
            onChange={e => setSelectedStyle(e.target.value as any)}
            className={`rounded-lg px-2 py-1.5 text-[11px] font-bold border transition focus:outline-none focus:border-purple-500/50 cursor-pointer uppercase font-mono tracking-wider ${isLightMode ? 'bg-slate-50 border-slate-202 text-purple-700 hover:bg-slate-100' : 'bg-[#0a0a0f] border-white/10 text-purple-400 hover:bg-white/5'}`}
            title="Switch Map Tile Source"
          >
            <optgroup label="Vector (OpenFreeMap)" style={{ background: isLightMode ? '#fff' : '#0b0c15', color: '#888' }}>
              <option value="liberty" style={{ color: isLightMode ? '#333' : '#fff' }}>🗺️ OSM Liberty</option>
              <option value="bright" style={{ color: isLightMode ? '#333' : '#fff' }}>🎨 Colorful Bright</option>
              <option value="positron" style={{ color: isLightMode ? '#333' : '#fff' }}>🌐 Clean Positron</option>
              <option value="dark" style={{ color: isLightMode ? '#333' : '#fff' }}>🌌 Dark Matter</option>
            </optgroup>
            <optgroup label="Raster (OSM / Standard)" style={{ background: isLightMode ? '#fff' : '#0b0c15', color: '#888' }}>
              <option value="osm" style={{ color: isLightMode ? '#333' : '#fff' }}>🛰️ Standard OSM</option>
              <option value="opentopomap" style={{ color: isLightMode ? '#333' : '#fff' }}>⛰️ OpenTopoMap</option>
              <option value="cartodb-light" style={{ color: isLightMode ? '#333' : '#fff' }}>🏙️ Carto Positron</option>
              <option value="cartodb-dark" style={{ color: isLightMode ? '#333' : '#fff' }}>🌃 Carto Dark</option>
            </optgroup>
          </select>

          {/* Visual Zoom Magnifier Slider */}
          <div 
            className={`rounded-lg px-2.5 py-1 flex items-center gap-2 border text-[11px] font-bold font-mono tracking-wider transition ${
              isLightMode 
                ? 'bg-slate-50 border-slate-202 text-purple-700' 
                : 'bg-[#0a0a0f] border-white/10 text-purple-400'
            }`}
            title="Visual Magnification Zoom (Keeps current fixed scale of tiles but zooms in visually to make small text details readable)"
          >
            <ZoomIn size={12} className="shrink-0 text-purple-500" />
            <span className="whitespace-nowrap select-none">Magnify: {magnification.toFixed(1)}x</span>
            <input 
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={magnification}
              onChange={e => setMagnification(Number(e.target.value))}
              className="accent-purple-500 hover:accent-purple-400 cursor-pointer w-20 sm:w-28 h-1 bg-purple-200/40 dark:bg-purple-900/40 rounded-lg appearance-none"
            />
          </div>

          {/* Map Scale Indicator */}
          <div 
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border flex items-center gap-1.5 font-mono tracking-wider whitespace-nowrap uppercase select-none ${
              isLightMode 
                ? 'bg-slate-50 border-slate-202 text-purple-700' 
                : 'bg-[#0a0a0f] border-white/10 text-purple-400'
            }`}
            title="Current Map Zoom Scale"
          >
            <Compass size={12} className="shrink-0 text-purple-500" />
            <span>Scale: {viewport.zoom.toFixed(1)}x</span>
          </div>
          {!isFullscreen && (
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`p-1.5 rounded-lg border flex items-center gap-1 text-[11px] font-bold transition cursor-pointer ${showGuide ? (isLightMode ? 'bg-purple-600 border-purple-600 text-white shadow' : 'bg-purple-500/20 border-purple-500/30 text-purple-300') : (isLightMode ? 'bg-slate-50 border-slate-202 text-slate-650 hover:bg-slate-100' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5')}`}
              title="Toggle Guide Panel"
            >
              <BookOpen size={12} />
              <span className="hidden sm:inline">Manual Guide</span>
            </button>
          )}

          {/* Theme switcher toggle */}
          {!isFullscreen && (
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`p-1.5 rounded-lg border flex items-center gap-1 text-[11px] font-bold transition cursor-pointer ${isLightMode ? 'bg-slate-100 border-slate-202 text-slate-750' : 'bg-white/[0.02] border-white/5 text-slate-300'}`}
              title="Toggle Theme"
            >
              {isLightMode ? <Sun size={12} className="text-amber-500" /> : <Moon size={12} className="text-purple-400" />}
              <span className="hidden sm:inline">{isLightMode ? 'Light' : 'Dark'}</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 text-[11px] font-extrabold transition cursor-pointer ${isFullscreen ? 'bg-red-650 border-red-650 text-white animate-pulse' : (isLightMode ? 'bg-slate-50 border-slate-202 text-slate-650 hover:bg-slate-100' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5')}`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

        </div>

      </div>

      {/* LOWER MAP CONTROLLER & VIEWPORT SPACE */}
      <div className={`flex-1 w-full ${isFullscreen ? 'min-h-0' : 'min-h-[500px] lg:min-h-[550px]'} relative flex overflow-hidden`}>
        
        {/* Core Canvas Element container */}
        <div className="flex-1 h-full min-h-0 relative">
          {/* Core map container is scale-transformed to visually magnify pixels/text on high-dpi and raster tiles */}
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
            <div 
              className="w-full h-full transition-all duration-300 ease-out origin-center" 
              ref={mapContainerRef} 
              style={{ transform: `scale(${magnification})` }}
            />
          </div>

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
