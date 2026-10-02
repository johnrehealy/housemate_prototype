import { createServer, type Server } from "node:http";

/**
 * GET /health for the host's checks (Fly, in step 8): 200 while the job loop
 * is turning over, 503 once it has stalled. Anything else is a 404.
 */
export function startHealthServer(
  port: number,
  isHealthy: () => boolean,
): Server {
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      const ok = isHealthy();
      response.writeHead(ok ? 200 : 503, {
        "Content-Type": "application/json",
      });
      response.end(JSON.stringify({ ok }));
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(port);
  return server;
}
