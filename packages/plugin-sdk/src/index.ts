import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { Tool, LLMProvider } from "@openhands/agent";

export interface OpenHandsPlugin {
  name: string;
  version: string;
  description?: string;
  init?: () => Promise<void>;
  getTools?: () => Tool[];
  getProviders?: () => Record<string, LLMProvider>;
}

export class PluginLoader {
  private plugins = new Map<string, OpenHandsPlugin>();

  public async loadPlugin(pluginPath: string): Promise<OpenHandsPlugin> {
    const resolvedPath = path.resolve(pluginPath);
    let entryPoint = resolvedPath;
    try {
      const pkgJsonPath = path.join(resolvedPath, "package.json");
      const pkgJsonData = await fs.readFile(pkgJsonPath, "utf-8");
      const pkg = JSON.parse(pkgJsonData);
      if (pkg.main) {
        entryPoint = path.join(resolvedPath, pkg.main);
      } else {
        entryPoint = path.join(resolvedPath, "src", "index.ts");
      }
    } catch {
      entryPoint = path.join(resolvedPath, "src", "index.ts");
    }

    const fileUrl = pathToFileURL(entryPoint).href;
    const module = await import(fileUrl);
    const plugin: OpenHandsPlugin = module.default || module.plugin || module;

    if (!plugin.name || !plugin.version) {
      throw new Error(`Invalid plugin at ${resolvedPath}: name and version are required`);
    }

    if (plugin.init) {
      await plugin.init();
    }

    this.plugins.set(plugin.name, plugin);
    return plugin;
  }

  public async loadDirectory(dirPath: string): Promise<OpenHandsPlugin[]> {
    const resolvedDir = path.resolve(dirPath);
    try {
      const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
      const loaded: OpenHandsPlugin[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(resolvedDir, entry.name);
          try {
            const plugin = await this.loadPlugin(pluginPath);
            loaded.push(plugin);
          } catch (err: any) {
            console.error(`Failed to load plugin from ${pluginPath}:`, err.message);
          }
        }
      }
      return loaded;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  public getPlugins(): OpenHandsPlugin[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(name: string): OpenHandsPlugin | undefined {
    return this.plugins.get(name);
  }

  public getAllTools(): Tool[] {
    const tools: Tool[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.getTools) {
        tools.push(...plugin.getTools());
      }
    }
    return tools;
  }

  public getAllProviders(): Record<string, LLMProvider> {
    const providers: Record<string, LLMProvider> = {};
    for (const plugin of this.plugins.values()) {
      if (plugin.getProviders) {
        Object.assign(providers, plugin.getProviders());
      }
    }
    return providers;
  }
}
