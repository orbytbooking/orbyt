"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useJsApiLoader, GoogleMap } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

export interface DrawnShape {
  id: string;
  type: "polygon" | "circle" | "rectangle" | "marker";
  coordinates: unknown;
  properties?: {
    radius?: number;
    area?: number;
    name?: string;
    description?: string;
  };
}

interface GoogleDrawMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  enableDraw?: boolean;
  onShapeCreated?: (shape: DrawnShape) => void;
  onShapeEdited?: (shape: DrawnShape) => void;
  onShapeDeleted?: (shapeId: string) => void;
  drawnShapes?: DrawnShape[];
}

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM = 6;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const LIBRARIES: ("drawing")[] = ["drawing"];

function overlayToShape(overlay: google.maps.Polygon | google.maps.Circle | google.maps.Rectangle | google.maps.Marker, type: string, id: string): DrawnShape | null {
  if (type === "polygon" && "getPath" in overlay) {
    const path = (overlay as google.maps.Polygon).getPath();
    const ring = path.getArray().map((p) => [p.lng(), p.lat()] as [number, number]);
    ring.push(ring[0]);
    return {
      id,
      type: "polygon",
      coordinates: { type: "Polygon", coordinates: [ring] },
      properties: {},
    };
  }
  if (type === "circle" && "getCenter" in overlay && "getRadius" in overlay) {
    const c = (overlay as google.maps.Circle).getCenter();
    const r = (overlay as google.maps.Circle).getRadius();
    if (!c) return null;
    return {
      id,
      type: "circle",
      coordinates: [c.lng(), c.lat()],
      properties: { radius: r },
    };
  }
  if (type === "rectangle" && "getBounds" in overlay) {
    const b = (overlay as google.maps.Rectangle).getBounds();
    if (!b) return null;
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const ring: [number, number][] = [
      [sw.lng(), sw.lat()],
      [ne.lng(), sw.lat()],
      [ne.lng(), ne.lat()],
      [sw.lng(), ne.lat()],
      [sw.lng(), sw.lat()],
    ];
    return {
      id,
      type: "rectangle",
      coordinates: { type: "Polygon", coordinates: [ring] },
      properties: {},
    };
  }
  if (type === "marker" && "getPosition" in overlay) {
    const p = (overlay as google.maps.Marker).getPosition();
    if (!p) return null;
    return {
      id,
      type: "marker",
      coordinates: [p.lng(), p.lat()],
      properties: {},
    };
  }
  return null;
}

function shapeToOverlay(
  map: google.maps.Map,
  shape: DrawnShape
): google.maps.Polygon | google.maps.Circle | google.maps.Rectangle | google.maps.Marker | null {
  const id = shape.id;
  const type = shape.type;
  const coords = shape.coordinates;
  const props = shape.properties ?? {};
  const style = {
    fillColor: "#e53935",
    fillOpacity: 0.35,
    strokeWeight: 4,
    strokeColor: "#000000",
    clickable: true,
    editable: true,
  };

  if (type === "polygon" && coords && typeof coords === "object" && "coordinates" in (coords as object)) {
    const geom = coords as { type?: string; coordinates?: number[][][] };
    const ring = Array.isArray(geom.coordinates)?.[0];
    if (ring?.length) {
      const path = ring.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }));
      const overlay = new google.maps.Polygon({
        paths: path,
        ...style,
      });
      (overlay as any)._shapeId = id;
      overlay.setMap(map);
      return overlay as any;
    }
  }
  if (type === "circle" && Array.isArray(coords) && coords.length >= 2 && typeof props.radius === "number") {
    const overlay = new google.maps.Circle({
      center: { lat: Number(coords[1]), lng: Number(coords[0]) },
      radius: props.radius,
      ...style,
    });
    (overlay as any)._shapeId = id;
    overlay.setMap(map);
    return overlay as any;
  }
  if (type === "rectangle" && coords && typeof coords === "object" && "coordinates" in (coords as object)) {
    const geom = coords as { coordinates?: number[][][] };
    const ring = Array.isArray(geom.coordinates)?.[0];
    if (ring?.length >= 4) {
      const lngs = ring.map(([lng]) => lng);
      const lats = ring.map(([, lat]) => lat);
      const sw = new google.maps.LatLng(Math.min(...lats), Math.min(...lngs));
      const ne = new google.maps.LatLng(Math.max(...lats), Math.max(...lngs));
      const overlay = new google.maps.Rectangle({
        bounds: new google.maps.LatLngBounds(sw, ne),
        ...style,
      });
      (overlay as any)._shapeId = id;
      overlay.setMap(map);
      return overlay as any;
    }
  }
  if (type === "marker" && Array.isArray(coords) && coords.length >= 2) {
    const overlay = new google.maps.Marker({
      position: { lat: Number(coords[1]), lng: Number(coords[0]) },
      map,
      draggable: true,
    });
    (overlay as any)._shapeId = id;
    return overlay as any;
  }
  return null;
}

export default function GoogleDrawMap({
  center = [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
  zoom = DEFAULT_ZOOM,
  height = "400px",
  enableDraw = false,
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
  drawnShapes = [],
}: GoogleDrawMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const overlaysRef = useRef<Map<string, google.maps.Polygon | google.maps.Circle | google.maps.Rectangle | google.maps.Marker>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onShapeEditedRef = useRef(onShapeEdited);
  onShapeEditedRef.current = onShapeEdited;

  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();
  const { isLoaded, loadError: loaderError } = useJsApiLoader({
    id: "google-map-draw",
    googleMapsApiKey: apiKey,
    version: "weekly",
    libraries: LIBRARIES,
    ...(apiKey ? {} : { preventGoogleFontsLoading: true }),
  });

  useEffect(() => {
    if (loaderError) setLoadError(loaderError.message || "Failed to load Google Maps");
    else if (!apiKey && isLoaded === false) setLoadError("Google Maps API key is not set (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)");
    else setLoadError(null);
  }, [loaderError, apiKey, isLoaded]);

  const onShapeCreatedRef = React.useRef(onShapeCreated);
  onShapeCreatedRef.current = onShapeCreated;
  onShapeEditedRef.current = onShapeEdited;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (!window.google?.maps?.drawing) return;

    const DrawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
        drawingModes: [
          google.maps.drawing.OverlayType.POLYGON,
          google.maps.drawing.OverlayType.CIRCLE,
          google.maps.drawing.OverlayType.RECTANGLE,
          google.maps.drawing.OverlayType.MARKER,
        ],
      },
      polygonOptions: {
        fillColor: "#e53935",
        fillOpacity: 0.35,
        strokeWeight: 4,
        strokeColor: "#000000",
        clickable: true,
        editable: true,
      },
      circleOptions: {
        fillColor: "#e53935",
        fillOpacity: 0.35,
        strokeWeight: 4,
        strokeColor: "#000000",
        clickable: true,
        editable: true,
      },
      rectangleOptions: {
        fillColor: "#e53935",
        fillOpacity: 0.35,
        strokeWeight: 4,
        strokeColor: "#000000",
        clickable: true,
        editable: true,
      },
    });

    drawingManagerRef.current = DrawingManager;
    if (enableDraw) DrawingManager.setMap(map);

    const typeMap: Record<string, string> = {
      [google.maps.drawing.OverlayType.POLYGON]: "polygon",
      [google.maps.drawing.OverlayType.CIRCLE]: "circle",
      [google.maps.drawing.OverlayType.RECTANGLE]: "rectangle",
      [google.maps.drawing.OverlayType.MARKER]: "marker",
    };

    setMapReady(true);

    DrawingManager.addListener("overlaycomplete", (e: google.maps.drawing.OverlayCompleteEvent) => {
      const overlay = e.overlay;
      const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const type = typeMap[e.type] || "polygon";
      (overlay as any)._shapeId = id;
      overlaysRef.current.set(id, overlay as any);

      const shape = overlayToShape(overlay as any, type, id);
      if (shape) onShapeCreatedRef.current?.(shape);

      if (type !== "marker" && overlay.getDraggable) {
        overlay.addListener("dragend", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
      }
      if (overlay.getEditable && typeof overlay.getEditable === "function") {
        (overlay as google.maps.Polygon).getPath?.().addListener("set_at", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
        (overlay as google.maps.Polygon).getPath?.().addListener("insert_at", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
      }
    });
  }, [enableDraw]);

  const onMapUnmount = useCallback(() => {
    setMapReady(false);
    if (drawingManagerRef.current?.getMap()) {
      drawingManagerRef.current.setMap(null);
      drawingManagerRef.current = null;
    }
    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current.clear();
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!drawingManagerRef.current || !mapRef.current) return;
    drawingManagerRef.current.setMap(enableDraw ? mapRef.current : null);
  }, [enableDraw]);

  // Restore drawn shapes from props (e.g. when editing a location) and sync with overlays
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    const shapeIds = new Set(drawnShapes.map((s) => s.id));

    // Remove overlays that are no longer in drawnShapes
    overlaysRef.current.forEach((overlay, id) => {
      if (!shapeIds.has(id)) {
        overlay.setMap?.(null);
        overlaysRef.current.delete(id);
      }
    });

    // Create overlays for shapes that don't have one yet (restore from JSON)
    drawnShapes.forEach((shape) => {
      if (overlaysRef.current.has(shape.id)) return;
      const overlay = shapeToOverlay(map, shape);
      if (!overlay) return;
      overlaysRef.current.set(shape.id, overlay as any);
      const type = shape.type;
      const id = shape.id;
      // Notify parent when user edits a restored shape
      if (type !== "marker" && overlay.getDraggable) {
        overlay.addListener?.("dragend", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
      }
      if (overlay.getEditable && typeof (overlay as google.maps.Polygon).getPath === "function") {
        (overlay as google.maps.Polygon).getPath?.().addListener?.("set_at", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
        (overlay as google.maps.Polygon).getPath?.().addListener?.("insert_at", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
      }
      if (type === "rectangle" && overlay.getBounds) {
        (overlay as google.maps.Rectangle).addListener?.("bounds_changed", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
      }
      if (type === "circle" && overlay.getRadius) {
        (overlay as google.maps.Circle).addListener?.("radius_changed", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
        (overlay as google.maps.Circle).addListener?.("center_changed", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
      }
      if (type === "marker" && overlay.getPosition) {
        (overlay as google.maps.Marker).addListener?.("dragend", () => {
          const s = overlayToShape(overlay as any, type, id);
          if (s) onShapeEditedRef.current?.(s);
        });
      }
    });
  }, [drawnShapes, mapReady]);

  useEffect(() => {
    return () => {
      onMapUnmount();
    };
  }, [onMapUnmount]);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/50 p-6 text-center" style={{ height }}>
        <p className="text-sm font-medium">Google Maps API key required</p>
        <p className="text-xs text-muted-foreground">
          Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code className="rounded bg-muted px-1">.env</code>. Enable Maps JavaScript API and Drawing Library in Google Cloud Console.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/50 p-6 text-center" style={{ height }}>
        <p className="text-sm font-medium text-destructive">{loadError}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/50" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden" style={{ height }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={{ lat: center[0], lng: center[1] }}
        zoom={zoom}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={{
          scrollwheel: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
        }}
      />
    </div>
  );
}
