"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMap } from 'react-leaflet';
import { Loader2, MapPin, Edit3, Trash2, Pen } from 'lucide-react';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod: any) => ({ default: mod.MapContainer })),
  { ssr: false }
) as React.ComponentType<any>;

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod: any) => ({ default: mod.TileLayer })),
  { ssr: false }
) as React.ComponentType<any>;

const Marker = dynamic(
  () => import('react-leaflet').then((mod: any) => ({ default: mod.Marker })),
  { ssr: false }
) as React.ComponentType<any>;

const Popup = dynamic(
  () => import('react-leaflet').then((mod: any) => ({ default: mod.Popup })),
  { ssr: false }
) as React.ComponentType<any>;

interface Location {
  id: string | number;
  name: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  active: boolean;
}

interface DrawnShape {
  id: string;
  type: 'polygon' | 'circle' | 'rectangle' | 'marker';
  coordinates: any;
  properties?: {
    radius?: number;
    area?: number;
    name?: string;
    description?: string;
  };
}

interface DrawControlProps {
  onShapeCreated?: (shape: DrawnShape) => void;
  onShapeEdited?: (shape: DrawnShape) => void;
  onShapeDeleted?: (shapeId: string) => void;
  enabled?: boolean;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  const [useMapEvents, setUseMapEvents] = useState<any>(null);
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    import('react-leaflet').then((mod) => {
      setUseMapEvents(() => mod.useMapEvents);
      setMap(() => mod.useMap);
    });
  }, []);

  if (!useMapEvents || !map) return null;

  const MapEventsComponent = () => {
    useMapEvents({
      click: (e: any) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      },
    });
    return null;
  };

  return <MapEventsComponent />;
}

// Component to handle drawing controls
function DrawControl({ onShapeCreated, onShapeEdited, onShapeDeleted, enabled = true }: DrawControlProps) {
  const [drawControl, setDrawControl] = useState<any>(null);

  // Component that uses useMap hook
  const DrawControlInner = () => {
    const mapInstance = useMap(); // Call useMap directly in function body
    const [mapReady, setMapReady] = React.useState(false);

    React.useEffect(() => {
      if (mapInstance) {
        setMapReady(true);
      }
    }, [mapInstance]);

    React.useEffect(() => {
      if (!enabled || !mapReady || drawControl) return;

      const initializeDrawControl = async () => {
        try {
          // Import both libraries sequentially
          const L = await import('leaflet');
          await import('leaflet-draw');

          // Wait a bit for the plugin to attach properly
          await new Promise(resolve => setTimeout(resolve, 500));

          // Verify Draw is available and properly attached
          if (!(L as any).Draw || !(L as any).Draw.Event) {
            console.error('Leaflet Draw plugin not available:', {
              hasL: !!(L as any).Draw,
              hasEvent: !!(L as any).Draw.Event,
              hasControl: !!(L as any).Control,
              L: L
            });
            return;
          }

          console.log('Leaflet and Draw plugin loaded successfully');

          const FeatureGroup = (L as any).FeatureGroup;
          const drawnItems = new FeatureGroup();
          mapInstance.addLayer(drawnItems);

          const drawControlInstance = new (L as any).Control.Draw({
            position: 'topleft',
            draw: {
              polygon: {
                allowIntersection: false,
                drawError: {
                  color: '#e1e100',
                  message: '<strong>Error:</strong> Shape edges cannot cross!'
                },
                shapeOptions: {
                  color: '#3b82f6',
                  weight: 3
                }
              },
              polyline: false,
              circle: {
                shapeOptions: {
                  color: '#3b82f6',
                  weight: 3
                }
              },
              rectangle: {
                shapeOptions: {
                  color: '#3b82f6',
                  weight: 3
                }
              },
              marker: true,
              circlemarker: false
            },
            edit: {
              featureGroup: drawnItems,
              remove: true
            }
          });

          mapInstance.addControl(drawControlInstance);
          setDrawControl(drawControlInstance);

          console.log('Draw control initialized successfully');

          // Store event constants safely
          const DRAW_EVENTS = (L as any).Draw.Event;

          // Handle shape creation
          mapInstance.on(DRAW_EVENTS.CREATED, (event: any) => {
            console.log('Shape created event:', event);
            const layer = event.layer;
            const type = event.layerType;
            
            drawnItems.addLayer(layer);
            
            let shapeData: DrawnShape = {
              id: Date.now().toString(),
              type: type as DrawnShape['type'],
              coordinates: layer.toGeoJSON(),
              properties: {}
            };

            if (type === 'circle') {
              shapeData.properties.radius = layer.getRadius();
              shapeData.properties.area = Math.PI * Math.pow(layer.getRadius(), 2);
            } else if (type === 'polygon' || type === 'rectangle') {
              shapeData.properties.area = (L as any).GeometryUtil?.geodesicArea?.(layer.getLatLngs()[0]) || 0;
            }

            if (onShapeCreated) {
              onShapeCreated(shapeData);
            }
          });

          // Handle shape editing
          mapInstance.on(DRAW_EVENTS.EDITED, (event: any) => {
            console.log('Shape edited event:', event);
            const layers = event.layers;
            layers.eachLayer((layer: any) => {
              const shapeData: DrawnShape = {
                id: layer._leaflet_id.toString(),
                type: layer.toGeoJSON().geometry.type as DrawnShape['type'],
                coordinates: layer.toGeoJSON(),
                properties: {}
              };

              if (layer.getRadius) {
                shapeData.properties.radius = layer.getRadius();
                shapeData.properties.area = Math.PI * Math.pow(layer.getRadius(), 2);
              } else if (layer.getLatLngs) {
                shapeData.properties.area = (L as any).GeometryUtil?.geodesicArea?.(layer.getLatLngs()[0]) || 0;
              }

              if (onShapeEdited) {
                onShapeEdited(shapeData);
              }
            });
          });

          // Handle shape deletion
          mapInstance.on(DRAW_EVENTS.DELETED, (event: any) => {
            console.log('Shape deleted event:', event);
            const layers = event.layers;
            layers.eachLayer((layer: any) => {
              if (onShapeDeleted) {
                onShapeDeleted(layer._leaflet_id.toString());
              }
            });
          });

        } catch (error) {
          console.error('Error initializing draw control:', error);
        }
      };

      initializeDrawControl();
    }, [mapInstance, enabled, drawControl, onShapeCreated, onShapeEdited, onShapeDeleted]);

    return null;
  };

  if (!enabled) return null;
  return <DrawControlInner />;
}

interface OpenStreetMapProps {
  locations: Location[];
  onLocationSelect?: (location: Location) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  readonly?: boolean;
  allowPinDrop?: boolean;
  // Draw functionality props
  enableDraw?: boolean;
  onShapeCreated?: (shape: DrawnShape) => void;
  onShapeEdited?: (shape: DrawnShape) => void;
  onShapeDeleted?: (shapeId: string) => void;
  drawnShapes?: DrawnShape[];
}

export default function OpenStreetMap({
  locations,
  onLocationSelect,
  onMapClick,
  center = [40.7128, -74.0060], // Default to New York
  zoom = 10,
  height = '400px',
  readonly = false,
  allowPinDrop = false,
  enableDraw = false,
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
  drawnShapes = []
}: OpenStreetMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<any>(null);
  const [tempPin, setTempPin] = useState<{ lat: number; lng: number } | null>(null);
  const [shapes, setShapes] = useState<DrawnShape[]>(drawnShapes);

  useEffect(() => {
    setIsMounted(true);
    
    // Import Leaflet dynamically
    import('leaflet').then((leaflet) => {
      // Fix for default marker icon
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      setL(leaflet);
    });
  }, []);

  if (!isMounted || !L) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Calculate center based on locations if not provided
  const mapCenter = locations.length > 0 && locations.some(loc => loc.latitude && loc.longitude)
    ? [
        locations.find(loc => loc.latitude && loc.longitude)?.latitude || center[0],
        locations.find(loc => loc.latitude && loc.longitude)?.longitude || center[1]
      ] as [number, number]
    : center;

  const handleMapClick = (lat: number, lng: number) => {
    if (!readonly && allowPinDrop) {
      setTempPin({ lat, lng });
      if (onMapClick) {
        onMapClick(lat, lng);
      }
    }
  };

  const handleShapeCreated = (shape: DrawnShape) => {
    setShapes(prev => [...prev, shape]);
    if (onShapeCreated) {
      onShapeCreated(shape);
    }
  };

  const handleShapeEdited = (shape: DrawnShape) => {
    setShapes(prev => prev.map(s => s.id === shape.id ? shape : s));
    if (onShapeEdited) {
      onShapeEdited(shape);
    }
  };

  const handleShapeDeleted = (shapeId: string) => {
    setShapes(prev => prev.filter(s => s.id !== shapeId));
    if (onShapeDeleted) {
      onShapeDeleted(shapeId);
    }
  };

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      
      <div 
        className="rounded-lg overflow-hidden border"
        style={{ height }}
      >
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-10"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map click handler */}
          {allowPinDrop && !readonly && !enableDraw && (
            <MapClickHandler onMapClick={handleMapClick} />
          )}
          
          {/* Draw control */}
          {enableDraw && !readonly && (
            <DrawControl
              onShapeCreated={handleShapeCreated}
              onShapeEdited={handleShapeEdited}
              onShapeDeleted={handleShapeDeleted}
              enabled={enableDraw}
            />
          )}
          
          {/* Temporary pin for dropped location */}
          {tempPin && L && (
            <Marker position={[tempPin.lat, tempPin.lng]}>
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold">New Location</h3>
                  <p>Lat: {tempPin.lat.toFixed(6)}</p>
                  <p>Lng: {tempPin.lng.toFixed(6)}</p>
                  <button 
                    className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
                    onClick={() => setTempPin(null)}
                  >
                    Clear Pin
                  </button>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Location markers */}
          {locations.map((location) => {
            if (!location.latitude || !location.longitude) return null;
            
            return (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                eventHandlers={{
                  click: () => {
                    if (onLocationSelect) {
                      onLocationSelect(location);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-semibold">{location.name}</h3>
                    {location.address && <p>{location.address}</p>}
                    <p>
                      {location.city && `${location.city}`}
                      {location.state && location.city && ', '}
                      {location.state && `${location.state}`}
                      {location.postalCode && ` ${location.postalCode}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {location.active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      
      {/* Map controls info */}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-md p-2 text-xs text-muted-foreground z-20">
        <p>© OpenStreetMap contributors</p>
        {readonly && <p>View only mode</p>}
        {allowPinDrop && !readonly && !enableDraw && <p>Click map to pin location</p>}
        {enableDraw && !readonly && <p>Draw tools enabled - Pin location disabled</p>}
        {shapes.length > 0 && <p>Shapes drawn: {shapes.length}</p>}
      </div>
    </div>
  );
}
