import streamDeck, { KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import WebSocket from "ws";
import { JsonObject } from "@elgato/utils";

type PropertyInspectorPayload = {
  event?: string;
};

export type MoblinState = {
  recording?: boolean;
  streaming?: boolean;
  filters?: Array<any>;
};

export type StateListener = (state: MoblinState) => void;

const DEFAULT_HTTP_URL = "http://localhost";
const RECONNECT_INTERVAL_MS = 5000;
const CONNECTION_STATUS_CONNECTING = "Connecting to Moblin...";
const CONNECTION_STATUS_CONNECTED = "Connected to Moblin";

let ws: WebSocket | null = null;
let requestId = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let currentWsUrl: string | null = null;
let connectionStatus = CONNECTION_STATUS_CONNECTING;
const stateListeners: StateListener[] = [];

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

function setConnectionStatus(status: string): void {
  connectionStatus = status;
  sendConnectionStatus();
}

function sendConnectionStatus(): void {
  streamDeck.ui.sendToPropertyInspector({
    event: "connectionStatus",
    value: connectionStatus,
  });
}

async function handleMessage(data: WebSocket.Data): Promise<void> {
  try {
    const message = JSON.parse(data.toString());
    const event = message?.event?.data;
    if (event) {
      handleMessageEvent(event);
    }
    const response = message?.response?.data;
    if (response) {
      await handleMessageResponse(response);
    }
  } catch (error) {
    streamDeck.logger.error(`Failed to handle Moblin message: ${error}`);
  }
}

function handleMessageEvent(event: any): void {
  if (event.state?.data) {
    const state: MoblinState = event.state.data;
    for (const stateListener of stateListeners) {
      stateListener(state);
    }
  }
}

async function handleMessageResponse(response: any): Promise<void> {
  if (response.getSettings?.data?.scenes) {
    await streamDeck.ui.sendToPropertyInspector({
      event: "scenes",
      items: toDataSourceItems(response.getSettings.data.scenes),
    });
  }
}

async function connect(): Promise<void> {
  if (ws !== null || !currentWsUrl) {
    return;
  }
  setConnectionStatus(CONNECTION_STATUS_CONNECTING);
  const socket = new WebSocket(currentWsUrl);
  socket.on("open", async () => {
    setConnectionStatus(CONNECTION_STATUS_CONNECTED);
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
  setConnectionStatus(CONNECTION_STATUS_CONNECTING);
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
    return;
  }
  const message = {
    request: {
      id: requestId++,
      data: data,
    },
  };
  ws.send(JSON.stringify(message));
}

function isConnected(): boolean {
  return ws?.readyState == WebSocket.OPEN;
}

streamDeck.ui.onSendToPlugin<PropertyInspectorPayload>((ev) => {
  const payload = ev.payload;
  if (!payload) {
    return;
  }
  if (payload.event === "requestConnectionStatus") {
    sendConnectionStatus();
  }
});

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

export function getSettings(): void {
  sendRequest({ getSettings: {} });
}

export function setRecord(on: boolean): void {
  sendRequest({ setRecord: { on } });
}

export function setStream(on: boolean): void {
  sendRequest({ setStream: { on } });
}

export function setScene(id: string): void {
  sendRequest({ setScene: { id } });
}

export function setFilter(filter: string, on: boolean): void {
  sendRequest({ setFilter: { filter: { [filter]: {} }, on } });
}

export function triggerReaction(reaction: string): void {
  sendRequest({ triggerReaction: { reaction: { [reaction]: {} } } });
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

export function onStateChange(listener: StateListener): void {
  stateListeners.push(listener);
}
