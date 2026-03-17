import streamDeck from "@elgato/streamdeck";
import WebSocket from "ws";

const DEFAULT_WS_URL = "ws://localhost:81";
const RECONNECT_INTERVAL_MS = 5000;

let ws: WebSocket | null = null;
let requestId = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentWsUrl: string = DEFAULT_WS_URL;

export type StateListener = (state: { 
	recording?: boolean,
	streaming?: boolean
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
	if (ws !== null) {
		return;
	}
	streamDeck.logger.info(`Connecting to Moblin at ${currentWsUrl}`);
	const socket = new WebSocket(currentWsUrl);
	socket.on("open", () => {
		streamDeck.logger.info("Connected to Moblin");
	});
	socket.on("message", (data) => {
		handleMessage(data);
	});
	socket.on("close", () => {
		streamDeck.logger.info("Disconnected from Moblin");
		ws = null;
		scheduleReconnect();
	});
	socket.on("error", (error) => {
		streamDeck.logger.error(`Moblin WebSocket error: ${error.message}`);
		socket.close();
	});
	ws = socket;
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

export function connectToMoblin(url?: string): void {
	if (url !== undefined && url !== "") {
		currentWsUrl = url;
	}
	connect();
}

export function setMoblinUrl(url?: string): void {
	const newUrl = url ?? DEFAULT_WS_URL;
	if (newUrl === currentWsUrl) {
		return;
	}
	currentWsUrl = newUrl;
	streamDeck.logger.info(`Moblin URL changed to ${currentWsUrl}`);
	if (reconnectTimer !== null) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
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
