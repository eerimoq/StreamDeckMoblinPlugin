import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { onStateChange, setFilter } from "../moblin";

type FilterSettings = {
	filterName?: string;
};

@action({ UUID: "com.eerimoq.moblin.filter" })
export class Filter extends SingletonAction<FilterSettings> {
	private filters: Record<string, boolean> = {};

	constructor() {
		super();
		onStateChange((state) => {
			if (state.filters !== undefined) {
				this.filters = state.filters;
			}
		});
	}

	override async onKeyDown(ev: KeyDownEvent<FilterSettings>): Promise<void> {
		const filterName = ev.payload.settings.filterName;
		if (!filterName) return;
		const currentState = this.filters[filterName] ?? false;
		const newState = !currentState;
		this.filters[filterName] = newState;
		setFilter(filterName, newState);
	}
}
