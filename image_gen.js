/**
 * Update 20251121 --
 * This JavaScript file was supposed to be a reference / code sample for Codex to learn and was hand-coded by myself. I forgot this completely when making the repo public, therefore leaked the API key by mistake. The key has been disabled in Google Cloud Console. 
 */
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

async function main() {

  const ai = new GoogleGenAI({ apiKey: 'AIzaSyAvhqo30BUXT2dLhgYiWHLwRpxMFmfLI7E' });

  const prompt =
    "生成高分辨率、摄影棚灯光下的产品图，要求光线柔和。使用第一张图片中的健身房场景为背景，将第二张照片中的吊坠按照第二张图片原图的方式，放置在第一张图片的背景环境中，改变第二张图片的背景，转而使用第一张图片中的健身房背景，并且和第二张图片一样，拉近镜头对准吊坠。使用第一张图片的光照，光源来自吊坠正上方，光源照在吊坠上，呈现出自然的阴影。";

  const image1_path = 'd07964ae.jpg';
  const image1Base64 = fs.readFileSync(image1_path, {
    encoding: 'base64',
  });

  const image2_path = 'pendant-1.png';
  const image2Base64 = fs.readFileSync(image2_path, {
    encoding: 'base64',
  })

  const contents = [
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: image1Base64,
      }
    },
    {
      inlineData: {
        mimeType: 'image/png',
        data: image2Base64,
      }
    },
    prompt,
  ]

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents,
  });
  for (const candidate of response.candidates) {
    const parts = candidate?.content?.parts;
    for (const part of parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        fs.writeFileSync("gemini-native-image.png", buffer);
        console.log("Image saved as gemini-native-image.png");
      }
    }
  }
}

main();