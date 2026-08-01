import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { distance as turfDistance, point as turfPoint } from "@turf/turf";
import "leaflet/dist/leaflet.css";
import {
  Bus,
  Navigation,
  AlertTriangle,
  Radio,
  Loader2,
  Gauge,
} from "lucide-react";
import api from "../../api/axios";
import { useSocket } from "../../context/SocketContext";

// Default Leaflet marker assets (CDN) — avoids Vite asset-path issues
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const busIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#2563eb;color:#fff;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font-size:14px;">🚌</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface Stop {
  _id?: string;
  stopName: string;
  arrivalTime: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
}

interface BusRoute {
  _id: string;
  routeName: string;
  busNumber: string;
  stops: Stop[];
  status: string;
  lastKnownLocation?: {
    lat: number;
    lng: number;
    speedKmh?: number;
    heading?: number;
    recordedAt?: string;
    routeDeviation?: boolean;
    etaMinutesToNextStop?: number;
    nearestStopName?: string;
  };
  corridorRadiusM?: number;
}

interface LivePoint {
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number;
  recordedAt?: string;
  routeDeviation?: boolean;
  nearestStopName?: string;
  nearestStopDistanceM?: number;
  etaMinutesToNextStop?: number;
  busNumber?: string;
  routeName?: string;
}

interface GeofenceAlert {
  stopName: string;
  message: string;
  distanceM?: number;
  etaMinutes?: number;
  at: string;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface Props {
  routes: BusRoute[];
  canSimulate?: boolean;
}

export default function LiveBusTrackerMap({ routes, canSimulate }: Props) {
  const { socket, isConnected } = useSocket();
  const [routeId, setRouteId] = useState(routes[0]?._id || "");
  const [live, setLive] = useState<LivePoint | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => routes.find((r) => r._id === routeId) || null,
    [routes, routeId]
  );

  const stopsWithCoords = useMemo(
    () =>
      (selected?.stops || []).filter(
        (s) => typeof s.lat === "number" && typeof s.lng === "number"
      ),
    [selected]
  );

  const center = useMemo<[number, number]>(() => {
    if (live) return [live.lat, live.lng];
    if (selected?.lastKnownLocation?.lat != null) {
      return [selected.lastKnownLocation.lat, selected.lastKnownLocation.lng];
    }
    if (stopsWithCoords[0]) return [stopsWithCoords[0].lat!, stopsWithCoords[0].lng!];
    return [12.9716, 77.5946];
  }, [live, selected, stopsWithCoords]);

  useEffect(() => {
    if (!routes.length) return;
    if (!routeId || !routes.some((r) => r._id === routeId)) {
      setRouteId(routes[0]._id);
    }
  }, [routes, routeId]);

  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [latestRes, histRes] = await Promise.all([
          api.get<{
            data: {
              lastKnownLocation: LivePoint | null;
              latestSample: LivePoint | null;
            };
          }>(`/bus-routes/${routeId}/telemetry/latest`),
          api.get<{ data: Array<{ lat: number; lng: number }> }>(
            `/bus-routes/${routeId}/telemetry/history?limit=40`
          ),
        ]);
        if (cancelled) return;
        const point =
          latestRes.data.data.latestSample ||
          latestRes.data.data.lastKnownLocation;
        setLive(point || null);
        setTrail(
          (histRes.data.data || []).map((p) => [p.lat, p.lng] as [number, number])
        );
      } catch {
        if (!cancelled) setError("Could not load live telemetry");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  useEffect(() => {
    if (!socket || !routeId) return;

    socket.emit("bus:subscribe", { routeId });

    const onLocation = (payload: LivePoint & { routeId?: string }) => {
      if (payload.routeId && payload.routeId !== routeId) return;
      setLive(payload);
      setTrail((prev) => [...prev.slice(-80), [payload.lat, payload.lng]]);
    };

    const onGeofence = (payload: {
      routeId?: string;
      stopName: string;
      message: string;
      distanceM?: number;
      etaMinutes?: number;
    }) => {
      if (payload.routeId && payload.routeId !== routeId) return;
      setAlerts((prev) =>
        [
          {
            stopName: payload.stopName,
            message: payload.message,
            distanceM: payload.distanceM,
            etaMinutes: payload.etaMinutes,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8)
      );
    };

    const onDeviation = (payload: { routeId?: string; message: string }) => {
      if (payload.routeId && payload.routeId !== routeId) return;
      setAlerts((prev) =>
        [
          {
            stopName: "Route",
            message: payload.message,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8)
      );
    };

    socket.on("bus:location", onLocation);
    socket.on("bus:geofence", onGeofence);
    socket.on("bus:deviation", onDeviation);

    return () => {
      socket.emit("bus:unsubscribe", { routeId });
      socket.off("bus:location", onLocation);
      socket.off("bus:geofence", onGeofence);
      socket.off("bus:deviation", onDeviation);
    };
  }, [socket, routeId]);

  const distanceToMyStopKm = useMemo(() => {
    if (!live || !stopsWithCoords[0]) return null;
    const from = turfPoint([live.lng, live.lat]);
    const to = turfPoint([stopsWithCoords[0].lng!, stopsWithCoords[0].lat!]);
    return turfDistance(from, to, { units: "kilometers" });
  }, [live, stopsWithCoords]);

  const handleSimulate = async () => {
    if (!routeId) return;
    setSimulating(true);
    try {
      await api.post(`/bus-routes/${routeId}/telemetry/simulate`, {});
    } catch {
      setError("Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-800 dark:text-white">Live GPS map</h3>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              isConnected
                ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                : "border-amber-300 text-amber-700 bg-amber-50"
            }`}
          >
            <Radio className="w-3 h-3 inline mr-1" />
            {isConnected ? "Socket live" : "Offline"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1.5"
          >
            {routes.map((r) => (
              <option key={r._id} value={r._id}>
                {r.busNumber} — {r.routeName}
              </option>
            ))}
          </select>
          {canSimulate && (
            <button
              type="button"
              onClick={handleSimulate}
              disabled={simulating || !routeId}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-50"
            >
              {simulating ? "Pinging…" : "Simulate GPS tick"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div className="rounded-lg bg-blue-50 p-2">
          <p className="text-[10px] uppercase text-blue-700">Speed</p>
          <p className="font-semibold text-blue-900 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" />
            {live?.speedKmh != null ? `${Math.round(live.speedKmh)} km/h` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[10px] uppercase text-slate-500">ETA next stop</p>
          <p className="font-semibold">
            {live?.etaMinutesToNextStop != null
              ? `${live.etaMinutesToNextStop} min`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2">
          <p className="text-[10px] uppercase text-emerald-700">Nearest stop</p>
          <p className="font-semibold text-emerald-900 truncate">
            {live?.nearestStopName || "—"}
          </p>
        </div>
        <div
          className={`rounded-lg p-2 ${
            live?.routeDeviation ? "bg-red-50" : "bg-slate-50"
          }`}
        >
          <p className="text-[10px] uppercase text-slate-500">Route status</p>
          <p className="font-semibold flex items-center gap-1">
            {live?.routeDeviation ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Off-route
              </>
            ) : (
              "On corridor"
            )}
          </p>
        </div>
      </div>

      {distanceToMyStopKm != null && distanceToMyStopKm <= 1 && (
        <div className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2">
          Bus is within 1 km of {stopsWithCoords[0]?.stopName} (
          {distanceToMyStopKm.toFixed(2)} km) — geo-fence alert zone.
        </div>
      )}

      <div className="relative h-[380px] rounded-xl overflow-hidden border border-slate-200">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          </div>
        )}
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {live && <Recenter lat={live.lat} lng={live.lng} />}
          {trail.length > 1 && (
            <Polyline positions={trail} pathOptions={{ color: "#2563eb", weight: 3 }} />
          )}
          {stopsWithCoords.map((s, i) => (
            <Marker key={`stop-${s.stopName}-${i}`} position={[s.lat!, s.lng!]}>
              <Popup>
                <strong>{s.stopName}</strong>
                <br />
                Scheduled {s.arrivalTime}
                <br />
                Fence {s.radiusM || 1000} m
              </Popup>
            </Marker>
          ))}
          {stopsWithCoords.map((s, i) => (
            <Circle
              key={`fence-${s.stopName}-${i}`}
              center={[s.lat!, s.lng!]}
              radius={s.radiusM || 1000}
              pathOptions={{
                color: "#f59e0b",
                fillColor: "#fbbf24",
                fillOpacity: 0.12,
                weight: 1,
              }}
            />
          ))}
          {live && (
            <Marker position={[live.lat, live.lng]} icon={busIcon}>
              <Popup>
                <div className="text-sm">
                  <Bus className="w-4 h-4 inline mr-1" />
                  {live.busNumber || selected?.busNumber}
                  <br />
                  {live.speedKmh != null && `${Math.round(live.speedKmh)} km/h`}
                  {live.etaMinutesToNextStop != null &&
                    ` · ETA ${live.etaMinutesToNextStop} min`}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {alerts.length > 0 && (
        <ul className="space-y-1.5 max-h-36 overflow-y-auto">
          {alerts.map((a, i) => (
            <li
              key={`${a.at}-${i}`}
              className="text-xs rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900"
            >
              <strong>{a.stopName}:</strong> {a.message}
            </li>
          ))}
        </ul>
      )}

      {!stopsWithCoords.length && selected && (
        <p className="text-xs text-slate-500">
          Tip: add lat/lng (and optional radiusM) on stops so geo-fences and ETA work. HOD can
          edit the route with coordinates.
        </p>
      )}
    </div>
  );
}
