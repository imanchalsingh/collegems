import BusRoute from "../models/BusRoute.model.js";

// Get all bus routes
export const getAllBusRoutes = async (req, res) => {
  try {
    const routes = await BusRoute.find().sort({ routeName: 1 });
    res.json(routes);
  } catch (error) {
    console.error("Get all bus routes error:", error);
    res.status(500).json({ message: "Failed to fetch bus routes" });
  }
};

// Get specific bus route by ID
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

// Create a new bus route
export const createBusRoute = async (req, res) => {
  try {
    const { routeName, busNumber, driverName, driverPhone, stops, schedule, status, remarks } = req.body;

    if (!routeName || !busNumber) {
      return res.status(400).json({ message: "Route name and Bus number are required" });
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
    });

    res.status(201).json(route);
  } catch (error) {
    console.error("Create bus route error:", error);
    res.status(500).json({ message: "Failed to create bus route" });
  }
};

// Update a bus route
export const updateBusRoute = async (req, res) => {
  try {
    const { routeName, busNumber, driverName, driverPhone, stops, schedule, status, remarks } = req.body;

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

    await route.save();
    res.json(route);
  } catch (error) {
    console.error("Update bus route error:", error);
    res.status(500).json({ message: "Failed to update bus route" });
  }
};

// Delete a bus route
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
