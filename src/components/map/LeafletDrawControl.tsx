"use client";

import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

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

interface LeafletDrawControlProps {
  enabled: boolean;
  onShapeCreated?: (shape: DrawnShape) => void;
  onShapeEdited?: (shape: DrawnShape) => void;
  onShapeDeleted?: (shapeId: string) => void;
}

export function LeafletDrawControl({
  enabled,
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
}: LeafletDrawControlProps) {
  const map = useMap();
  const drawControlRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const layerToIdRef = useRef<Map<any, string>>(new Map());

  useEffect(() => {
    if (!enabled || !map) return;

    let cancelled = false;
    const init = async () => {
      const L = await import("leaflet");
      await import("leaflet-draw");
      await new Promise((r) => setTimeout(r, 200));

      if (cancelled) return;
      const Draw = (L as any).Draw;
      if (!Draw?.Event) return;

      const FeatureGroup = (L as any).FeatureGroup;
      const drawnItems = new FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      const drawControl = new (L as any).Control.Draw({
        position: "topleft",
        draw: {
          polygon: {
            allowIntersection: false,
            shapeOptions: { color: "#3b82f6", weight: 3 },
          },
          polyline: false,
          circle: { shapeOptions: { color: "#3b82f6", weight: 3 } },
          rectangle: { shapeOptions: { color: "#3b82f6", weight: 3 } },
          marker: true,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });
      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      map.on(Draw.Event.CREATED, (e: any) => {
        const layer = e.layer;
        const layerType = e.layerType;
        const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        (layer as any)._shapeId = id;
        layerToIdRef.current.set(layer, id);
        drawnItems.addLayer(layer);

        let shape: DrawnShape;
        if (layerType === "circle") {
          const c = layer.getCenter();
          const r = layer.getRadius();
          shape = {
            id,
            type: "circle",
            coordinates: [c.lng, c.lat],
            properties: { radius: r, area: Math.PI * r * r },
          };
        } else if (layerType === "rectangle") {
          const b = layer.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          shape = {
            id,
            type: "rectangle",
            coordinates: {
              type: "Polygon",
              coordinates: [
                [
                  [sw.lng, sw.lat],
                  [ne.lng, sw.lat],
                  [ne.lng, ne.lat],
                  [sw.lng, ne.lat],
                  [sw.lng, sw.lat],
                ],
              ],
            },
            properties: {},
          };
        } else {
          const geo = layer.toGeoJSON();
          shape = {
            id,
            type: layerType === "marker" ? "marker" : "polygon",
            coordinates: geo?.geometry ?? { type: "Polygon", coordinates: [] },
            properties: {},
          };
        }
        onShapeCreated?.(shape);
      });

      map.on(Draw.Event.EDITED, (e: any) => {
        e.layers.eachLayer((layer: any) => {
          const id = (layer as any)._shapeId ?? layerToIdRef.current.get(layer);
          if (!id) return;
          let s: DrawnShape;
          if (layer.getRadius != null) {
            const c = layer.getCenter();
            s = { id, type: "circle", coordinates: [c.lng, c.lat], properties: { radius: layer.getRadius() } };
          } else if (layer.toGeoJSON) {
            const geo = layer.toGeoJSON();
            s = { id, type: "polygon", coordinates: geo?.geometry ?? {}, properties: {} };
          } else {
            return;
          }
          onShapeEdited?.(s);
        });
      });

      map.on(Draw.Event.DELETED, (e: any) => {
        e.layers.eachLayer((layer: any) => {
          const id = (layer as any)._shapeId ?? layerToIdRef.current.get(layer);
          if (id) onShapeDeleted?.(id);
          layerToIdRef.current.delete(layer);
        });
      });
    };

    init();
    return () => {
      cancelled = true;
      if (drawControlRef.current) {
        try {
          map.removeControl(drawControlRef.current);
        } catch (_) {}
      }
      if (drawnItemsRef.current) {
        try {
          map.removeLayer(drawnItemsRef.current);
        } catch (_) {}
      }
      drawControlRef.current = null;
      drawnItemsRef.current = null;
      layerToIdRef.current = new Map();
    };
  }, [map, enabled, onShapeCreated, onShapeEdited, onShapeDeleted]);

  return null;
}
