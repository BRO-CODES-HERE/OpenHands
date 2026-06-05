import * as p from "@clack/prompts";
import fs from "fs/promises";
import path from "path";

export async function runSetup() {
  p.intro("OpenHands Configuration Setup");

  try {
    const provider = await p.select({
      message: "Select your LLM Provider",
      options: [
        { value: "openai", label: "OpenAI", hint: "gpt-4o / gpt-3.5-turbo" },
        { value: "gemini", label: "Google (Gemini)", hint: "gemini-2.0-flash-exp" },
        { value: "anthropic", label: "Anthropic (Claude)", hint: "claude-3-5-sonnet-latest" },
        { value: "deepseek", label: "DeepSeek", hint: "deepseek-chat" },
        { value: "qwen", label: "Qwen", hint: "qwen-turbo" },
        { value: "meta", label: "Meta (Llama / Ollama)", hint: "llama3 (local/custom)" }
      ]
    });

    if (p.isCancel(provider)) {
      p.cancel("Setup cancelled.");
      return;
    }

    let defaultModel = "";
    let defaultBaseUrl = "";

    switch (provider) {
      case "openai":
        defaultModel = "gpt-4o";
        defaultBaseUrl = "https://api.openai.com/v1";
        break;
      case "gemini":
        defaultModel = "gemini-2.0-flash-exp";
        break;
      case "anthropic":
        defaultModel = "claude-3-5-sonnet-latest";
        break;
      case "deepseek":
        defaultModel = "deepseek-chat";
        defaultBaseUrl = "https://api.deepseek.com";
        break;
      case "qwen":
        defaultModel = "qwen-turbo";
        defaultBaseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        break;
      case "meta":
        defaultModel = "llama3";
        defaultBaseUrl = "http://localhost:11434/v1";
        break;
    }

    const apiKey = await p.text({
      message: `Enter API Key for ${provider}`,
      placeholder: provider === "meta" ? "optional" : "sk-...",
      validate(value) {
        if (provider !== "meta" && !value.trim()) {
          return "API Key is required";
        }
      }
    });

    if (p.isCancel(apiKey)) {
      p.cancel("Setup cancelled.");
      return;
    }

    const model = await p.text({
      message: "Enter model name",
      placeholder: defaultModel,
      initialValue: defaultModel
    });

    if (p.isCancel(model)) {
      p.cancel("Setup cancelled.");
      return;
    }

    let baseUrl: string | undefined = undefined;
    if (defaultBaseUrl) {
      const baseUrlInput = await p.text({
        message: "Enter Base URL",
        placeholder: defaultBaseUrl,
        initialValue: defaultBaseUrl
      });

      if (p.isCancel(baseUrlInput)) {
        p.cancel("Setup cancelled.");
        return;
      }
      baseUrl = baseUrlInput.trim() || defaultBaseUrl;
    }

    const s = p.spinner();
    s.start("Saving configuration...");

    // Load existing openhand.json if it exists
    const configPath = path.join(process.cwd(), "openhand.json");
    let currentConfig: any = {};
    try {
      const data = await fs.readFile(configPath, "utf-8");
      currentConfig = JSON.parse(data);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        s.stop("Failed to read config file");
        throw err;
      }
    }

    // Prepare LLM configuration block
    const llmBlock: any = {
      provider,
      [provider]: {
        apiKey: apiKey.trim(),
        model: model.trim()
      }
    };

    if (baseUrl) {
      llmBlock[provider].baseUrl = baseUrl;
    }

    // Merge new config
    const updatedConfig = {
      ...currentConfig,
      llm: llmBlock
    };

    // Write file back
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), "utf-8");
    s.stop("Configuration saved!");

    p.outro(`Successfully updated configuration in openhand.json!`);

  } catch (err: any) {
    p.cancel(`Error during setup: ${err.message}`);
  }
}
