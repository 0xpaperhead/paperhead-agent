import { ServerResponse } from "http";
import { handleError, parseJsonBody, sendJsonResponse } from "../server/helpers.js";
import { AuthenticatedRequest } from "../types/server.js";
import { Socket } from 'net';

function tcpPing(host: string, port = 443, timeout = 2000): Promise<number> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const socket = new Socket();
        
        // Set timeout
        socket.setTimeout(timeout);

        // Handle successful connection
        socket.connect(port, host, () => {
            const endTime = Date.now();
            socket.destroy();
            resolve(endTime - startTime);
        });

        // Handle errors
        socket.on('error', (err) => {
            socket.destroy();
            reject(err);
        });

        // Handle timeout
        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error(`TCP ping timeout on port ${port}`));
        });
    });
}

async function measureLatency(host: string, attempts = 3): Promise<{ avgTime: number, times: number[] }> {
    const times: number[] = [];
    const ports = [443, 80, 22]; // Try HTTPS, HTTP, and SSH ports
    
    for (let i = 0; i < attempts; i++) {
        let succeeded = false;
        
        // Try each port until one succeeds
        for (const port of ports) {
            try {
                const time = await tcpPing(host, port);
                times.push(time);
                succeeded = true;
                break; // Exit port loop if successful
            } catch (error) {
                console.error(`Attempt ${i + 1} on port ${port} failed:`, error);
            }
        }

        if (!succeeded) {
            console.error(`All ports failed for attempt ${i + 1}`);
        }

        // Small delay between attempts
        if (i < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    if (times.length === 0) {
        throw new Error('All ping attempts failed on all ports');
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    return { avgTime, times };
}

export async function handlePing(req: AuthenticatedRequest, res: ServerResponse) {
    try {
        const body = await parseJsonBody(req) as { ip_address: string };

        if (!body.ip_address) {
            sendJsonResponse(res, 400, { error: 'Missing IP address in request body' });
            return;
        }

        // Basic IP address validation
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(body.ip_address)) {
            sendJsonResponse(res, 400, { error: 'Invalid IP address format' });
            return;
        }

        const result = await measureLatency(body.ip_address);

        sendJsonResponse(res, 200, {
            success: true,
            ip: body.ip_address,
            average_ping_ms: Math.round(result.avgTime),
            individual_times_ms: result.times,
            port_used: 443 // Add information about which port was used
        });

    } catch (error) {
        handleError(res, error);
    }
}