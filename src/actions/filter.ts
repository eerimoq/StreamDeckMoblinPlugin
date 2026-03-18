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
        for (let i = 0; i < state.filters.length; i += 2) {
          let filterName: string = Object.keys(state.filters[i])[0];
          let on: boolean = state.filters[i + 1];
          this.filters[filterName] = on;
        }
      }
    });
  }

  override async onKeyDown(ev: KeyDownEvent<FilterSettings>): Promise<void> {
    const filterName = ev.payload.settings.filterName;
    if (!filterName) {
      return;
    }
    const on = !(this.filters[filterName] ?? false);
    this.filters[filterName] = on;
    setFilter(filterName, on);
  }
}
