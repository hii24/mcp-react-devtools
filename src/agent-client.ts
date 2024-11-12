import WebSocket from "ws";
import { randomUUID } from "node:crypto";

export class AgentClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(private readonly url: string) {}

  private connect(): Promise<WebSocket> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve(this.ws);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      ws.on("open", () => {
        this.ws = ws;
        resolve(ws);
      });
      ws.on("error", reject);
      ws.on("message", (data) => this.handleMessage(data.toString()));
      ws.on("close", () => {
        this.ws = null;
        for (const { reject } of this.pending.values()) {
          reject(new Error("agent disconnected"));
        }
        this.pending.clear();
      });
    });
  }

  private handleMessage(raw: string): void {
    const { id, result, error } = JSON.parse(raw) as {
      id: string;
      result?: unknown;
      error?: string;
    };
    const handlers = this.pending.get(id);
    if (!handlers) return;
    this.pending.delete(id);
    if (error) handlers.reject(new Error(error));
    else handlers.resolve(result);
  }

  async invoke(tool: string, args: Record<string, unknown>): Promise<unknown> {
    const ws = await this.connect();
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, tool, args }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`agent call timed out: ${tool}`));
        }
      }, 5000);
    });
  }
}
