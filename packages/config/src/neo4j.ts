import './env';
import { z } from 'zod';

const schema = z.object({
	NEO4J_URI: z
		.string()
		.refine((v) => v.startsWith('neo4j://') || v.startsWith('bolt://'), {
			message: 'NEO4J_URI must start with neo4j:// or bolt://',
		})
		.default('neo4j://127.0.0.1:7687'),
	NEO4J_USERNAME: z.string().min(1, 'NEO4J_USERNAME is required'),
	NEO4J_PASSWORD: z.string().min(1, 'NEO4J_PASSWORD is required'),
});

const env = schema.parse(process.env);

export const neo4jConfig = {
	uri: env.NEO4J_URI,
	username: env.NEO4J_USERNAME,
	password: env.NEO4J_PASSWORD,
};
