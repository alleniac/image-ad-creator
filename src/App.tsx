import { useState } from 'react';
import { generateAdImage, type GeminiImageInput } from './lib/geminiNanoImage';

export type UploadedImage = GeminiImageInput & {
  file: File;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Unable to read file.'));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const prepareImages = async (fileList: FileList | null): Promise<UploadedImage[]> => {
  if (!fileList || fileList.length === 0) {
    return [];
  }

  const files = Array.from(fileList);
  return Promise.all(
    files.map(async (file, idx) => ({
      index: idx + 1,
      file,
      mimeType: file.type || 'application/octet-stream',
      base64: await fileToBase64(file),
    })),
  );
};

export const toGeminiPayload = (images: UploadedImage[]): GeminiImageInput[] =>
  images.map(({ index, base64, mimeType }) => ({ index, base64, mimeType }));

export const reindexImages = (images: UploadedImage[]): UploadedImage[] =>
  images.map((image, idx) => ({ ...image, index: idx + 1 }));

function App() {
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);
  const [styleImages, setStyleImages] = useState<UploadedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImageBase64, setResultImageBase64] = useState<string | null>(null);

  const handleProductChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    try {
      const images = await prepareImages(files);
      setProductImages(reindexImages(images));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process product images.');
    } finally {
      event.target.value = '';
    }
  };

  const handleStyleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    try {
      const images = await prepareImages(files);
      setStyleImages(reindexImages(images));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process style images.');
    } finally {
      event.target.value = '';
    }
  };

  const removeProductImage = (index: number) => {
    setProductImages((prev) => reindexImages(prev.filter((image) => image.index !== index)));
  };

  const removeStyleImage = (index: number) => {
    setStyleImages((prev) => reindexImages(prev.filter((image) => image.index !== index)));
  };

  const clearProductImages = () => setProductImages([]);
  const clearStyleImages = () => setStyleImages([]);

  const handleGenerate = async () => {
    if (!productImages.length) {
      setError('Please upload at least one product image.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const base64 = await generateAdImage({
        prompt,
        productImages: toGeminiPayload(productImages),
        styleImages: toGeminiPayload(styleImages),
      });
      setResultImageBase64(base64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate an image.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderImages = (
    images: UploadedImage[],
    labelPrefix: string,
    onRemove: (index: number) => void,
  ) => {
    if (!images.length) {
      return null;
    }

    return (
      <div className="image-grid image-grid--compact">
        {images.map((image) => (
          <div className="image-card" key={`${labelPrefix}-${image.index}`}>
            <button
              className="image-delete"
              type="button"
              aria-label={`Remove ${labelPrefix} #${image.index}`}
              onClick={() => onRemove(image.index)}
            >
              ×
            </button>
            <img
              src={`data:${image.mimeType};base64,${image.base64}`}
              alt={`${labelPrefix} #${image.index}`}
            />
            <span className="image-label">
              {labelPrefix} #{image.index}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="app-shell">
      <header>
        <h1>Gemini Ad Canvas</h1>
        <p className="lead">
          Upload your product assets, set the vibe, and let Gemini 2.5 Flash Image craft an ad-ready visual.
        </p>
      </header>

      <section className="section-card">
        <div className="section-heading">
          <h2>Product Images · required</h2>
          {productImages.length > 0 && (
            <button type="button" className="clear-btn" onClick={clearProductImages}>
              Remove all
            </button>
          )}
        </div>
        <input type="file" onChange={handleProductChange} multiple accept="image/*" />
        {renderImages(productImages, 'Product', removeProductImage)}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <h2>Style References · optional</h2>
          {styleImages.length > 0 && (
            <button type="button" className="clear-btn" onClick={clearStyleImages}>
              Remove all
            </button>
          )}
        </div>
        <input type="file" onChange={handleStyleChange} multiple accept="image/*" />
        {renderImages(styleImages, 'Style', removeStyleImage)}
      </section>

      <section className="section-card">
        <h2>Prompt</h2>
        <textarea
          placeholder="Describe the scene and reference assets by their labels (e.g., Product #1 with Style #2 lighting)."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </section>

      <button className="generate-btn" onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? 'Generating…' : 'Generate Ad Image'}
      </button>

      {error && <div className="status-text">{error}</div>}

      {resultImageBase64 && (
        <section className="result-card">
          <h2>Result</h2>
          <div className="image-grid image-grid--compact">
            <div className="image-card">
              <img src={`data:image/png;base64,${resultImageBase64}`} alt="Generated ad" />
              <span className="image-label">Generated Image</span>
            </div>
          </div>
          <div className="result-actions">
            <a href={`data:image/png;base64,${resultImageBase64}`} download="ad-image.png">
              Download Image
            </a>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
