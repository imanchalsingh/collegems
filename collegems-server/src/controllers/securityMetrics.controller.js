import {
  getSecurityMetrics,
  unbanIp,
  isIpBanned,
} from "../middlewares/dynamicRateLimiter.js";

export const getRateLimitMetrics = async (req, res) => {
  try {
    const metrics = getSecurityMetrics();
    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error("Error fetching security metrics:", error);
    res.status(500).json({ success: false, message: "Failed to load security metrics" });
  }
};

export const unbanIpAddress = async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip || typeof ip !== "string") {
      return res.status(400).json({ success: false, message: "ip is required" });
    }
    if (!isIpBanned(ip.trim())) {
      return res.status(404).json({ success: false, message: "IP is not currently banned" });
    }
    unbanIp(ip.trim());
    res.json({ success: true, message: `Unbanned ${ip.trim()}` });
  } catch (error) {
    console.error("Error unbanning IP:", error);
    res.status(500).json({ success: false, message: "Failed to unban IP" });
  }
};
