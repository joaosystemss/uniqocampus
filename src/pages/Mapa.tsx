import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

// UniNOVAFAPI - Teresina/PI
const NOVAFAPI: [number, number] = [-5.0859, -42.8127];

// Custom marker icon (avoids broken default-icon paths in bundlers)
const novafapiIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;transform:translate(-50%,-100%);">
      <div style="background:hsl(217 91% 60%);width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;border:3px solid #fff;">
        <span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:14px;">N</span>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [0, 0],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 0 4px rgba(34,197,94,.35);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(position, 16); }, [position, map]);
  return null;
}

export default function Mapa() {
  const { theme } = useTheme();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLocate = () => {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError("Geolocalização não suportada neste dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setLocError("Permissão de localização negada."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${NOVAFAPI[0]},${NOVAFAPI[1]}`;

  // Dark vs light tiles
  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttr = theme === "dark"
    ? '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>';

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Mapa da NOVAFAPI</h1>
        </div>
      </header>

      <div ref={containerRef} className="relative">
        <MapContainer
          center={NOVAFAPI}
          zoom={16}
          scrollWheelZoom
          style={{ height: "calc(100vh - 8rem)", width: "100%" }}
          aria-label="Mapa interativo da NOVAFAPI"
        >
          <TileLayer key={theme} url={tileUrl} attribution={tileAttr} />
          <Marker position={NOVAFAPI} icon={novafapiIcon}>
            <Popup>
              <div className="space-y-2 min-w-[180px]">
                <div>
                  <p className="font-bold text-sm m-0">NOVAFAPI</p>
                  <p className="text-xs m-0 text-muted-foreground">Centro Universitário UniNOVAFAPI</p>
                </div>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90"
                >
                  <Navigation className="h-3 w-3" /> Como chegar
                </a>
              </div>
            </Popup>
          </Marker>

          {userPos && (
            <>
              <Marker position={userPos} icon={userIcon} />
              <Polyline positions={[userPos, NOVAFAPI]} pathOptions={{ color: "#3b82f6", weight: 4, dashArray: "8 8" }} />
              <Recenter position={userPos} />
            </>
          )}
        </MapContainer>

        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
          <Button size="sm" onClick={handleLocate} className="shadow-lg" aria-label="Minha localização">
            <Navigation className="h-4 w-4 mr-1.5" /> Minha localização
          </Button>
          <Button size="sm" variant="secondary" onClick={handleFullscreen} className="shadow-lg" aria-label="Tela cheia">
            <Maximize2 className="h-4 w-4 mr-1.5" /> Tela cheia
          </Button>
        </div>

        {locError && (
          <div className="absolute left-3 bottom-3 z-[1000] bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-xs shadow-lg">
            {locError}
          </div>
        )}
      </div>
    </div>
  );
}
