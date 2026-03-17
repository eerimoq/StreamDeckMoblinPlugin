import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { onStateChange, setRecord } from "../moblin";

@action({ UUID: "com.eerimoq.moblin.record" })
export class Record extends SingletonAction {
	private recording = false;

	constructor() {
		super();
		onStateChange((state) => {
			if (state.recording !== undefined && state.recording !== this.recording) {
				this.recording = state.recording;
			}
		});
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		this.recording = !this.recording;
		setRecord(this.recording);
	}
}
