/* eslint-disable @typescript-eslint/no-explicit-any */
// Helper to parse JSON body from request
import { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken"; // Ensure you have jsonwebtoken installed
import { AuthenticatedRequest, Payload } from "../types/server.js";
import { Config } from "../config/index.js";

export async function createJwt(iss?: string): Promise<string> {
  const payloadData = {
    iss: iss || "paperheadInt",
    exp: new Date().getTime() + 60000, // 1 minute expiration
  };
  return new Promise((resolve, reject) => {
    jwt.sign(payloadData, Config.server.apiKey, (err, token) => {
      if (err) {
        reject(err);
      } else {
        resolve(token as string);
      }
    });
  });
}

export async function verifyJwt(token: string): Promise<Payload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, Config.server.apiKey, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as Payload);
      }
    });
  });
}

export async function authenticate(
  req: AuthenticatedRequest,

  res: ServerResponse,
  next: () => Promise<void>,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    handleError(res, new Error("Missing or invalid authorization header"), 401);
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verifyJwt(token);
    if (!payload.iss) {
      handleError(res, new Error("Invalid token payload"), 401);
      return;
    }

    req.user = payload;
    await next();
  } catch (error) {
    handleError(res, new Error("Invalid auth token"), 401);
  }
}

export async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

// Helper to send JSON response
export function sendJsonResponse(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Helper to handle errors
export function handleError(res: ServerResponse, error: any, status: number = 500) {
  return sendJsonResponse(res, status, {
    success: false,
    error: {
      source: "internal",
      code: "00000",
      message: error.message || "Internal server error",
      function: "server/helpers",
    },
  });
}
