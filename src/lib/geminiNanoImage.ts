import { GoogleGenAI, type GenerateContentConfig } from '@google/genai';

export type GeminiImageInput = {
  index: number;
  base64: string;
  mimeType: string;
};

export type GeminiModelVariant = 'gemini-2.5' | 'gemini-3';

export type GenerateAdImageParams = {
  prompt: string;
  productImages: GeminiImageInput[];
  styleImages: GeminiImageInput[];
  aspectRatio?: string;
  modelVariant?: GeminiModelVariant;
  apiKeyOverride?: string;
};

const FLASH_MODEL_ID = 'models/gemini-2.5-flash-image';
const GEMINI_3_MODEL_ID = 'gemini-3-pro-image-preview';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_ASPECT_RATIO = '1:1';

const mapInlineParts = (images: GeminiImageInput[]) =>
  [...images]
    .sort((a, b) => a.index - b.index)
    .map((image) => ({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    }));

type GeminiInlinePart = {
  inlineData?: {
    data?: string;
  };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiInlinePart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

const extractImageBase64 = (response: GeminiGenerateContentResponse): string | null => {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      const data = part.inlineData?.data;
      if (data) {
        return data;
      }
    }
  }
  return null;
};

const ensurePrompt = (prompt: string) =>
  prompt.trim().length
    ? prompt
    : 'Create an advertising-ready render that blends the referenced products and styles.';

const getApiKey = (override?: string): string | undefined =>
  override || import.meta.env.VITE_GEMINI_API_KEY;

const buildContents = (parts: Array<Record<string, unknown>>) => [
  {
    role: 'user',
    parts,
  },
];

const generateWithFlash = async (
  parts: Array<Record<string, unknown>>,
  apiKey: string,
  aspectRatio: string,
): Promise<string> => {
  const requestBody = {
    contents: buildContents(parts),
    generationConfig: {
      imageConfig: {
        aspectRatio,
      },
    },
  };

  const response = await fetch(`${API_BASE_URL}/${FLASH_MODEL_ID}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Failed to generate an image.');
  }

  const data = extractImageBase64(payload);
  if (data) {
    return data;
  }

  throw new Error('Gemini 2.5 did not return an image. Please try again.');
};

const generateWithGemini3 = async (
  parts: Array<Record<string, unknown>>,
  apiKey: string,
  aspectRatio: string,
): Promise<string> => {
  try {
    const client = new GoogleGenAI({ apiKey });
    type Gemini3GenerateContentConfig = GenerateContentConfig & {
      imageConfig?: {
        aspectRatio?: string;
        imageSize?: string;
      };
    };

    const gemini3Config: Gemini3GenerateContentConfig = {
      imageConfig: {
        aspectRatio,
      },
    };

    const response = (await client.models.generateContent({
      model: GEMINI_3_MODEL_ID,
      contents: buildContents(parts),
      config: gemini3Config,
    })) as GeminiGenerateContentResponse;

    const data = extractImageBase64(response);
    if (data) {
      return data;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reach Gemini 3.';
    throw new Error(message);
  }

  throw new Error('Gemini 3 did not return an image. Please try again.');
};

export async function generateAdImage({
  prompt,
  productImages,
  styleImages,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  modelVariant = 'gemini-2.5',
  apiKeyOverride,
}: GenerateAdImageParams): Promise<string> {
  if (!productImages.length) {
    throw new Error('Please include at least one product image.');
  }

  const apiKey = getApiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY environment variable.');
  }

  const parts = [
    ...mapInlineParts(productImages),
    ...mapInlineParts(styleImages),
    {
      text: ensurePrompt(prompt),
    },
  ];

  if (modelVariant === 'gemini-3') {
    return generateWithGemini3(parts, apiKey, aspectRatio);
  }

  return generateWithFlash(parts, apiKey, aspectRatio);
}
