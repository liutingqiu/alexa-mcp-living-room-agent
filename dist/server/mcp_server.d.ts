/**
 * MCP server over Streamable HTTP (single endpoint, JSON-RPC 2.0 body, JSON or
 * SSE response). Implements initialize, tools/list, tools/call and ping.
 *
 * Nothing here fabricates device data: every tool call goes through the
 * orchestrator into a DeviceAdapter, and the adapter reports whether it is a
 * real vendor API or the local contract stand-in.
 */
import { DeviceAdapter } from "../devices.js";
import { Orchestrator } from "../orchestrator.js";
export declare const SERVER_INFO: {
    name: string;
    version: string;
};
export declare const TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            deviceId: {
                type: string;
            };
            title?: undefined;
            message?: undefined;
            kind?: undefined;
            payload?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            deviceId: {
                type: string;
            };
            title: {
                type: string;
            };
            message: {
                type: string;
            };
            kind?: undefined;
            payload?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            deviceId: {
                type: string;
            };
            kind: {
                type: string;
                enum: string[];
            };
            payload: {
                type: string;
            };
            title?: undefined;
            message?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            deviceId?: undefined;
            title?: undefined;
            message?: undefined;
            kind?: undefined;
            payload?: undefined;
        };
        required?: undefined;
    };
})[];
interface JsonRpcRequest {
    jsonrpc: "2.0";
    id?: string | number | null;
    method: string;
    params?: Record<string, unknown>;
}
export declare class LivingRoomMcpServer {
    readonly adapter: DeviceAdapter;
    readonly orchestrator: Orchestrator;
    constructor(adapter: DeviceAdapter);
    private callTool;
    handle(request: JsonRpcRequest): Promise<Record<string, unknown> | null>;
    listen(port: number): Promise<{
        close: () => Promise<void>;
        port: number;
    }>;
    private route;
}
export {};
