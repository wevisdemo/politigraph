/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const mockGetJwtToken = mock(() => {});
mock.module('../../src/utils/auth', () => ({
	getJwtToken: mockGetJwtToken,
}));

const mockTransform = mock(() => {});
mock.module('imgkit', () => ({
	transform: mockTransform,
}));

const { upload } = await import('../../src/routes/upload-image');

const ORIGIN = 'http://localhost:3000';
// Use a test-specific subdirectory to avoid deleting .gitkeep
const TEST_SUBDIR = '__test_cleanup';
const UPLOAD_DIR = `uploads/${TEST_SUBDIR}`;

describe('upload-image route', () => {
	beforeEach(() => {
		mockGetJwtToken.mockReset();
		mockTransform.mockReset();
	});

	afterEach(async () => {
		if (existsSync(UPLOAD_DIR)) {
			await rm(UPLOAD_DIR, { recursive: true, force: true });
		}
	});

	test('rejects upload when unauthenticated', async () => {
		(mockGetJwtToken as any).mockResolvedValue(null);

		const app = upload(ORIGIN);

		const file = new File(['test content'], 'test.png', { type: 'image/png' });
		const formData = new FormData();
		formData.append('file', file);
		formData.append('path', TEST_SUBDIR);

		const response = await app.handle(
			new Request(`${ORIGIN}/upload-image`, {
				method: 'POST',
				body: formData,
			}),
		);

		expect(response.status).toBe(401);
		const text = await response.text();
		expect(text).toBe('Unauthorized');
	});

	test('accepts upload when authenticated and calls transform with correct options', async () => {
		const tokenData = { token: 'jwt-token' };
		(mockGetJwtToken as any).mockResolvedValue(tokenData);

		const outputBuffer = Buffer.from('webp-image-data');
		(mockTransform as any).mockResolvedValue(outputBuffer);

		const app = upload(ORIGIN);

		const fileContent = Buffer.from('test image content');
		const file = new File([fileContent], 'test.png', { type: 'image/png' });
		const formData = new FormData();
		formData.append('file', file);
		formData.append('path', TEST_SUBDIR);

		const response = await app.handle(
			new Request(`${ORIGIN}/upload-image`, {
				method: 'POST',
				body: formData,
			}),
		);

		expect(response.status).toBe(200);
		const filename = await response.text();
		expect(filename).toBe('test.png.webp');

		expect(mockTransform).toHaveBeenCalledTimes(1);
		expect(mockTransform).toHaveBeenCalledWith(expect.any(Buffer), {
			output: { format: 'webp', webp: { quality: 90 } },
		});

		const filePath = join(UPLOAD_DIR, 'test.png.webp');
		expect(existsSync(filePath)).toBe(true);
		const writtenContent = await readFile(filePath);
		expect(writtenContent).toEqual(outputBuffer);
	});

	test('uses custom filename when provided', async () => {
		(mockGetJwtToken as any).mockResolvedValue({ token: 'jwt-token' });

		const outputBuffer = Buffer.from('webp-image-data');
		(mockTransform as any).mockResolvedValue(outputBuffer);

		const app = upload(ORIGIN);

		const file = new File(['test'], 'original.png', { type: 'image/png' });
		const formData = new FormData();
		formData.append('file', file);
		formData.append('filename', 'custom-name');
		formData.append('path', TEST_SUBDIR);

		const response = await app.handle(
			new Request(`${ORIGIN}/upload-image`, {
				method: 'POST',
				body: formData,
			}),
		);

		expect(response.status).toBe(200);
		const filename = await response.text();
		expect(filename).toBe('custom-name.webp');

		const filePath = join(UPLOAD_DIR, 'custom-name.webp');
		expect(existsSync(filePath)).toBe(true);
	});

	test('uses custom path when provided', async () => {
		(mockGetJwtToken as any).mockResolvedValue({ token: 'jwt-token' });

		const outputBuffer = Buffer.from('webp-image-data');
		(mockTransform as any).mockResolvedValue(outputBuffer);

		const app = upload(ORIGIN);

		const file = new File(['test'], 'test.png', { type: 'image/png' });
		const formData = new FormData();
		formData.append('file', file);
		formData.append('path', `${TEST_SUBDIR}/custom-dir`);

		const response = await app.handle(
			new Request(`${ORIGIN}/upload-image`, {
				method: 'POST',
				body: formData,
			}),
		);

		expect(response.status).toBe(200);

		const filePath = join(UPLOAD_DIR, 'custom-dir', 'test.png.webp');
		expect(existsSync(filePath)).toBe(true);
	});
});
