import streamDeck, { KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import WebSocket from "ws";
import { JsonObject } from "@elgato/utils";

const DEFAULT_HTTP_URL = "http://localhost";
const RECONNECT_INTERVAL_MS = 5000;

let ws: WebSocket | null = null;
let requestId = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentWsUrl: string | null = null;
let connectionStatus = "Connecting to Moblin...";

type PropertyInspectorPayload = {
  event?: string;
};

function toWebSocketUrl(url?: string): string | null {
  let httpUrl = url?.trim();
  if (!httpUrl) {
    httpUrl = DEFAULT_HTTP_URL;
  }
  try {
    let parsedUrl = new URL(httpUrl);
    switch (parsedUrl.protocol) {
      case "http:":
        parsedUrl.protocol = "ws:";
        break;
      case "https:":
        parsedUrl.protocol = "wss:";
        break;
      default:
        return null;
    }
    let httpPort: number;
    if (parsedUrl.port) {
      httpPort = parseInt(parsedUrl.port);
    } else {
      if (parsedUrl.protocol == "ws:") {
        httpPort = 80;
      } else {
        httpPort = 443;
      }
    }
    parsedUrl.port = (httpPort + 1).toString();
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export type StateListener = (state: {
  recording?: boolean;
  streaming?: boolean;
  filters?: Array<any>;
}) => void;
const stateListeners: StateListener[] = [];

function toDataSourceItems(scenes: Array<any>): any[] {
  const items: any[] = [
    {
      label: "Select a scene...",
      value: "",
    },
  ];
  for (const scene of scenes) {
    items.push({
      label: scene.name,
      value: scene.id,
    });
  }
  return items;
}

export function onStateChange(listener: StateListener): void {
  stateListeners.push(listener);
}

/*streamDeck.ui.onDidAppear(() => {
  void sendConnectionStatus();
});*/

streamDeck.ui.onSendToPlugin<PropertyInspectorPayload>((ev) => {
  if (ev.payload?.event !== "requestConnectionStatus") {
    return;
  }
  sendConnectionStatus();
});

function setConnectionStatus(status: string): void {
  connectionStatus = status;
  sendConnectionStatus();
}

function sendConnectionStatus(): Promise<void> {
  return streamDeck.ui.sendToPropertyInspector({
    event: "connectionStatus",
    value: connectionStatus,
  });
}

async function handleMessage(data: WebSocket.Data): Promise<void> {
  try {
    const message = JSON.parse(data.toString());
    const event = message?.event?.data;
    if (event?.state?.data) {
      const state = event.state.data;
      for (const listener of stateListeners) {
        listener(state);
      }
    }
    const response = message?.response?.data;
    if (response?.getSettings?.data?.scenes) {
      await streamDeck.ui.sendToPropertyInspector({
        event: "scenes",
        items: toDataSourceItems(response.getSettings.data.scenes),
      });
    }
  } catch (error) {
    streamDeck.logger.error(`Failed to parse Moblin message: ${error}`);
  }
}

async function connect(): Promise<void> {
  if (ws !== null || !currentWsUrl) {
    return;
  }
  setConnectionStatus("Connecting to Moblin...");
  const socket = new WebSocket(currentWsUrl);
  socket.on("open", async () => {
    setConnectionStatus("Connected to Moblin");
    getSettings();
  });
  socket.on("message", async (data) => {
    await handleMessage(data);
  });
  socket.on("close", async () => {
    ws = null;
    scheduleReconnect();
  });
  socket.on("error", () => {
    socket.close();
  });
  ws = socket;
}

function scheduleReconnect(): void {
  setConnectionStatus("Connecting to Moblin...");
  if (reconnectTimer !== null) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_INTERVAL_MS);
}

function sendRequest(data: object): void {
  if (ws === null || ws.readyState !== WebSocket.OPEN) {
    streamDeck.logger.warn("Cannot send request: not connected to Moblin");
    return;
  }
  const message = {
    request: {
      id: requestId++,
      data: data,
    },
  };
  streamDeck.logger.info(`Sending request ${JSON.stringify(message)}`);
  ws.send(JSON.stringify(message));
}

function isConnected(): boolean {
  return ws?.readyState == WebSocket.OPEN;
}

export function connectToMoblin(url?: string): void {
  let newWsUrl = toWebSocketUrl(url);
  if (newWsUrl === currentWsUrl) {
    return;
  }
  currentWsUrl = newWsUrl;
  if (ws !== null) {
    ws.close();
  } else {
    connect();
  }
}

export function setRecord(on: boolean): void {
  sendRequest({ setRecord: { on } });
}

export function setStream(on: boolean): void {
  sendRequest({ setStream: { on } });
}

export function setFilter(filter: string, on: boolean): void {
  sendRequest({ setFilter: { filter: { [filter]: {} }, on } });
}

export function triggerReaction(reaction: string): void {
  sendRequest({ triggerReaction: { reaction: { [reaction]: {} } } });
}

export function getSettings(): void {
  sendRequest({ getSettings: {} });
}

export function setScene(id: string): void {
  sendRequest({ setScene: { id } });
}

export abstract class MoblinAction<T extends JsonObject = JsonObject> extends SingletonAction<T> {
  override async onKeyDown(ev: KeyDownEvent<T>): Promise<void> {
    if (!isConnected()) {
      await ev.action.showAlert();
      return;
    }
    await this.onMoblinKeyDown(ev);
  }

  onMoblinKeyDown(_ev: KeyDownEvent<T>): Promise<void> | void {}
}
