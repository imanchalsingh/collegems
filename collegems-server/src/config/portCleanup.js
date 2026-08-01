import { execSync } from "child_process";

/**
 * Checks if the configured port is already in use and terminates the conflicting process.
 * Works on Windows, macOS, and Linux.
 * @param {number|string} port - The port number to check and clean up.
 */
const freePort = (port) => {
  try {
    if (process.platform === "win32") {
      // Windows command
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", timeout: 2000 });
      const lines = output.trim().split("\n");
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const pid = parts[parts.length - 1]; // PID is the last column
        if (pid && pid !== "0") {
          execSync(`taskkill /PID ${pid} /F`, { timeout: 1000 });
          console.log(`Freed port ${port} (killed PID ${pid})`);
        }
      }
    } else {
      // macOS / Linux command
      const pid = execSync(`lsof -ti:${port}`, { encoding: "utf8", timeout: 2000 }).trim();
      if (pid) {
        execSync(`kill -9 ${pid}`, { timeout: 1000 });
        console.log(`Freed port ${port} (killed PID ${pid})`);
      }
    }
  } catch {
    // Port is free or no matching process found, safely ignore.
  }
};

export default freePort;