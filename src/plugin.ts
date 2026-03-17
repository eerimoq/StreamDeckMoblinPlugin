import streamDeck from "@elgato/streamdeck";

import { Record } from "./actions/record";

streamDeck.logger.setLevel("trace");
streamDeck.actions.registerAction(new Record());
streamDeck.connect();
