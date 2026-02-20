"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { LeafletDrawControl, type DrawnShape } from "./LeafletDrawControl";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => ({ default: mod.MapContainer })),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => ({ default: mod.TileLayer })),
  { ssr: false }
);

export type { DrawnShape };

interface LeafletDrawMapProps {
  locations?: Array<{ id: string | number; name: string; latitude?: number; longitude?: number }>;
  center?: [number, number];
  zoom?: number;
  height?: string;
  enableDraw?: boolean;
  onShapeCreated?: (shape: DrawnShape) => void;
  onShapeEdited?: (shape: DrawnShape) => void;
  onShapeDeleted?: (shapeId: string) => void;
  drawnShapes?: DrawnShape[];
}

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];
const DEFAULT_ZOOM = 10;

export default function LeafletDrawMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = "400px",
  enableDraw = false,
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
}: LeafletDrawMapProps) {
  const [mounted, setMounted] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      setLeafletReady(true);
    });
  }, [mounted]);

  useEffect(() => {
    if (!enableDraw) return;
    if (document.querySelector('link[href*="leaflet.draw"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css";
    document.head.appendChild(link);
  }, [enableDraw]);

  if (!mounted || !leafletReady) {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/50" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden" style={{ height }}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <MapContainer
        center={[center[0], center[1]]}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {enableDraw && (
          <LeafletDrawControl
            enabled={enableDraw}
            onShapeCreated={onShapeCreated}
            onShapeEdited={onShapeEdited}
            onShapeDeleted={onShapeDeleted}
          />
        )}
      </MapContainer>
    </div>
  );
}
