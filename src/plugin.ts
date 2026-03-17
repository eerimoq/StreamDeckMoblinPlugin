import streamDeck from "@elgato/streamdeck";

import { Record } from "./actions/record";
import { Stream } from "./actions/stream";
import { connectToMoblin } from "./moblin";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new Record());
streamDeck.actions.registerAction(new Stream());
connectToMoblin();
streamDeck.connect();
