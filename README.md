# Image Ad Creator

Create ad-ready images by combining product shots, optional style references, and a free-form prompt. The app lets you toggle between Gemini 2.5 Flash Image and Gemini 3 (Nano Banana Pro) for generation and view/download results instantly. Each request produces three variants in parallel.

## Features
- Upload multiple product images (required) and style reference images (optional)
- Choose generation model: Gemini 2.5 Flash Image (speed) or Gemini 3 Nano Banana Pro (higher fidelity, 2K image size, 1:1 aspect by default)
- Custom prompt to steer the scene
- Inline previews, full-size modal preview, and per-image downloads for all generated variants
- Image management: delete individual uploads or clear all in one click

## Prerequisites
- Node.js 18+ and npm
- A Gemini API key with access to the selected model(s)

## Setup
1) Install dependencies:
```bash
npm install
```
2) Create `.env` (or `.env.local`) at the project root with your key:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

## Run the app
- Development server: `npm run dev` (Vite)
- Production build: `npm run build`
- Preview production build: `npm run preview`
- Tests: `npm test`

## Usage
1) Start the dev server and open the app.
2) Pick a model (Gemini 2.5 Flash Image or Gemini 3 Nano Banana Pro).
3) Upload at least one product image; optionally add style references.
4) Write a prompt (or leave blank to use the default blended prompt).
5) Click **Generate Ad Image**. Three results appear with preview and download options for each.

## Notes
- Gemini 3 requests are sent with `imageConfig` of aspect ratio `1:1` and image size `2K` by default.
- Google Search tools are not used in this project.***
