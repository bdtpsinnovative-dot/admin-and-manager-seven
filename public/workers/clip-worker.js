// CLIP Vision Web Worker — loads @xenova/transformers directly from CDN
// This file lives in /public and is NOT processed by Next.js Turbopack/Webpack

import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// Configure for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

let model = null;
let processor = null;
let isLoading = false;

async function loadModel() {
  if (model && processor) return;
  if (isLoading) return;

  isLoading = true;

  try {
    self.postMessage({ type: "progress", progress: 0, text: "Loading AI Vision Model..." });

    const progressCallback = (info) => {
      if (info.status === "progress" && info.progress !== undefined) {
        self.postMessage({ type: "progress", progress: Math.round(info.progress), text: `Loading Model: ${Math.round(info.progress)}%` });
      } else if (info.status === "ready") {
        self.postMessage({ type: "progress", progress: 100, text: "AI Model Ready" });
      }
    };

    [model, processor] = await Promise.all([
      CLIPVisionModelWithProjection.from_pretrained("Xenova/clip-vit-base-patch32", {
        quantized: true,
        progress_callback: progressCallback,
      }),
      AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32"),
    ]);
  } catch (err) {
    isLoading = false;
    throw err;
  }
}

self.onmessage = async (event) => {
  const { type, imageData, mimeType } = event.data;

  if (type === "extract") {
    try {
      await loadModel();

      self.postMessage({ type: "progress", progress: 100, text: "Extracting visual features..." });

      const blob = new Blob([imageData], { type: mimeType || "image/jpeg" });
      const rawImage = await RawImage.fromBlob(blob);

      const inputs = await processor(rawImage);
      const { image_embeds } = await model(inputs);
      const embedding = Array.from(image_embeds.data);

      self.postMessage({ type: "result", embedding });
    } catch (err) {
      self.postMessage({ type: "error", error: err.message || "Failed to extract embedding" });
    }
  }
};
