import { describe, it, expect, vi, afterEach } from 'vitest';

const generateContentMock = vi.fn();
const originalFetch = globalThis.fetch;

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: generateContentMock,
    },
  })),
}));

import { generateAdImage } from '../lib/geminiNanoImage';
import type { GeminiImageInput } from '../lib/geminiNanoImage';

const productImage: GeminiImageInput = {
  index: 1,
  mimeType: 'image/png',
  base64: 'product-base64',
};

afterEach(() => {
  generateContentMock.mockReset();
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
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('routes requests to Gemini 3 Nano Banana Pro when selected', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    generateContentMock.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'gemini-three-image' } }] } }],
    });

    const result = await generateAdImage({
      prompt: 'make it dramatic',
      productImages: [productImage],
      styleImages: [],
      modelVariant: 'gemini-3',
      apiKeyOverride: 'test-key',
    });

    expect(result).toBe('gemini-three-image');
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3-pro-image-preview',
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
