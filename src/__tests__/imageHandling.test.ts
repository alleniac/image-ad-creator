import { describe, it, expect } from 'vitest';
import type { UploadedImage } from '../App';
import { reindexImages, toGeminiPayload } from '../App';

const makeImage = (idx: number): UploadedImage => ({
  index: idx,
  mimeType: 'image/png',
  base64: `base64-${idx}`,
  file: {} as File,
});

describe('image deletion behavior', () => {
  it('removes deleted product images from payloads', () => {
    const initial = [makeImage(1), makeImage(2)];
    const filtered = reindexImages(initial.filter((image) => image.index !== 2));
    const payload = toGeminiPayload(filtered);

    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({ index: 1, base64: 'base64-1' });
  });

  it('removes deleted style images from payloads', () => {
    const initial = [makeImage(1), makeImage(2), makeImage(3)];
    const filtered = reindexImages(initial.filter((image) => image.index !== 3));
    const payload = toGeminiPayload(filtered);

    expect(payload).toHaveLength(2);
    expect(payload.map((entry) => entry.index)).toEqual([1, 2]);
  });

  it('reindexes product images after deleting the first of three', () => {
    const initial = [makeImage(1), makeImage(2), makeImage(3)];
    const filtered = reindexImages(initial.filter((image) => image.index !== 1));

    expect(filtered.map((image) => image.index)).toEqual([1, 2]);
    expect(filtered.map((image) => image.base64)).toEqual(['base64-2', 'base64-3']);
  });

  it('reindexes style images after deleting the first of three', () => {
    const initial = [makeImage(1), makeImage(2), makeImage(3)];
    const filtered = reindexImages(initial.filter((image) => image.index !== 1));
    const payload = toGeminiPayload(filtered);

    expect(payload.map((entry) => entry.index)).toEqual([1, 2]);
    expect(payload.map((entry) => entry.base64)).toEqual(['base64-2', 'base64-3']);
  });
});
