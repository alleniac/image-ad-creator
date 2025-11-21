import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateAdImage, generateMultipleAdImages } from '../lib/geminiNanoImage';
import type { GeminiImageInput } from '../lib/geminiNanoImage';

const originalFetch = globalThis.fetch;

const productImage: GeminiImageInput = {
  index: 1,
  mimeType: 'image/png',
  base64: 'product-base64',
};

afterEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = originalFetch;
});

describe('model selection', () => {
  it('routes requests to Gemini 2.5 when selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: 'flash-image' } }] } }],
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await generateAdImage({
      prompt: '',
      productImages: [productImage],
      styleImages: [],
      modelVariant: 'gemini-2.5',
      apiKeyOverride: 'test-key',
    });

    expect(result).toBe('flash-image');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('models/gemini-2.5-flash-image:generateContent'),
      expect.any(Object),
    );
  });

  it('routes requests to Gemini 3 Nano Banana Pro when selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: 'gemini-three-image' } }] } }],
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await generateAdImage({
      prompt: 'make it dramatic',
      productImages: [productImage],
      styleImages: [],
      modelVariant: 'gemini-3',
      apiKeyOverride: 'test-key',
    });

    expect(result).toBe('gemini-three-image');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('models/gemini-3-pro-image-preview:generateContent'),
      expect.any(Object),
    );
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as { body: string }).body);
    expect(body.generationConfig.imageConfig).toMatchObject({
      aspectRatio: '1:1',
      imageSize: '2K',
    });
  });

  it('fires three API calls concurrently when requesting multiple images', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount += 1;
      const data = `img-${callCount}`;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ inlineData: { data } }] } }],
        }),
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const results = await generateMultipleAdImages(
      {
        prompt: 'batch',
        productImages: [productImage],
        styleImages: [],
        modelVariant: 'gemini-3',
        apiKeyOverride: 'test-key',
      },
      3,
    );

    expect(results).toEqual(['img-1', 'img-2', 'img-3']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
