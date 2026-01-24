'use client';

import { useEffect, useRef, useState, memo } from 'react';
import 'leaflet/dist/leaflet.css';
import { LatLng, Checkpoint, MapStyle } from '@/types';
import { MAP_STYLES, DIFFICULTY_CONFIG } from '@/constants';

interface MapProps {
  userLocation: LatLng;
  userAvatar?: string;
  checkpoints: Checkpoint[];
  previewLocation?: LatLng | null;
  onCheckpointClick: (cp: Checkpoint) => void;
  onMapClick?: (latlng: LatLng) => void;
  isMoving: boolean;
  isAddingLocation?: boolean;
  mapStyle: MapStyle;
}

const getCheckpointEmoji = (cp: Checkpoint): string => {
  if (cp.type === 'youtube-learning') {
    return '📺';
  }
  if (cp.type === 'shop') return '🛒';

  const text = (cp.name + ' ' + cp.scenario).toLowerCase();

  if (cp.type === 'challenge') {
    if (text.includes('interview')) return '👔';
    if (text.includes('debate')) return '⚔️';
    if (text.includes('quiz')) return '❓';
    return '🏆';
  }

  if (text.includes('coffee') || text.includes('cafe')) return '☕';
  if (text.includes('food') || text.includes('restaurant') || text.includes('eat')) return '🍔';
  if (text.includes('park') || text.includes('garden')) return '🌳';
  if (text.includes('music') || text.includes('busker')) return '🎵';
  if (text.includes('ticket') || text.includes('museum')) return '🎟️';
  if (text.includes('train') || text.includes('station')) return '🚆';
  if (text.includes('guard') || text.includes('police')) return '👮';
  if (text.includes('bridge')) return '🌉';
  if (text.includes('book') || text.includes('library')) return '📚';
  if (text.includes('gym') || text.includes('sport')) return '🏋️';

  return '💬';
};

function Map({
  userLocation,
  userAvatar,
  checkpoints,
  previewLocation,
  onCheckpointClick,
  onMapClick,
  isMoving,
  isAddingLocation = false,
  mapStyle,
}: MapProps) {
  const [L, setL] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userPulseRef = useRef<any>(null);
  const previewLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const isUserDraggingRef = useRef<boolean>(false);

  const propsRef = useRef({
    userLocation,
    isAddingLocation,
    onCheckpointClick,
    onMapClick,
  });

  useEffect(() => {
    propsRef.current = {
      userLocation,
      isAddingLocation,
      onCheckpointClick,
      onMapClick,
    };
  });

  // Dynamically import Leaflet only on client side
  useEffect(() => {
    // Only import on client side
    if (typeof window === 'undefined') return;
    
    import('leaflet')
      .then(leaflet => {
        // Handle both default export and namespace export
        setL(leaflet.default || leaflet);
      })
      .catch(error => {
        console.error('Failed to load Leaflet:', error);
        // Retry after a short delay
        setTimeout(() => {
          import('leaflet')
            .then(leaflet => {
              setL(leaflet.default || leaflet);
            })
            .catch(retryError => {
              console.error('Leaflet retry failed:', retryError);
            });
        }, 1000);
      });
  }, []);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainerRef.current || !L) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    const previewLayer = L.layerGroup().addTo(map);
    previewLayerRef.current = previewLayer;

    map.on('click', (e: any) => {
      const { isAddingLocation, onMapClick } = propsRef.current;
      if (isAddingLocation && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    // Track when user is dragging the map
    map.on('dragstart', () => {
      isUserDraggingRef.current = true;
    });

    map.on('dragend', () => {
      isUserDraggingRef.current = false;
    });

    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Set initial view after a short delay to ensure map is fully rendered
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
      }
    }, 100);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [L]); // Only depend on L, not userLocation

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
    }
  }, [isAddingLocation]);

  // Create/update user marker when avatar changes or map is initialized
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userPulseRef.current) {
      userPulseRef.current.remove();
      userPulseRef.current = null;
    }

    const { lat, lng } = propsRef.current.userLocation;

    if (userAvatar) {
      const icon = L.divIcon({
        className: 'user-avatar-marker',
        html: `<img src="${userAvatar}" style="width: 44px; height: 44px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); object-fit: cover;" />`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
    } else {
      userMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 12,
        fillColor: '#22c55e',
        fillOpacity: 1,
        color: '#ffffff',
        weight: 3,
        opacity: 1,
      }).addTo(mapInstanceRef.current);

      userPulseRef.current = L.circleMarker([lat, lng], {
        radius: 24,
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        stroke: false,
      }).addTo(mapInstanceRef.current);
    }
  }, [userAvatar, L]); // Remove mapInstanceRef.current from dependencies

  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const styleConfig = MAP_STYLES[mapStyle];

    const layer = L.tileLayer(styleConfig.url, {
      attribution: styleConfig.attribution,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(mapInstanceRef.current);

    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [mapStyle, L]);

  // Update user marker position when location changes (but don't recreate map)
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;
    if (!userMarkerRef.current && !userPulseRef.current) return; // Wait for markers to be created

    const newLatLng = new L.LatLng(userLocation.lat, userLocation.lng);

    // Only update marker positions if they exist
    if (userMarkerRef.current) {
      try {
        if (userMarkerRef.current.setLatLng) {
          userMarkerRef.current.setLatLng(newLatLng);
        }
      } catch (e) {
        // Marker might not be fully initialized yet
      }
    }

    if (userPulseRef.current) {
      try {
        if (userPulseRef.current.setLatLng) {
          userPulseRef.current.setLatLng(newLatLng);
        }
      } catch (e) {
        // Marker might not be fully initialized yet
      }
    }

    // Only pan if not currently being dragged by user and not in moving state
    if (!isMoving && !isUserDraggingRef.current) {
      mapInstanceRef.current.panTo(newLatLng, { animate: true, duration: 0.8 });
    }
  }, [userLocation, L, isMoving]);

  useEffect(() => {
    if (!previewLayerRef.current || !mapInstanceRef.current || !L) return;

    previewLayerRef.current.clearLayers();

    if (previewLocation) {
      L.polyline(
        [
          [userLocation.lat, userLocation.lng],
          [previewLocation.lat, previewLocation.lng],
        ],
        {
          color: '#0ea5e9',
          weight: 4,
          opacity: 0.6,
          dashArray: '10, 10',
        }
      ).addTo(previewLayerRef.current);

      const ghostIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-sm animate-pulse"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([previewLocation.lat, previewLocation.lng], {
        icon: ghostIcon,
        opacity: 0.8,
      }).addTo(previewLayerRef.current);
    }
  }, [previewLocation, userLocation, L]);

  // Update checkpoints markers
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;

    // Remove old markers
    markersRef.current.forEach(marker => {
      try {
        marker.remove();
      } catch (e) {
        // Marker might already be removed
      }
    });
    markersRef.current = [];

    // Create new markers
    checkpoints.forEach(cp => {
      const isCompleted = cp.isCompleted;
      const isChallenge = cp.type === 'challenge';
      const isShop = cp.type === 'shop';
      const isYouTubeLearning = cp.type === 'youtube-learning';
      let markerIcon: any;

      if (cp.customMarkerImage) {
        markerIcon = L.divIcon({
          className: 'custom-image-marker group',
          html: `
                    <div style="position: relative; transition: transform 0.2s;" class="hover:scale-110">
                        <img src="${cp.customMarkerImage}" style="
                            width: 44px; 
                            height: 44px; 
                            border-radius: 50%; 
                            object-fit: cover; 
                            border: 3px solid ${isCompleted ? '#f59e0b' : '#ffffff'};
                            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                        " />
                    </div>
                `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
      } else {
        let bgColor = 'white';
        let borderColor = '#3b82f6';
        let shadowStyle = '0 2px 8px rgba(59, 130, 246, 0.3)';

        if (isChallenge) {
          borderColor = '#9333ea';
          shadowStyle = '0 2px 8px rgba(147, 51, 234, 0.3)';
        }
        if (isShop) {
          borderColor = '#f97316';
          shadowStyle = '0 2px 8px rgba(249, 115, 22, 0.3)';
        }
        if (isYouTubeLearning) {
          borderColor = '#ef4444';
          shadowStyle = '0 2px 8px rgba(239, 68, 68, 0.3)';
        }
        if (isCompleted) {
          borderColor = '#10b981';
          bgColor = '#ecfdf5';
          shadowStyle = '0 2px 12px rgba(16, 185, 129, 0.4), 0 0 0 2px rgba(16, 185, 129, 0.1)';
        }

        const emoji = getCheckpointEmoji(cp);

        const iconHtml = `
                <div style="
                    background: ${isCompleted 
                      ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' 
                      : `linear-gradient(135deg, ${bgColor} 0%, ${bgColor} 100%)`};
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: ${isCompleted ? '2.5px' : '3px'} solid ${borderColor};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: ${shadowStyle};
                    position: relative;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    cursor: pointer;
                " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='${isCompleted ? '0 4px 16px rgba(16, 185, 129, 0.5), 0 0 0 3px rgba(16, 185, 129, 0.15)' : shadowStyle.replace('0.3', '0.5')}';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='${shadowStyle}';">
                    ${isCompleted ? `
                        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1)); z-index: 1; position: relative;">
                            <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="#10b981"/>
                        </svg>
                    ` : `<span style="font-size: 20px; line-height: 1; z-index: 1; position: relative;">${emoji}</span>`}
                    ${isCompleted ? `
                        <div style="
                            position: absolute;
                            top: -3px;
                            left: -3px;
                            right: -3px;
                            bottom: -3px;
                            border-radius: 50%;
                            background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%);
                            pointer-events: none;
                            z-index: 0;
                        "></div>
                    ` : ''}
                </div>
            `;

        markerIcon = L.divIcon({
          className: 'custom-checkpoint-icon group',
          html: iconHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      }

      const marker = L.marker([cp.location.lat, cp.location.lng], { icon: markerIcon })
        .addTo(mapInstanceRef.current!);

      const diffConfig = DIFFICULTY_CONFIG[cp.difficulty] || DIFFICULTY_CONFIG['intermediate'];

      let typeLabel = 'Chat';
      let typeColor = 'bg-blue-50 text-blue-600 border-blue-100';
      let subText = `💬 ${cp.scenario}`;

      if (cp.type === 'youtube-learning') {
        typeLabel = 'YouTube Learning';
        typeColor = 'bg-red-50 text-red-600 border-red-100';
        subText = `<span class="text-red-700 font-medium">📺 Learn English through YouTube videos</span>`;
      } else if (isChallenge) {
        typeLabel = 'Goal';
        typeColor = 'bg-purple-100 text-purple-700 border-purple-200';
        subText = `<span class="text-purple-700 font-medium">🎯 ${cp.challengeConfig?.goalDescription || 'Complete the challenge'}</span>`;
      } else if (isShop) {
        typeLabel = 'Shop';
        typeColor = 'bg-orange-50 text-orange-600 border-orange-100';
        subText = `<span class="text-orange-700 font-medium">🛍️ Buy Supplies</span>`;
      }

      const popupContent = `
            <div class="flex flex-col gap-2 min-w-[200px]">
                <div class="flex items-start justify-between border-b border-gray-100 pb-2">
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-800 text-sm leading-tight">${cp.name}</span>
                        <span class="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide font-medium">${cp.npcRole}</span>
                    </div>
                    <span class="${typeColor} text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border">${typeLabel}</span>
                </div>
                
                <div class="text-xs text-gray-600 leading-snug">
                    ${subText}
                </div>
                
                <div class="flex items-center gap-2 pt-1">
                    <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full ${diffConfig.colors.bg.replace('bg-', 'bg-')}-500 w-1/2"></div>
                    </div>
                    <span class="text-[10px] ${diffConfig.colors.text} font-extrabold uppercase whitespace-nowrap">
                        ${diffConfig.label}
                    </span>
                </div>
            </div>
        `;

      marker.bindPopup(popupContent, {
        className: 'custom-popup',
        offset: [0, -20],
        closeButton: false,
        autoPan: true,
      });

      marker.on('mouseover', () => {
        marker.openPopup();
      });

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        const { onCheckpointClick } = propsRef.current;
        onCheckpointClick(cp);
      });

      markersRef.current.push(marker);
    });
  }, [checkpoints, L]);

  if (!L) {
    return (
      <div className="w-full h-full relative z-0 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative z-0">
      <div ref={mapContainerRef} className="w-full h-full outline-none" />
      {isAddingLocation && (
        <style>{`
                .leaflet-container, 
                .leaflet-interactive, 
                .leaflet-grab { 
                    cursor: crosshair !important; 
                }
            `}</style>
      )}
    </div>
  );
}

// Memoize Map component to prevent unnecessary re-renders
export default memo(Map, (prevProps, nextProps) => {
  return (
    prevProps.userLocation.lat === nextProps.userLocation.lat &&
    prevProps.userLocation.lng === nextProps.userLocation.lng &&
    prevProps.checkpoints.length === nextProps.checkpoints.length &&
    prevProps.isMoving === nextProps.isMoving &&
    prevProps.isAddingLocation === nextProps.isAddingLocation &&
    prevProps.mapStyle === nextProps.mapStyle &&
    prevProps.previewLocation?.lat === nextProps.previewLocation?.lat &&
    prevProps.previewLocation?.lng === nextProps.previewLocation?.lng
  );
});
