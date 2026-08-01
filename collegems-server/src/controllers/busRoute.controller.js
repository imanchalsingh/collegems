import BusRoute from "../models/BusRoute.model.js";
import BusTelemetry from "../models/BusTelemetry.model.js";
import { ingestBusTelemetry } from "../socket/gpsTrackingSocket.js";

export const getAllBusRoutes = async (req, res) => {
  try {
    const routes = await BusRoute.find().sort({ routeName: 1 });
    res.json(routes);
  } catch (error) {
    console.error("Get all bus routes error:", error);
    res.status(500).json({ message: "Failed to fetch bus routes" });
  }
};

export const getBusRouteById = async (req, res) => {
  try {
    const route = await BusRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Bus route not found" });
    }
    res.json(route);
  } catch (error) {
    console.error("Get bus route by ID error:", error);
    res.status(500).json({ message: "Failed to fetch bus route" });
  }
};

export const createBusRoute = async (req, res) => {
  try {
    const {
      routeName,
      busNumber,
      driverName,
      driverPhone,
      stops,
      schedule,
      status,
      remarks,
      corridorRadiusM,
    } = req.body;

    if (!routeName || !busNumber) {
      return res
        .status(400)
        .json({ message: "Route name and Bus number are required" });
    }

    const route = await BusRoute.create({
      routeName,
      busNumber,
      driverName,
      driverPhone,
      stops: stops || [],
      schedule: schedule || [],
      status: status || "active",
      remarks,
      corridorRadiusM,
    });

    res.status(201).json(route);
  } catch (error) {
    console.error("Create bus route error:", error);
    res.status(500).json({ message: "Failed to create bus route" });
  }
};

export const updateBusRoute = async (req, res) => {
  try {
    const {
      routeName,
      busNumber,
      driverName,
      driverPhone,
      stops,
      schedule,
      status,
      remarks,
      corridorRadiusM,
    } = req.body;

    const route = await BusRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Bus route not found" });
    }

    if (routeName) route.routeName = routeName;
    if (busNumber) route.busNumber = busNumber;
    if (driverName !== undefined) route.driverName = driverName;
    if (driverPhone !== undefined) route.driverPhone = driverPhone;
    if (stops !== undefined) route.stops = stops;
    if (schedule !== undefined) route.schedule = schedule;
    if (status) route.status = status;
    if (remarks !== undefined) route.remarks = remarks;
    if (corridorRadiusM !== undefined) route.corridorRadiusM = corridorRadiusM;

    await route.save();
    res.json(route);
  } catch (error) {
    console.error("Update bus route error:", error);
    res.status(500).json({ message: "Failed to update bus route" });
  }
};

export const deleteBusRoute = async (req, res) => {
  try {
    const route = await BusRoute.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Bus route not found" });
    }
    res.json({ message: "Bus route deleted successfully" });
  } catch (error) {
    console.error("Delete bus route error:", error);
    res.status(500).json({ message: "Failed to delete bus route" });
  }
};

/** POST /api/bus-routes/:id/telemetry */
export const publishTelemetry = async (req, res) => {
  try {
    const io = req.app.get("io");
    const data = await ingestBusTelemetry(
      req.app,
      io,
      {
        routeId: req.params.id,
        lat: req.body.lat,
        lng: req.body.lng,
        speedKmh: req.body.speedKmh ?? req.body.speed,
        heading: req.body.heading,
        accuracyM: req.body.accuracyM,
        recordedAt: req.body.recordedAt,
      },
      req.user?.id
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Publish telemetry error:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to publish telemetry" });
  }
};

/** GET /api/bus-routes/:id/telemetry/latest */
export const getLatestTelemetry = async (req, res) => {
  try {
    const route = await BusRoute.findById(req.params.id).lean();
    if (!route) {
      return res.status(404).json({ message: "Bus route not found" });
    }

    const latest = await BusTelemetry.findOne({ route: req.params.id })
      .sort({ recordedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        route: {
          _id: route._id,
          routeName: route.routeName,
          busNumber: route.busNumber,
          stops: route.stops,
          status: route.status,
          corridorRadiusM: route.corridorRadiusM,
        },
        lastKnownLocation: route.lastKnownLocation || null,
        latestSample: latest || null,
      },
    });
  } catch (error) {
    console.error("Get latest telemetry error:", error);
    res.status(500).json({ message: "Failed to fetch telemetry" });
  }
};

/** GET /api/bus-routes/:id/telemetry/history */
export const getTelemetryHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 60, 300);
    const samples = await BusTelemetry.find({ route: req.params.id })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: samples.reverse() });
  } catch (error) {
    console.error("Get telemetry history error:", error);
    res.status(500).json({ message: "Failed to fetch history" });
  }
};

/** POST /api/bus-routes/:id/telemetry/simulate — HOD demo GPS ticks */
export const simulateTelemetry = async (req, res) => {
  try {
    const route = await BusRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Bus route not found" });
    }

    const stopsWithCoords = (route.stops || []).filter(
      (s) => typeof s.lat === "number" && typeof s.lng === "number"
    );

    let lat = req.body.lat;
    let lng = req.body.lng;

    if (typeof lat !== "number" || typeof lng !== "number") {
      if (route.lastKnownLocation?.lat != null) {
        lat = route.lastKnownLocation.lat + (Math.random() - 0.4) * 0.002;
        lng = route.lastKnownLocation.lng + (Math.random() - 0.4) * 0.002;
      } else if (stopsWithCoords.length) {
        const idx = Math.floor(Math.random() * stopsWithCoords.length);
        lat = stopsWithCoords[idx].lat + (Math.random() - 0.5) * 0.001;
        lng = stopsWithCoords[idx].lng + (Math.random() - 0.5) * 0.001;
      } else {
        lat = 12.9716 + (Math.random() - 0.5) * 0.01;
        lng = 77.5946 + (Math.random() - 0.5) * 0.01;
      }
    }

    const io = req.app.get("io");
    const data = await ingestBusTelemetry(
      req.app,
      io,
      {
        routeId: route._id.toString(),
        lat,
        lng,
        speedKmh: req.body.speedKmh ?? 20 + Math.random() * 25,
        heading: req.body.heading ?? Math.floor(Math.random() * 360),
      },
      req.user?.id
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Simulate telemetry error:", error);
    res.status(400).json({ message: error.message || "Simulation failed" });
  }
};
