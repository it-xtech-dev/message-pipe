export default class MessagePipe {
  private _targetWindow: Window | null = null;
  private _targetOrigin: string | null = null;
  private _authKey: string | null = null;
  private _isConnected: boolean = false;
  private _isConnecting: boolean = false;
  private _connectedStartedOn?: Date;
  private _connectionTimer: number = 0;
  private _flushTimer: number = 0;
  private _connectionErrorStack: Error[] = [];
  private _requestQueue: Map<string, PipeRequest> = new Map();
  private _listener = (event: MessageEvent) => {
    this._listenerInner(event);
  };
  timeout: number;

  public beVerbose = false;
  public onConnected: ((pipe: MessagePipe) => void) | null = null;
  public onReceived: ((cmd: PipeReceivedCommand) => void) | null = null;
  public onLog: ((logItem: LogItem) => void) | null = null;

  public set targetOrigin(url: string) {
    if (this._isConnected || this._isConnecting) {
      throw new Error(
        "targetOrigin cannot be set while conneting or already connected."
      );
    }
    this._targetOrigin = url;
  }

  public set targetWindow(window: Window) {
    if (this._isConnected || this._isConnecting) {
      throw new Error(
        "targetWindow cannot be set while connectiong or already connected."
      );
    }
    this._targetWindow = window;
  }

  public set authKey(key: string) {
    if (this._isConnected || this._isConnecting) {
      throw new Error(
        "targetIdentity cannot be set while connectiong or already connected."
      );
    }
    this._authKey = key;
  }

  private get _targetHost() {
    const url = new URL(this._targetOrigin!);
    return `${url.protocol}//${url.host}`;
  }

  constructor(
    targetWindow?: Window,
    targetOrigin?: string,
    authKey?: string,
    timeout: number = 5000
  ) {
    if (targetWindow) this._targetWindow = targetWindow;
    if (targetOrigin) this._targetOrigin = targetOrigin;
    if (authKey) this._authKey = authKey;
    this.timeout = timeout;
  }

  /**
   * Handles new message arrival.
   * @param {any} event - the postMessage event object.
   */
  private _listenerInner(event: MessageEvent) {
    // verify message origin
    if (event.origin == this._targetHost) {
      let request: PipeRequest;
      try {
        request = JSON.parse(event.data) as PipeRequest;
      } catch {
        this._logNow({
          message: `Unparsable event data received from ${event.origin}`,
          severity: "warning",
          data: event.data,
        });
        return;
      }
      const cmd = request.command;
      this._logNow({
        message: `Message received! ${request.requestId} (${cmd.method})`,
        data: event,
      });
      if ([":>hello", ":>hi"].includes(cmd.method)) {
        // check authorization key (there can be more than one window that will attempt to write same channel in such case trusted sides can use authKey)
        if ((this._authKey || cmd.params?.authKey) && cmd.params?.authKey !== this._authKey) {
          this._logNow({
            message: `Handshake FAILED. Incomming authKey '${cmd.params?.authKey}' is different than expected '${this._authKey}'!' `,
          });
          return;
        }        
        // respond to 'hello' message        
        if (cmd.method === ":>hello") {
          const hiRequest = new PipeRequest(
            {
              method: ":>hi",
              params: {
                authKey: this._authKey,
              },
            },
            this
          );
          this._sendNow(hiRequest);
        }
        // CONNECTED!
        // when any message received set connected flag.
        this._isConnected = true;
        this._isConnecting = false;
        this._logNow({
          message: `Pipe ${window.location.href} received handshake form ${event.origin}`
        })
      } else {
        if (!this._isConnected) {
          this._logNow({
            message:
              "Received payload message before connection was established!",
            data: event,
          });
        } else if (cmd.method === ":>response") {
          this._processResponse(new PipeResponse(request));
        } else if (typeof this.onReceived === "function") {
          const received = new PipeReceivedCommand(request, this);
          // when non 'hello' message received process payload.
          this.onReceived(received);
        }
      }
    }
  }

  /**
   * Establishes pipe connection, and processed send queue;
   * */
  connect() {
    if (!this._targetOrigin)
      throw new Error("Cannot connect: please specify targetOrigin");
    if (!this._targetWindow)
      throw new Error("Cannot connect: please specify targetWindow");

    return new Promise((resolve, reject) => {
      const __raiseConnectionError = (errorMessage: string) => {
        // when time out reached, throw an exception;
        clearInterval(this._connectionTimer);
        this._isConnected = false;
        this._isConnecting = false;
        const log: LogItem = {
          message: errorMessage,
          severity: "error",
          data: {
            errorStack: this._connectionErrorStack,
          },
        };
        this._logNow(log);
        if (this.beVerbose) {
          console.error(log.message, log.data);
        }
        this.dispose();
        reject(errorMessage);
      };

      if (this._isConnected) __raiseConnectionError("Already connected");
      this._connectedStartedOn = new Date();
      this._isConnecting = true;
      window.addEventListener("message", this._listener, false);

      // awaits for window to be initialized by sending hello message
      this._connectionTimer = setInterval(() => {
        if (
          new Date().getTime() - this._connectedStartedOn!.getTime() >=
          this.timeout
        ) {
          // when time out reached, throw an exception;
          clearInterval(this._connectionTimer);
          this._isConnected = false;
          this._isConnecting = false;
          __raiseConnectionError(
            `Connection timeout! Target origin ('${this._targetOrigin}') did not responded with "hello" message.`
          );
        } else if (this._isConnected) {
          // CONNECTED!
          // when 'hello' message received from other side _isConnected flag will be set and connection process can be terminated.
          clearInterval(this._connectionTimer);

          // all queued messges will be processed now as connection is establised:
          this._requestQueue.forEach((request) => this._sendNow(request));

          // start request queue flush timer
          this._flushTimer = setInterval(() => this._flushRequestQueue(), 1000)

          // call connected callback
          if (this.onConnected) this.onConnected(this);

          // resolve connected promise
          resolve(true);
        } else {
          // send 'hello' message until other side hello received.
          try {
            // NOT FRAME SECNARIO ONLY:
            // When parent origin is different from specified targetOrigin DOM exception will occur in asyc manner when calling postMessage().
            // To detect this scenario and handle an error synchronously origin check is done before _sendNow can be executed.
            // Supressed error message: VM878:1 Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('http://some.domain') does not match the recipient window's origin ('https://some.domain1').
            if (window.top === window && this._targetWindow === window) {
              // when window is not embedded in iframe
              // and target window is not iframe (is same as window)
              __raiseConnectionError(
                "Window is expected to be nested inside iframe but is not"
              );
            }
            // send hellow message to pipe
            const helloRequest = new PipeRequest(
              {
                method: ":>hello",
                params: {
                  authKey: this._authKey,
                },
              },
              this
            );
            this._sendNow(helloRequest);
          } catch (error: unknown) {
            this._connectionErrorStack.push(error as Error);
            reject(error);
          }
        }
      }, 100);
    });
  }

  /**
   * Sends message immediately to targetWindow.
   * @param {object} command - the command object.
   * */
  private _sendNow(request: PipeRequest) {
    const payload = JSON.stringify(request);
    this._targetWindow?.postMessage(payload, this._targetOrigin!);
    request.isSent = true;
    this._logNow({
      message: `Sending message ${request.requestId} (${request.command.method})`,
      data: {
        payload,
      },
    });
  }

  /**
   * Sends message to targetWidow when connection established.
   * @param command - the command object.
   */
  send(command: PipeCommand) {
    if (!this._isConnected && !this._isConnecting) {
      const log: LogItem = {
        message:
          "Cannot send any message because pipe is not connected. Use .connect() method and check for expections.",
        severity: "error",
      };
      this._logNow(log);
      // throw because is not connected and not attemting to connect.
      return Promise.reject(log.message);
    }

    // push command to queue, that will be procesessed when connected.
    const request = new PipeRequest(command, this);
    this._requestQueue.set(request.requestId, request);

    if (this._isConnected) {
      // set command to connected pipe
      this._sendNow(request);
    }

    return request.promise;
  }

  /**
   * Triggers pipe response on given requestId
   * @param requestId - the responded command requestId
   * @param data - the reponse data
   */
  respond(requestId: string, data: any) {
    this.send({
      method: ":>response",
      params: {
        requestId,
        data,
      },
    });
  }

  private _processResponse(response: PipeResponse) {
    const sourceRequest = this._requestQueue.get(response.sourceRequestId);
    if (!sourceRequest)
      throw new Error(
        `An error occured while processing response '${response.request.requestId}'. Cannot find corresponding source request ${response.sourceRequestId}`
      );
    sourceRequest.responseResolve(response.data);
    sourceRequest.isResponded = true;
    this._flushRequestQueue();
  }

  private _flushRequestQueue() {
    // console.log(Array.from(this._requestQueue))
    if (this._requestQueue.size === 0) return
    this._requestQueue.forEach((r) => {
      const now = new Date();
      if (r.willTimeoutOn && r.willTimeoutOn <= now) {
        r.responseReject(`Request (${r.requestId}) response timeout reached!`)
        r.isTimeouted = true
      }
      if ((r.isSent && r.isResponded) || r.isTimeouted)
        this._requestQueue.delete(r.requestId);
    });
  }

  private _logNow(logItem: LogItem) {
    if (!logItem.severity) logItem.severity = "info";
    if (this.onLog) this.onLog(logItem);
  }

  /**
   * Deconstruct pipe and releases its resources.
   * */
  dispose() {
    clearInterval(this._connectionTimer);
    clearInterval(this._flushTimer);
    window.removeEventListener("message", this._listener, false);
    this._connectionErrorStack = [];
    this._targetWindow = null;
    this._requestQueue.clear();
  }
}

export interface PipeCommand {
  method: string;
  params?: Record<string, any>;
  requestId?: string | null;
  timeout?: number;
}

class PipeReceivedCommand implements PipeCommand {
  #receivedData: PipeRequest;
  #pipe: MessagePipe;

  constructor(receivedData: PipeRequest, pipe: MessagePipe) {
    this.#receivedData = receivedData;
    this.#pipe = pipe;
  }

  get method() {
    return this.#receivedData.command.method;
  }

  get params() {
    return this.#receivedData.command.params;
  }

  get requestId() {
    return this.#receivedData.requestId;
  }

  respondWith(data: any) {
    this.#pipe.respond(this.requestId, data);
  }
}

class PipeRequest {
  command: PipeCommand;
  requestId: string = getRequestId();
  responseResolve: (data: any) => void = () => {};
  responseReject: (error: string) => void = () => {};
  promise: Promise<any>;
  isSent?: boolean;
  isResponded?: boolean;
  isTimeouted?: boolean;
  willTimeoutOn?: Date;

  constructor(command: PipeCommand, pipe: MessagePipe) {
    this.command = command;
    if (command.timeout === 0) {
      // when requestId in command is set to null it is assumed that request does not awaits for response so it should be marked as responded immediatly and resolved
      this.isResponded = true;
      this.willTimeoutOn = undefined;
      this.promise = Promise.resolve();
      return;
    }
    this.willTimeoutOn = new Date(new Date().getTime() + (command.timeout ?? pipe.timeout));
    // use command level defined id or autogenerate when not specified
    this.requestId = command.requestId ?? getRequestId();
    this.promise = new Promise((resolve, reject) => {
      this.responseResolve = resolve;
      this.responseReject = reject;
    });
  }
}

export class PipeResponse {
  sourceRequestId: string;
  request: PipeRequest;

  constructor(request: PipeRequest) {
    this.sourceRequestId = request.command.params?.requestId;
    this.request = request;
  }

  get data() {
    return this.request.command.params?.data
  }
}

export interface LogItem {
  message: string;
  severity?: "info" | "warning" | "error";
  data?: any;
}

function getRequestId() {
  return Math.random().toString(36).substring(2, 8);
}
