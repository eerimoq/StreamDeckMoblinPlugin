import { action, KeyDownEvent } from "@elgato/streamdeck";
import { onStateChange, setStream, MoblinAction } from "../moblin";

@action({ UUID: "com.eerimoq.moblin.stream" })
export class Stream extends MoblinAction {
  private streaming = false;

  constructor() {
    super();
    onStateChange((state) => {
      if (state.streaming !== undefined && state.streaming !== this.streaming) {
        this.streaming = state.streaming;
      }
    });
  }

  override async onMoblinKeyDown(ev: KeyDownEvent): Promise<void> {
    this.streaming = !this.streaming;
    setStream(this.streaming);
  }
}
