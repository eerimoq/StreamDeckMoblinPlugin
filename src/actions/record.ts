import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { setRecord } from "../moblin";

@action({ UUID: "com.eerimoq.moblin.record" })
export class Record extends SingletonAction {
	private recording = false;

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		this.recording = !this.recording;
		setRecord(this.recording);
	}
}
