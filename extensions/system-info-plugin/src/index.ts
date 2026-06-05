import { Tool } from "@openhands/agent";
import os from "os";

const systemInfoTool: Tool = {
  name: "system_info",
  description: "Get current system resource and environment details (CPU, OS, uptime, free memory).",
  parameters: {
    type: "object",
    properties: {}
  },
  execute: async () => {
    return JSON.stringify({
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      uptime: `${(os.uptime() / 60 / 60).toFixed(2)} hours`
    }, null, 2);
  }
};

const plugin = {
  name: "system-info-plugin",
  version: "1.0.0",
  description: "Provides system information tools",
  getTools() {
    return [systemInfoTool];
  }
};

export default plugin;
