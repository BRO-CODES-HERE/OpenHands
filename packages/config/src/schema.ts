// Use simple type definitions since typebox isn't available
export interface AppConfig {
  gateway: {
    port: number;
    host: string;
  };
  llm?: {
    provider: "openai" | "gemini" | "anthropic" | "deepseek" | "qwen" | "meta";
    openai?: {
      apiKey: string;
      model?: string;
      baseUrl?: string;
    };
    gemini?: {
      apiKey: string;
      model?: string;
    };
    anthropic?: {
      apiKey: string;
      model?: string;
    };
    deepseek?: {
      apiKey: string;
      model?: string;
      baseUrl?: string;
    };
    qwen?: {
      apiKey: string;
      model?: string;
      baseUrl?: string;
    };
    meta?: {
      apiKey?: string;
      model?: string;
      baseUrl?: string;
    };
  };
}

// Default configuration
export const DEFAULT_CONFIG: AppConfig = {
  gateway: {
    port: 18999,
    host: "127.0.0.1",
  },
};
