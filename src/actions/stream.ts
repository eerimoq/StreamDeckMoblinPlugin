import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { onStateChange, setStream } from "../moblin";
import streamDeck from "@elgato/streamdeck";

@action({ UUID: "com.eerimoq.moblin.stream" })
export class Stream extends SingletonAction {
	private streaming = false;

	constructor() {
		super();
		onStateChange((state) => {
			if (state.streaming !== undefined && state.streaming !== this.streaming) {
				this.streaming = state.streaming;
			}
		});
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		this.streaming = !this.streaming;
		streamDeck.logger.info(`button down ${this.streaming}`);
		setStream(this.streaming);
	}
}
