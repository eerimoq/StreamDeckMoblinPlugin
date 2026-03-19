import streamDeck, { KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import WebSocket from "ws";
import { GlobalSettings } from "./plugin";
import { JsonObject } from "@elgato/utils";

const DEFAULT_HTTP_URL = "http://localhost";
const RECONNECT_INTERVAL_MS = 5000;

let ws: WebSocket | null = null;
let requestId = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentWsUrl: string | null = toWebSocketUrl(DEFAULT_HTTP_URL);

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

export function onStateChange(listener: StateListener): void {
  stateListeners.push(listener);
}

function handleMessage(data: WebSocket.Data): void {
  try {
    const message = JSON.parse(data.toString());
    const event = message?.event?.data;
    if (event?.state?.data) {
      const state = event.state.data;
      for (const listener of stateListeners) {
        listener(state);
      }
    }
  } catch (error) {
    streamDeck.logger.error(`Failed to parse Moblin message: ${error}`);
  }
}

function connect(): void {
  if (ws !== null || currentWsUrl === null) {
    return;
  }
  streamDeck.logger.info(`Connecting to Moblin at ${currentWsUrl}`);
  updateConnected();
  const socket = new WebSocket(currentWsUrl);
  socket.on("open", () => {
    streamDeck.logger.info("Connected to Moblin");
    updateConnected();
  });
  socket.on("message", (data) => {
    handleMessage(data);
  });
  socket.on("close", () => {
    streamDeck.logger.info("Disconnected from Moblin");
    updateConnected();
    ws = null;
    scheduleReconnect();
  });
  socket.on("error", (error) => {
    streamDeck.logger.error(`Moblin WebSocket error: ${error.message}`);
    updateConnected();
    socket.close();
  });
  ws = socket;
}

async function updateConnected() {
  const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  if (ws?.readyState == WebSocket.OPEN) {
    settings.connectionStatus = "Connected to Moblin";
  } else {
    settings.connectionStatus = "Connecting to Moblin...";
  }
  await streamDeck.settings.setGlobalSettings(settings);
}

function scheduleReconnect(): void {
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
  ws.send(JSON.stringify(message));
}

function isConnected(): boolean {
  return ws?.readyState == WebSocket.OPEN;
}

export function connectToMoblin(url?: string): void {
  const newWsUrl = toWebSocketUrl(url);
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
