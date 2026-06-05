import fs from "fs/promises";
import path from "path";
import { AppConfig, DEFAULT_CONFIG } from "./schema.js";

export async function loadConfig(configPath?: string): Promise<AppConfig> {
  const defaultPath = path.join(process.cwd(), "openhand.json");
  const targetPath = configPath || defaultPath;

  try {
    const data = await fs.readFile(targetPath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      throw new Error(`Failed to parse config file ${targetPath}: ${(err as Error).message}`);
    }

    // Basic validation
    try {
      const merged = { ...DEFAULT_CONFIG, ...(parsed as object) };
      // simple deep merge for gateway
      if ((parsed as any).gateway) {
          merged.gateway = { ...DEFAULT_CONFIG.gateway, ...(parsed as any).gateway };
      }
      // simple deep merge for llm
      if ((parsed as any).llm) {
          merged.llm = { ...DEFAULT_CONFIG.llm, ...(parsed as any).llm };
          if ((parsed as any).llm.openai) {
              merged.llm.openai = { ...(DEFAULT_CONFIG.llm?.openai), ...(parsed as any).llm.openai };
          }
          if ((parsed as any).llm.gemini) {
              merged.llm.gemini = { ...(DEFAULT_CONFIG.llm?.gemini), ...(parsed as any).llm.gemini };
          }
          if ((parsed as any).llm.anthropic) {
              merged.llm.anthropic = { ...(DEFAULT_CONFIG.llm?.anthropic), ...(parsed as any).llm.anthropic };
          }
          if ((parsed as any).llm.deepseek) {
              merged.llm.deepseek = { ...(DEFAULT_CONFIG.llm?.deepseek), ...(parsed as any).llm.deepseek };
          }
          if ((parsed as any).llm.qwen) {
              merged.llm.qwen = { ...(DEFAULT_CONFIG.llm?.qwen), ...(parsed as any).llm.qwen };
          }
          if ((parsed as any).llm.meta) {
              merged.llm.meta = { ...(DEFAULT_CONFIG.llm?.meta), ...(parsed as any).llm.meta };
          }
      }
      return merged as AppConfig;
    } catch (err) {
      throw new Error(`Invalid config format: ${(err as Error).message}`);
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // If default config doesn't exist, just use default
      if (!configPath) {
        return DEFAULT_CONFIG;
      }
      throw new Error(`Config file not found: ${targetPath}`);
    }
    throw err;
  }
}
