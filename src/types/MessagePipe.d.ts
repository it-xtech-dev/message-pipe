export default class MessagePipe {
    private _targetWindow;
    private _targetOrigin;
    private _authKey;
    private _isConnected;
    private _isConnecting;
    private _connectedStartedOn?;
    private _connectionTimer;
    private _connectionErrorStack;
    private _requestQueue;
    private _listener;
    timeout: number;
    beVerbose: boolean;
    onConnected: ((pipe: MessagePipe) => void) | null;
    onReceived: ((cmd: PipeReceivedCommand) => void) | null;
    onLog: ((logItem: LogItem) => void) | null;
    set targetOrigin(url: string);
    set targetWindow(window: Window);
    set authKey(key: string);
    private get _targetHost();
    constructor(targetWindow?: Window, targetOrigin?: string, authKey?: string, timeout?: number);
    /**
     * Handles new message arrival.
     * @param {any} event - the postMessage event object.
     */
    private _listenerInner;
    /**
     * Establishes pipe connection, and processed send queue;
     * */
    connect(): Promise<unknown>;
    /**
     * Sends message immediately to targetWindow.
     * @param {object} command - the command object.
     * */
    _sendNow(request: PipeRequest): void;
    /**
     * Sends message to targetWidow when connection established.
     * @param command - the command object.
     */
    send(command: PipeCommand): Promise<any>;
    /**
     * Triggers pipe response on given requestId
     * @param requestId - the responded command requestId
     * @param data - the reponse data
     */
    respond(requestId: string, data: any): void;
    private _processResponse;
    private _flushRequestQueue;
    private _logNow;
    /**
     * Releases pipe resources.
     * */
    dispose(): void;
}
export interface PipeCommand {
    method: string;
    params?: Record<string, any>;
    requestId?: string | null;
}
declare class PipeReceivedCommand implements PipeCommand {
    #private;
    constructor(receivedData: PipeRequest, pipe: MessagePipe);
    get method(): string;
    get params(): Record<string, any>;
    get requestId(): string;
    respondWith(data: any): void;
}
declare class PipeRequest {
    command: PipeCommand;
    requestId: string;
    responseResolve: (data: any) => void;
    responseReject: (error: Error) => void;
    promise: Promise<any>;
    isSent?: boolean;
    isResponded?: boolean;
    isTimeouted?: boolean;
    willTimeoutOn?: Date;
    constructor(command: PipeCommand, pipe: MessagePipe);
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
