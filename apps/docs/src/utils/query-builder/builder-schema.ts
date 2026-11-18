import sdl from '@politigraph/graphql/dist/schema.graphql?raw';
import { toBuilderSchema } from './schema';

export const builderSchema = toBuilderSchema(sdl);
