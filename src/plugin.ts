import streamDeck from "@elgato/streamdeck";

import { Record } from "./actions/record";
import { Stream } from "./actions/stream";
import { connectToMoblin, setMoblinUrl } from "./moblin";

type GlobalSettings = {
	url?: string;
};

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new Record());
streamDeck.actions.registerAction(new Stream());

streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
	setMoblinUrl(ev.settings.url);
});

streamDeck.connect().then(async () => {
	const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
	connectToMoblin(settings.url);
});
