import streamDeck from "@elgato/streamdeck";
import WebSocket from "ws";

const MOBLIN_WS_URL = "ws://localhost:80";
const RECONNECT_INTERVAL_MS = 5000;

let ws: WebSocket | null = null;
let requestId = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect(): void {
	if (ws !== null) {
		return;
	}

	streamDeck.logger.info(`Connecting to Moblin at ${MOBLIN_WS_URL}`);

	const socket = new WebSocket(MOBLIN_WS_URL);

	socket.on("open", () => {
		streamDeck.logger.info("Connected to Moblin");
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

export function connectToMoblin(): void {
	connect();
}

export function setRecord(on: boolean): void {
	sendRequest({ setRecord: { on } });
}
