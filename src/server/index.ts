/* eslint-disable no-console */
import { createServer, ServerResponse } from 'http';
import { Config } from '../libs/config.js';
import { authenticate, sendJsonResponse } from './helpers.js';
import { AuthenticatedRequest } from '../types/server.js';
import { handlePing } from '../handlers/handlePing.js';

// Request Router
async function handleRequest(req: AuthenticatedRequest, res: ServerResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Public endpoints
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200);
    res.end('pong');
    return;
  }

  if (req.method === 'POST' && req.url === '/ping') {
    await authenticate(req, res, () => handlePing(req, res));
    return;
  }


  sendJsonResponse(res, 404, { error: 'Not found' });
}
export function startServer(port: number = Config.server.port) {
  const server = createServer(handleRequest);
  let shuttingDown = false;

  // Graceful shutdown handler
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n${signal} received. Starting graceful shutdown...`);

    try {
      // Stop accepting new connections
      server.close(() => {
        console.log('HTTP server closed');
      });

      // Add any cleanup tasks here
      // For example:
      // - Close database connections
      // - Complete pending operations
      // - Save state if needed

      console.log('Cleanup completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Handle different termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT')); // Handles Ctrl+C
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  server.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
  });
}