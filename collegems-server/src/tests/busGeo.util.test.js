import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  distanceMeters,
  etaMinutes,
  isRouteDeviated,
  nearestStop,
  stopsInsideGeofence,
} from "../utils/busGeo.util.js";

describe("busGeo.util", () => {
  it("computes zero distance for same point", () => {
    assert.ok(distanceMeters(12.97, 77.59, 12.97, 77.59) < 1);
  });

  it("estimates ETA minutes", () => {
    const eta = etaMinutes(1000, 30); // 1 km at 30 km/h ≈ 2 min
    assert.equal(eta, 2);
  });

  it("finds nearest stop and geofence membership", () => {
    const stops = [
      { stopName: "A", arrivalTime: "08:00", lat: 12.97, lng: 77.59, radiusM: 1000 },
      { stopName: "B", arrivalTime: "08:20", lat: 13.0, lng: 77.6, radiusM: 500 },
    ];
    const n = nearestStop(12.971, 77.591, stops);
    assert.equal(n.stop.stopName, "A");
    const inside = stopsInsideGeofence(12.971, 77.591, stops);
    assert.ok(inside.some((s) => s.stopName === "A"));
  });

  it("flags route deviation when far from all stops", () => {
    const stops = [
      { stopName: "A", arrivalTime: "08:00", lat: 12.97, lng: 77.59, radiusM: 1000 },
    ];
    assert.equal(isRouteDeviated(13.1, 77.8, stops, 800), true);
    assert.equal(isRouteDeviated(12.9705, 77.5905, stops, 800), false);
  });
});
