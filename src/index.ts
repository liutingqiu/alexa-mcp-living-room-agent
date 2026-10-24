/**
 * Start the MCP server.
 *
 *   node dist/index.js                 # contract adapter, port 8790
 *   PORT=9000 node dist/index.js
 *
 * With PARTNER_DEVICE_BASE_URL and PARTNER_DEVICE_TOKEN set, the HTTP adapter is
 * used instead and /health reports realDevices: true.
 */

import { selectAdapter } from "./devices.js";
import { LivingRoomMcpServer } from "./server/mcp_server.js";

async function main(): Promise<void> {
  const adapter = selectAdapter();
  const server = new LivingRoomMcpServer(adapter);
  const port = Number(process.env.PORT ?? 8790);
  const handle = await server.listen(port);
  console.log(
    JSON.stringify(
      { listening: "http://127.0.0.1:" + handle.port + "/mcp", adapter: adapter.name, realDevices: adapter.realDevices },
      null,
      2,
    ),
  );
  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
