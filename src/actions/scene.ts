import { action, KeyDownEvent, SendToPluginEvent } from "@elgato/streamdeck";
import { getSettings, setScene, MoblinAction } from "../moblin";

type SceneSettings = {
  sceneId?: string;
};

type DataSourceRequestPayload = {
  event?: string;
};

@action({ UUID: "com.eerimoq.moblin.scene" })
export class Scene extends MoblinAction<SceneSettings> {
  override async onMoblinKeyDown(ev: KeyDownEvent<SceneSettings>): Promise<void> {
    const sceneId = ev.payload.settings.sceneId;
    if (!sceneId) {
      return;
    }
    setScene(sceneId);
  }

  override onSendToPlugin(
    ev: SendToPluginEvent<DataSourceRequestPayload, SceneSettings>,
  ): Promise<void> | void {
    if (ev.payload?.event !== "scenes") {
      return;
    }
    getSettings();
  }
}
