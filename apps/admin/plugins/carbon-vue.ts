import CarbonVue from '@carbon/vue';
import type { Plugin } from 'vue';

// The UMD bundle's plugin sits on `default`, which Vite's dep optimizer does not unwrap
const carbonVuePlugin: Plugin =
	'install' in CarbonVue
		? CarbonVue
		: (CarbonVue as unknown as { default: Plugin }).default;

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.vueApp.use(carbonVuePlugin);
});
