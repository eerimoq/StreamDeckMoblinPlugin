import { action, KeyDownEvent } from "@elgato/streamdeck";
import { triggerReaction, MoblinAction } from "../moblin";

type ReactionSettings = {
  reactionName?: string;
};

@action({ UUID: "com.eerimoq.moblin.reaction" })
export class Reaction extends MoblinAction<ReactionSettings> {
  override async onMoblinKeyDown(ev: KeyDownEvent<ReactionSettings>): Promise<void> {
    const reactionName = ev.payload.settings.reactionName;
    if (!reactionName) {
      return;
    }
    triggerReaction(reactionName);
  }
}
