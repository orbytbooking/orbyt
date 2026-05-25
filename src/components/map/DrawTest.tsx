"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Pen } from "lucide-react";

// Dynamically import to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => ({ default: mod.MapContainer })),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => ({ default: mod.TileLayer })),
  { ssr: false }
);

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

export default function DrawTest() {
  const [isMounted, setIsMounted] = useState(false);
  const [enableDraw, setEnableDraw] = useState(false);
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Import Leaflet and fix icons
    import('leaflet').then((leaflet) => {
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      setL(leaflet);
    });
  }, []);

  useEffect(() => {
    if (enableDraw) {
      // Add leaflet-draw CSS
      if (!document.querySelector('link[href*="leaflet.draw"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
        document.head.appendChild(link);
      }
    }
  }, [enableDraw]);

  const handleShapeCreated = (shape: DrawnShape) => {
    console.log('Shape created:', shape);
    setShapes(prev => [...prev, shape]);
  };

  if (!isMounted || !L) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <div>Loading map...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant={enableDraw ? "default" : "outline"}
          onClick={() => setEnableDraw(!enableDraw)}
        >
          <Pen className="h-4 w-4 mr-2" />
          {enableDraw ? "Drawing On" : "Drawing Off"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {shapes.length} shape{shapes.length !== 1 ? 's' : ''} drawn
        </span>
      </div>

      <div className="relative">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        
        <div className="rounded-lg overflow-hidden border" style={{ height: '500px' }}>
          <MapContainer
            center={[40.7128, -74.0060]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {enableDraw && (
              <DrawControlWrapper
                onShapeCreated={handleShapeCreated}
                enabled={enableDraw}
              />
            )}
          </MapContainer>
        </div>
        
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-md p-2 text-xs text-muted-foreground z-20">
          <p> OpenStreetMap contributors</p>
          {enableDraw && <p>Draw tools enabled - Check top-left corner</p>}
        </div>
      </div>

      {shapes.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Drawn Shapes:</h3>
          <div className="grid gap-2">
            {shapes.map((shape) => (
              <div key={shape.id} className="p-2 border rounded text-sm">
                <strong>{shape.type}</strong>
                {shape.properties?.area && (
                  <span className="ml-2 text-muted-foreground">
                    Area: {(shape.properties.area / 1000000).toFixed(2)} km²
                  </span>
                )}
                {shape.properties?.radius && (
                  <span className="ml-2 text-muted-foreground">
                    Radius: {(shape.properties.radius / 1000).toFixed(2)} km
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for draw control
function DrawControlWrapper({ onShapeCreated, enabled }: { onShapeCreated: (shape: DrawnShape) => void; enabled: boolean }) {
  const [drawControl, setDrawControl] = React.useState<any>(null);

  // Component that uses useMap hook
  const DrawControlInner = () => {
    const [mapInstance, setMapInstance] = React.useState<any>(null);

    React.useEffect(() => {
      // Import useMap hook dynamically
      import('react-leaflet').then((mod) => {
        const useMapHook = mod.useMap;
        setMapInstance(useMapHook());
      });
    }, []);

    React.useEffect(() => {
      if (!enabled || !mapInstance || drawControl) return;

      const initializeDrawControl = async () => {
        try {
          const L = await import('leaflet');
          await import('leaflet-draw');

          // Wait a bit for the plugin to attach
          await new Promise(resolve => setTimeout(resolve, 200));

          // Verify Draw is available
          if (!(L as any).Draw || !(L as any).Draw.Event) {
            console.error('Leaflet Draw plugin not available:', {
              hasL: !!(L as any).Draw,
              hasEvent: !!(L as any).Draw.Event,
              L: L
            });
            return;
          }

          const FeatureGroup = (L as any).FeatureGroup;
          const drawnItems = new FeatureGroup();
          mapInstance.addLayer(drawnItems);

          const drawControl = new (L as any).Control.Draw({
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

          mapInstance.addControl(drawControl);
          setDrawControl(drawControl);

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
        } catch (error) {
          console.error('Error initializing draw control:', error);
        }
      };

      initializeDrawControl();
    }, [mapInstance, enabled, drawControl, onShapeCreated]);

    return null;
  };

  if (!enabled) return null;
  return <DrawControlInner />;
}
