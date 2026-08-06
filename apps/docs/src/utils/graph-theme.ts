import type { Theme } from './theme';

const node = { light: '#4466cc', dark: '#7f9bec' };
const background = { light: '#f6f6f6', dark: '#181818' };
const surface = { light: '#ffffff', dark: '#272727' };
const disabled = { light: '#c2c2c2', dark: '#585858' };

export const QUERY_GRAPH_THEME_COLORS = {
	light: {
		node: node.light,
		pictogram: '#ffffff',
		edge: '#bbbbbb',
		dimmedNode: '#e5e7eb',
		dimmedPictogram: '#f9fafb',
		dimmedEdge: '#eeeeee',
		dimmedLabel: '#cccccc',
		label: '#333333',
		background: background.light,
		surface: surface.light,
		shadow: '#000000',
	},
	dark: {
		node: node.dark,
		pictogram: '#181818',
		edge: '#585858',
		dimmedNode: '#383838',
		dimmedPictogram: '#272727',
		dimmedEdge: '#272727',
		dimmedLabel: '#585858',
		label: '#c2c2c2',
		background: background.dark,
		surface: surface.dark,
		shadow: '#000000',
	},
} satisfies Record<Theme, Record<string, string>>;

export const EXPLORE_GRAPH_THEME_COLORS = {
	light: {
		centerNode: '#f59e0b',
		mainNode: node.light,
		subNode: '#8899dd',
		edge: '#dddddd',
	},
	dark: {
		centerNode: '#f59e0b',
		mainNode: node.dark,
		subNode: '#4d5f9e',
		edge: '#383838',
	},
} satisfies Record<Theme, Record<string, string>>;

export const SCHEMA_GRAPH_THEME_COLORS = {
	light: {
		foreground: node.light,
		disabled: disabled.light,
		background: background.light,
	},
	dark: {
		foreground: node.dark,
		disabled: disabled.dark,
		background: background.dark,
	},
} satisfies Record<Theme, Record<string, string>>;
