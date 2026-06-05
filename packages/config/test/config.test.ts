import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/loader.js";
import { DEFAULT_CONFIG } from "../src/schema.js";
import fs from "fs/promises";
import path from "path";

describe("Config System", () => {
  const tempDir = path.join(process.cwd(), "test-temp-config");

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should load default config if no file exists and no path provided", async () => {
    // Mocking fs.readFile or running from an empty dir is easier
    const originalCwd = process.cwd;
    process.cwd = () => tempDir;

    const config = await loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);

    process.cwd = originalCwd;
  });

  it("should load and merge custom config", async () => {
    const customConfigPath = path.join(tempDir, "custom.json");
    await fs.writeFile(
      customConfigPath,
      JSON.stringify({
        gateway: {
          port: 9999,
        },
      })
    );

    const config = await loadConfig(customConfigPath);
    expect(config.gateway.port).toBe(9999);
    expect(config.gateway.host).toBe("127.0.0.1"); // Default host
  });

  it("should load and merge custom config with llm field", async () => {
    const customConfigPath = path.join(tempDir, "custom-llm.json");
    await fs.writeFile(
      customConfigPath,
      JSON.stringify({
        gateway: {
          port: 8888,
        },
        llm: {
          provider: "openai",
          openai: {
            apiKey: "sk-test-key",
            model: "gpt-4"
          }
        }
      })
    );

    const config = await loadConfig(customConfigPath);
    expect(config.gateway.port).toBe(8888);
    expect(config.llm).toBeDefined();
    expect(config.llm?.provider).toBe("openai");
    expect(config.llm?.openai?.apiKey).toBe("sk-test-key");
    expect(config.llm?.openai?.model).toBe("gpt-4");
  });

  it("should throw error for invalid JSON", async () => {
    const customConfigPath = path.join(tempDir, "invalid.json");
    await fs.writeFile(customConfigPath, "{ gateway: port: 9999 }"); // Invalid JSON

    await expect(loadConfig(customConfigPath)).rejects.toThrow("Failed to parse config file");
  });

  it("should throw error if specified config file is not found", async () => {
    const customConfigPath = path.join(tempDir, "nonexistent.json");
    await expect(loadConfig(customConfigPath)).rejects.toThrow("Config file not found");
  });
});
