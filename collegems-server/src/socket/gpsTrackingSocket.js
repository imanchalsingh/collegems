import BusRoute from "../models/BusRoute.model.js";
import BusTelemetry from "../models/BusTelemetry.model.js";
import User from "../models/User.model.js";
import {
  etaMinutes,
  isRouteDeviated,
  nearestStop,
  stopsInsideGeofence,
} from "../utils/busGeo.util.js";
import Notification from "../models/Notification.model.js";

/** In-memory last geofence alert key → timestamp to avoid spam. */
const geofenceCooldown = new Map();
const GEOFENCE_COOLDOWN_MS = 3 * 60 * 1000;

function roomName(routeId) {
  return `bus_${routeId}`;
}

async function notifySubscribers(io, route, stop, message) {
  const key = `${route._id}:${stop._id || stop.stopName}`;
  const last = geofenceCooldown.get(key) || 0;
  if (Date.now() - last < GEOFENCE_COOLDOWN_MS) return;
  geofenceCooldown.set(key, Date.now());

  const recipients = await User.find({
    role: { $in: ["student", "parent"] },
    "settings.notifications.inApp": { $ne: false },
  })
    .select("_id")
    .limit(200)
    .lean();

  for (const u of recipients) {
    try {
      const notification = await Notification.create({
        recipient: u._id,
        type: "transport",
        message,
      });
      if (io) {
        io.to(`user_${u._id.toString()}`).emit("newNotification", notification);
      }
    } catch {
      /* ignore per-user failures */
    }
  }
}

/**
 * Persist telemetry, update route snapshot, emit socket events, fire geofence.
 */
export async function ingestBusTelemetry(_app, io, payload, userId) {
  const {
    routeId,
    lat,
    lng,
    speedKmh = 0,
    heading,
    accuracyM,
    recordedAt,
  } = payload;

  if (!routeId || typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("routeId, lat, and lng are required");
  }

  const route = await BusRoute.findById(routeId);
  if (!route) throw new Error("Bus route not found");

  const nearest = nearestStop(lat, lng, route.stops || []);
  const deviation = isRouteDeviated(
    lat,
    lng,
    route.stops || [],
    route.corridorRadiusM || 800
  );
  const eta = nearest
    ? etaMinutes(nearest.distanceM, speedKmh)
    : undefined;

  const sample = await BusTelemetry.create({
    route: route._id,
    busNumber: route.busNumber,
    lat,
    lng,
    speedKmh,
    heading,
    accuracyM,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    publishedBy: userId || undefined,
    routeDeviation: deviation,
    nearestStopName: nearest?.stop?.stopName,
    nearestStopDistanceM: nearest?.distanceM,
    etaMinutesToNextStop: eta,
  });

  route.lastKnownLocation = {
    lat,
    lng,
    speedKmh,
    heading,
    recordedAt: sample.recordedAt,
    routeDeviation: deviation,
    etaMinutesToNextStop: eta,
    nearestStopName: nearest?.stop?.stopName,
  };
  if (deviation && route.status === "active") {
    route.status = "delayed";
  }
  await route.save();

  const locationPayload = {
    routeId: route._id.toString(),
    busNumber: route.busNumber,
    routeName: route.routeName,
    lat,
    lng,
    speedKmh,
    heading,
    recordedAt: sample.recordedAt,
    routeDeviation: deviation,
    nearestStopName: nearest?.stop?.stopName,
    nearestStopDistanceM: nearest?.distanceM,
    etaMinutesToNextStop: eta,
  };

  if (io) {
    io.to(roomName(route._id.toString())).emit("bus:location", locationPayload);
    if (deviation) {
      io.to(roomName(route._id.toString())).emit("bus:deviation", {
        routeId: route._id.toString(),
        message: `Bus ${route.busNumber} appears off-route`,
        lat,
        lng,
      });
    }
  }

  const inside = stopsInsideGeofence(lat, lng, route.stops || []);
  for (const stop of inside) {
    const dist = nearestStop(lat, lng, [stop])?.distanceM ?? 0;
    const msg = `Bus ${route.busNumber} is within ${Math.round(dist)} m of ${stop.stopName} (≤ ${stop.radiusM || 1000} m geo-fence)`;
    if (io) {
      io.to(roomName(route._id.toString())).emit("bus:geofence", {
        routeId: route._id.toString(),
        stopId: stop._id?.toString(),
        stopName: stop.stopName,
        event: "approaching",
        distanceM: dist,
        etaMinutes: etaMinutes(dist, speedKmh),
        message: msg,
      });
    }
    await notifySubscribers(io, route, stop, msg);
  }

  return locationPayload;
}

/**
 * Socket module for live GPS bus tracking (#706).
 */
export function initializeGpsTrackingSockets(io) {
  io.on("connection", (socket) => {
    socket.on("bus:subscribe", ({ routeId }) => {
      if (!routeId || typeof routeId !== "string") return;
      socket.join(roomName(routeId));
      socket.emit("bus:subscribed", { routeId, room: roomName(routeId) });
    });

    socket.on("bus:unsubscribe", ({ routeId }) => {
      if (!routeId) return;
      socket.leave(roomName(routeId));
    });

    socket.on("bus:publish", async (payload, ack) => {
      try {
        const role = (socket.user?.role || "").toLowerCase();
        if (!["hod", "admin", "teacher", "staff", "driver"].includes(role)) {
          throw new Error("Not authorized to publish bus GPS");
        }
        const app = socket.request?.app;
        // Fallback: get app via io.engine / stored ref — use global from first emit
        const result = await ingestBusTelemetry(
          null,
          io,
          payload,
          socket.user?.id || socket.user?._id
        );
        if (typeof ack === "function") ack({ success: true, data: result });
      } catch (err) {
        if (typeof ack === "function") {
          ack({ success: false, message: err.message });
        }
      }
    });
  });
}
