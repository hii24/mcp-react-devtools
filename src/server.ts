#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { AgentClient } from "./agent-client.js";

const port = Number(process.argv[process.argv.indexOf("--port") + 1]) || 9474;
const agent = new AgentClient(`ws://127.0.0.1:${port}`);

const server = new Server(
  { name: "mcp-react-devtools", version: "0.4.2" },
  { capabilities: { tools: {} } }
);

const tools = [
  {
    name: "react_tree",
    description: "Returns the full component tree of the running React app",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "react_inspect_component",
    description: "Get props, state, hooks, and source of a component by selector",
    inputSchema: {
      type: "object",
      properties: { selector: { type: "string" } },
      required: ["selector"],
    },
  },
  {
    name: "react_listen_render",
    description: "Subscribe to render events for N milliseconds",
    inputSchema: {
      type: "object",
      properties: { duration: { type: "number" } },
      required: ["duration"],
    },
  },
  {
    name: "react_get_state",
    description: "Read live state from a Redux/Zustand/MobX store",
    inputSchema: {
      type: "object",
      properties: { storeName: { type: "string" } },
    },
  },
  {
    name: "react_diff_state",
    description: "Compare app state at two timestamps and return delta",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
      required: ["from", "to"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await agent.invoke(name, args ?? {});
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`mcp-react-devtools v0.4.2 connected on agent ws://127.0.0.1:${port}`);
