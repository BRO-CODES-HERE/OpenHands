import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runSetup } from "../src/setup.js";
import * as p from "@clack/prompts";
import fs from "fs/promises";
import path from "path";

vi.mock("@clack/prompts", () => {
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    select: vi.fn(),
    text: vi.fn(),
    isCancel: vi.fn().mockReturnValue(false),
    cancel: vi.fn(),
    spinner: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn()
    })
  };
});

describe("CLI Interactive Setup Command", () => {
  const tempDir = path.join(process.cwd(), "test-temp-setup");

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("should interactively prompt and write config for OpenAI", async () => {
    const originalCwd = process.cwd;
    process.cwd = () => tempDir;

    // Mock prompt responses
    vi.mocked(p.select).mockResolvedValue("openai");
    vi.mocked(p.text)
      .mockResolvedValueOnce("sk-test-openai") // API Key
      .mockResolvedValueOnce("gpt-4-test")     // Model
      .mockResolvedValueOnce("https://api.test.openai.com/v1"); // Base URL

    await runSetup();

    expect(p.intro).toHaveBeenCalled();
    expect(p.select).toHaveBeenCalled();
    expect(p.text).toHaveBeenCalledTimes(3);
    expect(p.outro).toHaveBeenCalled();

    const configFilePath = path.join(tempDir, "openhand.json");
    const fileContent = await fs.readFile(configFilePath, "utf-8");
    const config = JSON.parse(fileContent);

    expect(config.llm).toBeDefined();
    expect(config.llm.provider).toBe("openai");
    expect(config.llm.openai.apiKey).toBe("sk-test-openai");
    expect(config.llm.openai.model).toBe("gpt-4-test");
    expect(config.llm.openai.baseUrl).toBe("https://api.test.openai.com/v1");

    process.cwd = originalCwd;
  });

  it("should merge with existing config", async () => {
    const originalCwd = process.cwd;
    process.cwd = () => tempDir;

    // Write existing config
    const configFilePath = path.join(tempDir, "openhand.json");
    await fs.writeFile(configFilePath, JSON.stringify({
      gateway: {
        host: "192.168.1.1",
        port: 1234
      }
    }));

    vi.mocked(p.select).mockResolvedValue("deepseek");
    vi.mocked(p.text)
      .mockResolvedValueOnce("sk-deepseek-key") // API Key
      .mockResolvedValueOnce("deepseek-chat")   // Model
      .mockResolvedValueOnce("https://api.deepseek.com"); // Base URL

    await runSetup();

    const fileContent = await fs.readFile(configFilePath, "utf-8");
    const config = JSON.parse(fileContent);

    expect(config.gateway).toBeDefined();
    expect(config.gateway.port).toBe(1234);
    expect(config.gateway.host).toBe("192.168.1.1");
    expect(config.llm).toBeDefined();
    expect(config.llm.provider).toBe("deepseek");
    expect(config.llm.deepseek.apiKey).toBe("sk-deepseek-key");
    expect(config.llm.deepseek.model).toBe("deepseek-chat");
    expect(config.llm.deepseek.baseUrl).toBe("https://api.deepseek.com");

    process.cwd = originalCwd;
  });
});
