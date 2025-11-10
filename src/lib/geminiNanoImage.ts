import { GoogleGenAI } from '@google/genai';

export type GeminiImageInput = {
  index: number;
  base64: string;
  mimeType: string;
};

export type GenerateAdImageParams = {
  prompt: string;
  productImages: GeminiImageInput[];
  styleImages: GeminiImageInput[];
};

const MODEL_ID = 'models/gemini-2.5-flash-image';

const mapInlineParts = (images: GeminiImageInput[]) =>
  [...images]
    .sort((a, b) => a.index - b.index)
    .map((image) => ({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    }));

export async function generateAdImage({
  prompt,
  productImages,
  styleImages,
}: GenerateAdImageParams): Promise<string> {
  if (!productImages.length) {
    throw new Error('Please include at least one product image.');
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY environment variable.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts = [
    ...mapInlineParts(productImages),
    ...mapInlineParts(styleImages),
    {
      text: prompt.trim().length
        ? prompt
        : 'Create an advertising-ready render that blends the referenced products and styles.',
    },
  ];

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
  });

  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const candidateParts = candidate.content?.parts ?? [];
    for (const part of candidateParts) {
      const data = part.inlineData?.data;
      if (data) {
        return data;
      }
    }
  }

  throw new Error('Gemini did not return an image. Please try again.');
}
