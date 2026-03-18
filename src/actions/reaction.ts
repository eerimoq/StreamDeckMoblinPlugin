import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { triggerReaction } from "../moblin";

type ReactionSettings = {
  reactionName?: string;
};

@action({ UUID: "com.eerimoq.moblin.reaction" })
export class Reaction extends SingletonAction<ReactionSettings> {
  override async onKeyDown(ev: KeyDownEvent<ReactionSettings>): Promise<void> {
    const reactionName = ev.payload.settings.reactionName;
    if (!reactionName) {
      return;
    }
    triggerReaction(reactionName);
  }
}
