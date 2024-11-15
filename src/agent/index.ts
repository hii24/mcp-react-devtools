/**
 * In-app agent that exposes React fiber data over a localhost WebSocket.
 * The MCP server connects to this agent to read the running app's state.
 */

interface AgentOptions {
  port?: number;
  enableInProduction?: boolean;
}

export function installAgent(options: AgentOptions = {}): void {
  const { port = 9474, enableInProduction = false } = options;

  if (typeof window === "undefined") {
    throw new Error("mcp-react-devtools agent must run in a browser context");
  }

  if (process.env.NODE_ENV === "production" && !enableInProduction) {
    console.warn(
      "[mcp-react-devtools] refusing to install in production. Pass `enableInProduction: true` to override."
    );
    return;
  }

  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    console.warn(
      "[mcp-react-devtools] refusing to install on non-localhost host. Agent is dev-only."
    );
    return;
  }

  const ws = new WebSocket(`ws://127.0.0.1:${port}`);

  ws.addEventListener("message", async (event) => {
    const { id, tool, args } = JSON.parse(event.data);
    try {
      const result = await dispatch(tool, args);
      ws.send(JSON.stringify({ id, result }));
    } catch (error) {
      ws.send(JSON.stringify({ id, error: (error as Error).message }));
    }
  });

  ws.addEventListener("open", () => {
    console.log(`[mcp-react-devtools] agent connected on :${port}`);
  });
}

async function dispatch(tool: string, args: Record<string, unknown>) {
  switch (tool) {
    case "react_tree":
      return readFiberTree();
    case "react_inspect_component":
      return inspectComponent(String(args.selector));
    case "react_listen_render":
      return listenRender(Number(args.duration));
    case "react_get_state":
      return getStoreState(args.storeName ? String(args.storeName) : undefined);
    case "react_diff_state":
      return diffState(String(args.from), String(args.to));
    default:
      throw new Error(`unknown tool: ${tool}`);
  }
}

// Implementations omitted for brevity — see src/agent/inspector.ts
declare function readFiberTree(): unknown;
declare function inspectComponent(selector: string): unknown;
declare function listenRender(duration: number): unknown;
declare function getStoreState(name?: string): unknown;
declare function diffState(from: string, to: string): unknown;
