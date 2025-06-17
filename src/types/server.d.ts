import { IncomingMessage } from "http";

export interface AuthenticatedRequest extends IncomingMessage {
    user?: {
        iss: string;
        exp: number;
    };
}

export interface Payload {
    iss: string;
    exp: number;
}