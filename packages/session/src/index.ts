import fs from "fs/promises";
import path from "path";
import { Message } from "@openhands/agent";

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export class SessionStore {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = path.resolve(dataDir);
  }

  private async ensureDir() {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  private getFilePath(id: string): string {
    return path.join(this.dataDir, `${id}.json`);
  }

  public async createSession(title = "New Conversation"): Promise<Session> {
    await this.ensureDir();
    const id = crypto.randomUUID();
    const now = Date.now();
    const session: Session = {
      id,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
    await this.saveSession(session);
    return session;
  }

  public async getSession(id: string): Promise<Session | null> {
    await this.ensureDir();
    try {
      const filePath = this.getFilePath(id);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as Session;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  public async saveSession(session: Session): Promise<void> {
    await this.ensureDir();
    session.updatedAt = Date.now();
    const filePath = this.getFilePath(session.id);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf-8");
  }

  public async listSessions(): Promise<Session[]> {
    await this.ensureDir();
    try {
      const files = await fs.readdir(this.dataDir);
      const sessions: Session[] = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const id = path.basename(file, ".json");
          const sess = await this.getSession(id);
          if (sess) {
            sessions.push(sess);
          }
        }
      }
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  public async deleteSession(id: string): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(id);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }
}
