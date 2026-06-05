import { describe, it, expect } from "vitest";
import path from "path";
import { PluginLoader } from "../src/index.js";

const extensionsDir = path.resolve(process.cwd(), "extensions");

describe("PluginLoader SDK", () => {
  it("should successfully load the system-info-plugin extension", async () => {
    const loader = new PluginLoader();
    const pluginPath = path.join(extensionsDir, "system-info-plugin");
    
    const plugin = await loader.loadPlugin(pluginPath);
    expect(plugin.name).toBe("system-info-plugin");
    expect(plugin.version).toBe("1.0.0");
    
    const tools = loader.getAllTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe("system_info");
    
    const res = await tools[0].execute({});
    const data = JSON.parse(res);
    expect(data.platform).toBeDefined();
    expect(data.cpus).toBeDefined();
  });

  it("should scan directory and load multiple plugins", async () => {
    const loader = new PluginLoader();
    const plugins = await loader.loadDirectory(extensionsDir);
    expect(plugins.length).toBeGreaterThanOrEqual(1);
    
    const systemPlugin = loader.getPlugin("system-info-plugin");
    expect(systemPlugin).toBeDefined();
    expect(systemPlugin?.version).toBe("1.0.0");
  });
});
