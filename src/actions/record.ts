import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

@action({ UUID: "com.eerimoq.moblin.record" })
export class Record extends SingletonAction<CounterSettings> {
	override onWillAppear(ev: WillAppearEvent<CounterSettings>): void | Promise<void> {
		const { settings } = ev.payload;
		settings.count ??= 1;
		settings.incrementBy ??= 1;
		return ev.action.setTitle(`${settings.count}`);
	}

	override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
		const { settings } = ev.payload;
		settings.count ??= 1;
		settings.incrementBy ??= 1;
		if (settings.count > 255) {
			settings.count = 1;
		} else {
			settings.count = settings.count * 2;
		}
		await ev.action.setSettings(settings);
		await ev.action.setTitle(`${settings.count}`);
	}
}

type CounterSettings = {
	count?: number;
	incrementBy?: number;
};
