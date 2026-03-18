import streamDeck from "@elgato/streamdeck";

import { Stream } from "./actions/stream";
import { Record } from "./actions/record";
import { Filter } from "./actions/filter";
import { connectToMoblin } from "./moblin";

type GlobalSettings = {
  url?: string;
};

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new Stream());
streamDeck.actions.registerAction(new Record());
streamDeck.actions.registerAction(new Filter());

streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
  connectToMoblin(ev.settings.url);
});

streamDeck.connect().then(async () => {
  const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  connectToMoblin(settings.url);
});
