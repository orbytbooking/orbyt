"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import "ol/ol.css";

export interface Location {
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

export interface DrawnShape {
  id: string;
  type: "polygon" | "circle" | "rectangle" | "marker";
  coordinates: any;
  properties?: {
    radius?: number;
    area?: number;
    name?: string;
    description?: string;
  };
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
  enableDraw?: boolean;
  onShapeCreated?: (shape: DrawnShape) => void;
  onShapeEdited?: (shape: DrawnShape) => void;
  onShapeDeleted?: (shapeId: string) => void;
  drawnShapes?: DrawnShape[];
}

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];
const DEFAULT_ZOOM = 10;

function escapeHtml(s: string): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function OpenStreetMap({
  locations,
  onLocationSelect,
  onMapClick,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = "400px",
  readonly = false,
  allowPinDrop = false,
  enableDraw = false,
  onShapeCreated,
  onShapeEdited,
  onShapeDeleted,
  drawnShapes = [],
}: OpenStreetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawSourceRef = useRef<any>(null);
  const markersSourceRef = useRef<any>(null);
  const drawInteractionRef = useRef<any>(null);
  const modifyInteractionRef = useRef<any>(null);
  const selectInteractionRef = useRef<any>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupOverlayRef = useRef<any>(null);
  const shapeBuilderRef = useRef<((feature: any, typeOverride?: string) => DrawnShape) | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeDrawType, setActiveDrawType] = useState<string | null>(null);
  const [shapes, setShapes] = useState<DrawnShape[]>(drawnShapes);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if ((container as any)._ol_map_id != null) {
      (container as any)._ol_map_id = undefined;
    }

    let map: any = null;

    const init = async () => {
      const [
        olMain,
        olProj,
        olGeomPoint,
        olFormatGeoJSON,
        olStyleModule,
        olSourceModule,
        olLayerModule,
        olDrawModule,
        olModifyModule,
        olSelectModule,
        olEventsCondition,
      ] = await Promise.all([
        import("ol"),
        import("ol/proj"),
        import("ol/geom/Point"),
        import("ol/format/GeoJSON"),
        import("ol/style"),
        import("ol/source"),
        import("ol/layer"),
        import("ol/interaction/Draw"),
        import("ol/interaction/Modify"),
        import("ol/interaction/Select"),
        import("ol/events/condition"),
      ]);

      const Map = olMain.Map;
      const View = olMain.View;
      const Feature = olMain.Feature;
      const Overlay = olMain.Overlay;
      const fromLonLat = olProj.fromLonLat;
      const toLonLat = olProj.toLonLat;
      const Point = olGeomPoint.default;
      const GeoJSON = olFormatGeoJSON.default;
      const VectorSource = olSourceModule.Vector;
      const OSM = olSourceModule.OSM;
      const TileLayer = olLayerModule.Tile;
      const VectorLayer = olLayerModule.Vector;
      const Draw = olDrawModule.default;
      const createBox = olDrawModule.createBox;
      const Modify = olModifyModule.default;
      const Select = olSelectModule.default;
      const click = olEventsCondition.click;

      const Style = olStyleModule.Style;
      const Fill = olStyleModule.Fill;
      const Stroke = olStyleModule.Stroke;
      const CircleStyle = olStyleModule.Circle;

      const hasLoc = locations.some((l) => l.latitude != null && l.longitude != null);
      const first = locations.find((l) => l.latitude != null && l.longitude != null);
      const mapCenter = hasLoc && first ? [first.longitude!, first.latitude!] : [center[1], center[0]];
      const view = new View({ center: fromLonLat(mapCenter), zoom: zoom });

      const drawSource = new VectorSource();
      drawSourceRef.current = drawSource;

      const markersSource = new VectorSource();
      markersSourceRef.current = markersSource;

      const drawLayer = new VectorLayer({
        source: drawSource,
        style: new Style({
          fill: new Fill({ color: "rgba(59, 130, 246, 0.2)" }),
          stroke: new Stroke({ color: "#3b82f6", width: 3 }),
          image: new CircleStyle({
            fill: new Fill({ color: "#3b82f6" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
            radius: 6,
          }),
        }),
      });

      const markersLayer = new VectorLayer({
        source: markersSource,
        style: new Style({
          image: new CircleStyle({
            fill: new Fill({ color: "#ef4444" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
            radius: 8,
          }),
        }),
      });

      map = new Map({
        target: container,
        layers: [
          new TileLayer({ source: new OSM() }),
          drawLayer,
          markersLayer,
        ],
        view,
      });

      function olProjFromLonLat([lon, lat]: number[]) {
        return fromLonLat([lon, lat]);
      }

      function lonLatFromOl(coord: number[]) {
        return toLonLat(coord);
      }

      const geoJsonFormat = new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: view.getProjection(),
      });

      function featureToShape(feature: any, typeOverride?: string): DrawnShape {
        const geom = feature.getGeometry();
        const type = typeOverride ?? feature.get("shapeType") ?? geom.getType?.()?.toLowerCase() ?? "polygon";
        const id = feature.getId() ?? feature.get("shapeId") ?? String(Date.now());
        const geoJson = geoJsonFormat.writeFeatureObject(feature);
        const properties: DrawnShape["properties"] = {};
        if (geom.getRadius) {
          properties.radius = geom.getRadius();
          properties.area = Math.PI * geom.getRadius() * geom.getRadius();
        } else if (geom.getArea) {
          properties.area = geom.getArea();
        }
        return {
          id: String(id),
          type: type === "point" ? "marker" : (type as DrawnShape["type"]),
          coordinates: geoJson,
          properties,
        };
      }

      locations.forEach((loc) => {
        if (loc.latitude == null || loc.longitude == null) return;
        const point = new Point(olProjFromLonLat([loc.longitude, loc.latitude]));
        const feature = new Feature({ geometry: point });
        feature.setId(String(loc.id));
        feature.set("locationData", loc);
        feature.set("popupContent", `
          <div class="text-sm">
            <h3 class="font-semibold">${escapeHtml(loc.name)}</h3>
            ${loc.address ? `<p>${escapeHtml(loc.address)}</p>` : ""}
            <p>${[loc.city, loc.state].filter(Boolean).join(", ")} ${loc.postalCode ?? ""}</p>
            <p class="text-xs text-muted-foreground mt-1">Status: ${loc.active ? "Active" : "Inactive"}</p>
          </div>
        `);
        markersSource.addFeature(feature);
      });

      const popupEl = document.createElement("div");
      popupEl.className = "ol-popup absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border rounded shadow-lg p-2 text-sm z-50 min-w-[180px]";
      popupEl.style.display = "none";
      container.appendChild(popupEl);
      popupRef.current = popupEl;

      const popupOverlay = new Overlay({
        element: popupEl,
        positioning: "bottom-center",
        stopEvent: false,
      });
      map.addOverlay(popupOverlay);
      popupOverlayRef.current = popupOverlay;

      map.on("click", (e: any) => {
        popupOverlay.setPosition(undefined);
        popupEl.style.display = "none";
        const pixel = map.getEventPixel(e.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel);
        if (hit) {
          const feature = map.forEachFeatureAtPixel(pixel, (f: any) => f);
          if (feature?.get?.("locationData")) {
            const loc = feature.get("locationData");
            onLocationSelect?.(loc);
          }
          if (feature?.get?.("popupContent")) {
            popupEl.innerHTML = feature.get("popupContent");
            popupOverlay.setPosition(e.coordinate);
            popupEl.style.display = "block";
          }
        }
        if (allowPinDrop && !readonly && !enableDraw) {
          const coord = e.coordinate;
          if (coord && !hit) {
            const [lng, lat] = lonLatFromOl(coord);
            onMapClick?.(lat, lng);
          }
        }
      });

      if (!readonly) {
        shapeBuilderRef.current = (feature: any, typeOverride?: string) =>
          featureToShape(feature, typeOverride);
        const modify = new Modify({ source: drawSource });
        modify.on("modifyend", (e: any) => {
          e.features.forEach((feature: any) => {
            const shape = featureToShape(feature);
            setShapes((prev) => prev.map((s) => (s.id === shape.id ? shape : s)));
            onShapeEdited?.(shape);
          });
        });
        map.addInteraction(modify);
        modifyInteractionRef.current = modify;
        const select = new Select({
          condition: click,
          layers: [drawLayer],
        });
        select.on("select", (e: any) => {
          const selected = e.selected;
          if (selected.length > 0) (window as any).__ol_selected_feature = selected[0];
          else (window as any).__ol_selected_feature = null;
        });
        map.addInteraction(select);
        selectInteractionRef.current = select;
      }

      mapRef.current = map;
      setIsReady(true);
    };

    init();

    return () => {
      setIsReady(false);
      shapeBuilderRef.current = null;
      (window as any).__ol_selected_feature = undefined;
      if (popupRef.current?.parentNode) {
        try {
          popupRef.current.parentNode.removeChild(popupRef.current);
        } catch {
          // ignore if already removed (e.g. by map teardown)
        }
      }
      popupRef.current = null;
      popupOverlayRef.current = null;
      drawInteractionRef.current = null;
      modifyInteractionRef.current = null;
      selectInteractionRef.current = null;
      drawSourceRef.current = null;
      markersSourceRef.current = null;
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
      if (container && (container as any)._ol_map_id != null) {
        (container as any)._ol_map_id = undefined;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add/remove Draw interaction when tool or enableDraw changes
  useEffect(() => {
    const map = mapRef.current;
    const source = drawSourceRef.current;
    if (!map || !source || !isReady || readonly) return;

    const type = enableDraw ? activeDrawType : null;
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    if (!type) return;

    let cancelled = false;
    (async () => {
      const [olDrawModule, olStyleModule] = await Promise.all([
        import("ol/interaction/Draw"),
        import("ol/style"),
      ]);
      if (cancelled || !mapRef.current || mapRef.current !== map) return;
      const Draw = olDrawModule.default;
      const createBox = olDrawModule.createBox;
      const Style = olStyleModule.Style;
      const Fill = olStyleModule.Fill;
      const Stroke = olStyleModule.Stroke;
      const CircleStyle = olStyleModule.Circle;
      const opts: any = {
        source,
        style: new Style({
          fill: new Fill({ color: "rgba(59, 130, 246, 0.2)" }),
          stroke: new Stroke({ color: "#3b82f6", width: 3 }),
          image: new CircleStyle({
            fill: new Fill({ color: "#3b82f6" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
            radius: 6,
          }),
        }),
      };
      if (type === "Polygon") opts.type = "Polygon";
      else if (type === "Rectangle") {
        opts.type = "Circle";
        opts.geometryFunction = createBox();
      } else if (type === "Circle") opts.type = "Circle";
      else if (type === "Point") opts.type = "Point";
      else return;
      const draw = new Draw(opts);
      const shapeType = type === "Rectangle" ? "rectangle" : type.toLowerCase();
      const finalType = shapeType === "point" ? "marker" : shapeType;
      draw.on("drawend", (e: any) => {
        const feature = e.feature;
        feature.set("shapeType", finalType);
        feature.setId(String(Date.now()));
        feature.set("shapeId", feature.getId());
        const build = shapeBuilderRef.current;
        if (build) {
          const shape = build(feature, finalType);
          setShapes((prev) => [...prev, shape]);
          onShapeCreated?.(shape);
        }
      });
      if (cancelled || mapRef.current !== map) return;
      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    })();
    return () => {
      cancelled = true;
      if (drawInteractionRef.current) {
        map.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
    };
  }, [isReady, readonly, enableDraw, activeDrawType, onShapeCreated]);

  const deleteSelected = () => {
    const feature = (window as any).__ol_selected_feature;
    if (!feature || !drawSourceRef.current || !mapRef.current) return;
    const id = String(feature.getId() ?? feature.get("shapeId"));
    drawSourceRef.current.removeFeature(feature);
    setShapes((prev) => prev.filter((s) => s.id !== id));
    onShapeDeleted?.(id);
    (window as any).__ol_selected_feature = null;
  };

  useEffect(() => {
    const map = mapRef.current;
    const source = markersSourceRef.current;
    if (!map || !source || !isReady) return;

    (async () => {
      const [olMain, olProj, olGeomPoint] = await Promise.all([
        import("ol"),
        import("ol/proj"),
        import("ol/geom/Point"),
      ]);
      const Feature = olMain.Feature;
      const fromLonLat = olProj.fromLonLat;
      const Point = olGeomPoint.default;
      source.clear();
      locations.forEach((loc) => {
        if (loc.latitude == null || loc.longitude == null) return;
        const point = new Point(fromLonLat([loc.longitude, loc.latitude]));
        const feature = new Feature({ geometry: point });
        feature.setId(String(loc.id));
        feature.set("locationData", loc);
        feature.set("popupContent", `
          <div class="text-sm">
            <h3 class="font-semibold">${escapeHtml(loc.name)}</h3>
            ${loc.address ? `<p>${escapeHtml(loc.address)}</p>` : ""}
            <p>${[loc.city, loc.state].filter(Boolean).join(", ")} ${loc.postalCode ?? ""}</p>
            <p class="text-xs text-muted-foreground mt-1">Status: ${loc.active ? "Active" : "Inactive"}</p>
          </div>
        `);
        source.addFeature(feature);
      });
    })();
  }, [isReady, locations, onLocationSelect]);

  const displayShapes = shapes.length ? shapes : drawnShapes;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border z-10"
        style={{ height, minHeight: height }}
      />
      {!isReady && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10"
          style={{ height }}
        >
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {enableDraw && !readonly && isReady && (
        <div
          className="absolute top-2 left-2 z-20 flex flex-wrap gap-1 bg-white rounded-md shadow-lg border border-gray-200 p-1.5"
          style={{ pointerEvents: "auto" }}
        >
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium rounded border transition-colors ${activeDrawType === "Polygon" ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-gray-100 border-gray-300"}`}
            onClick={() => setActiveDrawType((p) => (p === "Polygon" ? null : "Polygon"))}
          >
            Polygon
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium rounded border transition-colors ${activeDrawType === "Rectangle" ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-gray-100 border-gray-300"}`}
            onClick={() => setActiveDrawType((p) => (p === "Rectangle" ? null : "Rectangle"))}
          >
            Rectangle
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium rounded border transition-colors ${activeDrawType === "Circle" ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-gray-100 border-gray-300"}`}
            onClick={() => setActiveDrawType((p) => (p === "Circle" ? null : "Circle"))}
          >
            Circle
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium rounded border transition-colors ${activeDrawType === "Point" ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-gray-100 border-gray-300"}`}
            onClick={() => setActiveDrawType((p) => (p === "Point" ? null : "Point"))}
          >
            Point
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm font-medium rounded border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
            onClick={() => setActiveDrawType(null)}
          >
            None
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm font-medium rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteSelected();
            }}
          >
            Delete selected
          </button>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-md p-2 text-xs text-muted-foreground z-20">
        <p>© OpenStreetMap contributors</p>
        {readonly && <p>View only mode</p>}
        {allowPinDrop && !readonly && !enableDraw && <p>Click map to pin location</p>}
        {enableDraw && !readonly && (
          <>
            <p>Use the <strong>toolbar above the map</strong> to draw.</p>
            <p className="mt-1">Polygon / Rectangle / Circle / Point — then click the map.</p>
          </>
        )}
        {displayShapes.length > 0 && <p>Shapes drawn: {displayShapes.length}</p>}
      </div>
    </div>
  );
}
