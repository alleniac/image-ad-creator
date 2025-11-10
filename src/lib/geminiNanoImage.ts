export type GeminiImageInput = {
  index: number;
  base64: string;
  mimeType: string;
};

export type GenerateAdImageParams = {
  prompt: string;
  productImages: GeminiImageInput[];
  styleImages: GeminiImageInput[];
  aspectRatio?: string;
};

const MODEL_ID = 'models/gemini-2.5-flash-image';
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

export async function generateAdImage({
  prompt,
  productImages,
  styleImages,
  aspectRatio = DEFAULT_ASPECT_RATIO,
}: GenerateAdImageParams): Promise<string> {
  if (!productImages.length) {
    throw new Error('Please include at least one product image.');
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY environment variable.');
  }

  const parts = [
    ...mapInlineParts(productImages),
    ...mapInlineParts(styleImages),
    {
      text: prompt.trim().length
        ? prompt
        : 'Create an advertising-ready render that blends the referenced products and styles.',
    },
  ];

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      imageConfig: {
        aspectRatio,
      },
    },
  };

  const response = await fetch(`${API_BASE_URL}/${MODEL_ID}:generateContent?key=${apiKey}`, {
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

  throw new Error('Gemini did not return an image. Please try again.');
}
