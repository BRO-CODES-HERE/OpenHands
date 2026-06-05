import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionStore } from "../src/index.js";
import fs from "fs/promises";
import path from "path";

describe("SessionStore", () => {
  const tempDir = path.join(process.cwd(), "test-temp-sessions");

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should create, save, get, list, and delete sessions", async () => {
    const store = new SessionStore(tempDir);

    // Create session
    const session = await store.createSession("First Chat");
    expect(session.id).toBeDefined();
    expect(session.title).toBe("First Chat");
    expect(session.messages).toEqual([]);

    // Get session
    const fetched = await store.getSession(session.id);
    expect(fetched).toEqual(session);

    // Update session
    session.messages.push({ role: "user", content: "hello" });
    await store.saveSession(session);

    const updated = await store.getSession(session.id);
    expect(updated?.messages).toEqual([{ role: "user", content: "hello" }]);

    // List sessions
    const sessions = await store.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(session.id);

    // Delete session
    await store.deleteSession(session.id);
    const deleted = await store.getSession(session.id);
    expect(deleted).toBeNull();
  });

  it("should sort listed sessions by update timestamp descending", async () => {
    const store = new SessionStore(tempDir);

    const sessA = await store.createSession("Session A");
    // wait a small amount to guarantee timestamp divergence
    await new Promise((r) => setTimeout(r, 10));
    const sessB = await store.createSession("Session B");

    const list = await store.listSessions();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe(sessB.id); // B is newer than A
    expect(list[1].id).toBe(sessA.id);
  });
});
