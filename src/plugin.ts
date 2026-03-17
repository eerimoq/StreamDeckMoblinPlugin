import streamDeck from "@elgato/streamdeck";

import { Record } from "./actions/record";
import { connectToMoblin } from "./moblin";

streamDeck.logger.setLevel("trace");
streamDeck.actions.registerAction(new Record());
connectToMoblin();
streamDeck.connect();
