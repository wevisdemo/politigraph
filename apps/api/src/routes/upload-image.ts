import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { Elysia, t } from 'elysia';
import { transform } from 'imgkit';
import { getJwtToken } from '../utils/auth';

const UPLOAD_BASE_DIR = 'uploads';
const MAX_FILE_SIZE = '10m';

const isWithinBaseDir = (target: string, allowBaseItself = false) => {
	const relativePath = relative(resolve(UPLOAD_BASE_DIR), target);
	return (
		(allowBaseItself || relativePath !== '') &&
		relativePath !== '..' &&
		!relativePath.startsWith(`..${sep}`) &&
		!isAbsolute(relativePath)
	);
};

export const upload = (origin: string) =>
	new Elysia().post(
		'/upload-image',
		async ({ body, set }) => {
			const { file, filename: customFilename, path: customPath } = body;

			const filename = customFilename || file.name;
			if (!filename) {
				set.status = 400;
				return 'No filename provided';
			}

			if (filename.includes('/') || filename.includes('\\')) {
				set.status = 400;
				return 'Invalid filename';
			}

			const uploadPath = customPath
				? resolve(UPLOAD_BASE_DIR, customPath)
				: resolve(UPLOAD_BASE_DIR);
			const outputFilename = `${filename}.webp`;
			const filePath = resolve(uploadPath, outputFilename);

			if (!isWithinBaseDir(uploadPath, true) || !isWithinBaseDir(filePath)) {
				set.status = 400;
				return 'Invalid upload path';
			}

			const inputBuffer = Buffer.from(await file.arrayBuffer());
			const outputBuffer = await transform(inputBuffer, {
				output: { format: 'webp', webp: { quality: 90 } },
			});

			await mkdir(uploadPath, { recursive: true });
			await writeFile(filePath, outputBuffer);

			return outputFilename;
		},
		{
			body: t.Object({
				file: t.File({ format: 'image/*', maxSize: MAX_FILE_SIZE }),
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
