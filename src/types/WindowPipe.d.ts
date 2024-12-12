export default class WindowPipe {
    #private;
    timeout: number;
    beVerbose: boolean;
    onConnected: ((pipe: WindowPipe) => void) | null;
    onReceived: ((cmd: PipeReceivedCommand) => void) | null;
    onLog: ((logItem: LogItem) => void) | null;
    set targetOrigin(url: string);
    set targetWindow(window: Window);
    set authKey(key: string);
    get isConnected(): boolean;
    constructor(targetWindow?: Window, targetOrigin?: string, authKey?: string, timeout?: number);
    /**
     * Establishes pipe connection, and processed send queue;
     * */
    connect(): Promise<unknown>;
    /**
     * Sends message to targetWidow when connection established.
     * @param command - the command object.
     */
    send(command: PipeCommand): Promise<PipeResponse>;
    /**
     * Triggers pipe response on given requestId
     * @param requestId - the responded command requestId
     * @param data - the reponse data
     */
    respond(requestId: string, data?: any): void;
    /**
     * Deconstruct pipe and releases its resources.
     * */
    dispose(): void;
}
export interface PipeCommand {
    method: string;
    params?: Record<string, any>;
    requestId?: string | null;
    /**
     * time in miliseconds that command will wait for response. Use 0 to resolve immediately without waiting for response.
     */
    timeout?: number;
}
export declare class PipeReceivedCommand implements PipeCommand {
    #private;
    constructor(receivedData: PipeRequest, pipe: WindowPipe);
    get method(): string;
    get params(): Record<string, any>;
    get requestId(): string;
    respondWith(data?: any): void;
}
declare class PipeRequest {
    command: PipeCommand;
    requestId: string;
    responseResolve: (response: PipeResponse) => void;
    responseReject: (error: string) => void;
    promise: Promise<PipeResponse | undefined>;
    isSent?: boolean;
    isResponded?: boolean;
    isTimeouted?: boolean;
    willTimeoutOn?: Date;
    constructor(command: PipeCommand, pipe: WindowPipe);
}
export declare class PipeResponse {
    sourceRequestId: string;
    request: PipeRequest;
    constructor(request: PipeRequest);
    get data(): any;
}
export interface LogItem {
    message: string;
    severity?: "info" | "warning" | "error";
    data?: any;
}
export {};
