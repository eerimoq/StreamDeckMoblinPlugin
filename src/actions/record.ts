import { action, KeyDownEvent } from "@elgato/streamdeck";
import { onStateChange, setRecord, MoblinAction } from "../moblin";

@action({ UUID: "com.eerimoq.moblin.record" })
export class Record extends MoblinAction {
  private recording = false;

  constructor() {
    super();
    onStateChange((state) => {
      if (state.recording !== undefined && state.recording !== this.recording) {
        this.recording = state.recording;
      }
    });
  }

  override async onMoblinKeyDown(ev: KeyDownEvent): Promise<void> {
    this.recording = !this.recording;
    setRecord(this.recording);
  }
}
