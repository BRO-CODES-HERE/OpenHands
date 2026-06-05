#!/usr/bin/env node
import { Command } from "commander";
import { GatewayClient } from "@openhands/gateway-protocol";
import { runSetup } from "./setup.js";

const program = new Command();

program
  .name("oh")
  .description("OpenHands CLI — connect to the gateway and run commands")
  .option("-s, --server <url>", "Gateway WebSocket URL", "ws://127.0.0.1:18999");

async function getClient(serverUrl: string): Promise<GatewayClient> {
  const client = new GatewayClient();
  try {
    const info = await client.connect(serverUrl);
    console.error(`Connected to gateway [id: ${info.connectionId}]`);
    return client;
  } catch (err) {
    console.error(`Failed to connect: ${err}`);
    process.exit(1);
  }
}

program
  .command("health")
  .description("Check gateway health status")
  .action(async () => {
    const server = program.opts().server;
    const client = await getClient(server);
    try {
      const result = await client.request("health");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`health failed: ${err}`);
    } finally {
      client.close();
    }
  });

program
  .command("ping")
  .description("Ping the gateway")
  .action(async () => {
    const server = program.opts().server;
    const client = await getClient(server);
    try {
      const result = await client.request("ping");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`ping failed: ${err}`);
    } finally {
      client.close();
    }
  });

program
  .command("listen")
  .description("Listen for broadcast events from the gateway")
  .option("-t, --timeout <ms>", "How long to listen (ms)", "30000")
  .action(async (options: { timeout: string }) => {
    const server = program.opts().server;
    const client = await getClient(server);
    const timeout = parseInt(options.timeout, 10);
    console.error(`Listening for events (${timeout}ms)...`);

    client.onEvent((event, payload) => {
      console.log(JSON.stringify({ event, payload }, null, 2));
    });

    await new Promise((resolve) => setTimeout(resolve, timeout));
    client.close();
    console.error("Done listening");
  });

program
  .command("setup")
  .description("Interactive wizard to set up LLM providers and configuration")
  .action(async () => {
    await runSetup();
  });

program.parse();
