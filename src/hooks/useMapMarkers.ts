// src/hooks/useMapMarkers.ts
"use client";

import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { PinStub } from "@/types/map";

export function useMapMarkers(
  onPinClick: (pinId: string) => void
) {
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  const syncMarkers = useCallback((
    pins: PinStub[],
    map: mapboxgl.Map
  ) => {
    const pinIds = new Set(pins.map((p) => p.id));

    // Remove stale markers
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!pinIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    }

    // Add new markers
    pins.forEach((pin) => {
      if (markersRef.current[pin.id]) return;

      const outer = document.createElement("div");
      outer.style.cssText = `width: 28px; height: 28px; cursor: pointer;`;

      const dot = document.createElement("div");
      dot.style.cssText = `
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #22c55e;
        border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,.5);
        transition: transform 0.15s;
      `;

      outer.appendChild(dot);
      outer.onmouseenter = () => { dot.style.transform = "scale(1.2)"; };
      outer.onmouseleave = () => { dot.style.transform = ""; };
      outer.onclick = (e) => {
        e.stopPropagation();
        onPinClick(pin.id);
      };

      const marker = new mapboxgl.Marker({ element: outer, anchor: "center" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);

      markersRef.current[pin.id] = marker;
    });
  }, [onPinClick]);

  function removeMarker(pinId: string) {
    markersRef.current[pinId]?.remove();
    delete markersRef.current[pinId];
  }

  function removeAll() {
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
  }

  return { syncMarkers, removeMarker, removeAll };
}