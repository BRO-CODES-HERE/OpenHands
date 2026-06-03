// Use simple type definitions since typebox isn't available
export interface AppConfig {
  gateway: {
    port: number;
    host: string;
  };
}

// Default configuration
export const DEFAULT_CONFIG: AppConfig = {
  gateway: {
    port: 18999,
    host: "127.0.0.1",
  },
};
