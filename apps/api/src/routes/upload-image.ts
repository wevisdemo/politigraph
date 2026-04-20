import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Elysia, t } from 'elysia';
import { getJwtToken } from '../utils/auth';

const UPLOAD_BASE_DIR = 'uploads';

export const upload = (origin: string) =>
	new Elysia().post(
		'/upload-image',
		async ({ body, set }) => {
			const { file, filename: customFilename, path: customPath } = body;

			const uploadPath = customPath
				? join(UPLOAD_BASE_DIR, customPath)
				: UPLOAD_BASE_DIR;

			await mkdir(uploadPath, { recursive: true });

			const filename = customFilename || file.name;
			if (!filename) {
				set.status = 400;
				return 'No filename provided';
			}

			const filePath = join(uploadPath, filename);
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			await writeFile(filePath, buffer);

			return filename;
		},
		{
			body: t.Object({
				file: t.File({ format: 'image/*' }),
				filename: t.Optional(t.String({ minLength: 1 })),
				path: t.Optional(t.String()),
			}),
			beforeHandle: async ({ request, set }) => {
				const authResult = await getJwtToken(request.headers, origin);
				if (!authResult) {
					set.status = 401;
					return 'Unauthorized';
				}
			},
		},
	);
