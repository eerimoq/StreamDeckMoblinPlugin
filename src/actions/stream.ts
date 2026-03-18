import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { onStateChange, setStream } from "../moblin";

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
    setStream(this.streaming);
  }
}
