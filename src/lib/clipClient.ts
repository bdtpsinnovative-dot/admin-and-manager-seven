"use client";

// Client-side CLIP Vision extraction via Web Worker (loads from CDN, zero bundler issues)

let worker: Worker | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker("/workers/clip-worker.js", { type: "module" });
  return worker;
}

export type CropBoxNormalized = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export async function cropImageToBlob(
  imageUrl: string,
  cropBox?: CropBoxNormalized
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));

      let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;

      if (cropBox && cropBox.widthPercent > 0.03 && cropBox.heightPercent > 0.03) {
        sx = Math.max(0, Math.round(cropBox.xPercent * img.naturalWidth));
        sy = Math.max(0, Math.round(cropBox.yPercent * img.naturalHeight));
        sWidth = Math.max(10, Math.min(img.naturalWidth - sx, Math.round(cropBox.widthPercent * img.naturalWidth)));
        sHeight = Math.max(10, Math.min(img.naturalHeight - sy, Math.round(cropBox.heightPercent * img.naturalHeight)));
      }

      // Square contain canvas to preserve vase/prop aspect ratio
      const maxDim = Math.max(sWidth, sHeight);
      canvas.width = maxDim;
      canvas.height = maxDim;

      // Fill light neutral background
      ctx.fillStyle = "#F5F3EE";
      ctx.fillRect(0, 0, maxDim, maxDim);

      // Center cropped image
      const dx = (maxDim - sWidth) / 2;
      const dy = (maxDim - sHeight) / 2;
      ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, sWidth, sHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob from canvas"));
        },
        "image/jpeg",
        0.92
      );
    };

    // Use proxy API to bypass Cloudflare R2 / S3 CORS restrictions when drawing on canvas
    const safeUrl = imageUrl.startsWith("http")
      ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;

    img.onerror = (err) => reject(new Error("Failed to load image for cropping"));
    img.src = safeUrl;
  });
}

export function extractImageEmbeddingFromBlob(
  blob: Blob,
  onProgress?: (progress: number, text: string) => void
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    const handler = (event: MessageEvent) => {
      const { type, embedding, error, progress, text } = event.data;

      if (type === "progress" && onProgress) {
        onProgress(progress, text);
      } else if (type === "result") {
        w.removeEventListener("message", handler);
        w.removeEventListener("error", errorHandler);
        resolve(embedding);
      } else if (type === "error") {
        w.removeEventListener("message", handler);
        w.removeEventListener("error", errorHandler);
        reject(new Error(error));
      }
    };

    const errorHandler = (event: ErrorEvent) => {
      w.removeEventListener("message", handler);
      w.removeEventListener("error", errorHandler);
      reject(new Error(event.message || "Worker error"));
    };

    w.addEventListener("message", handler);
    w.addEventListener("error", errorHandler);

    blob.arrayBuffer().then((buffer) => {
      w.postMessage(
        { type: "extract", imageData: buffer, mimeType: blob.type },
        [buffer]
      );
    }).catch(reject);
  });
}

export async function extractImageEmbeddingFromUrl(
  imageUrl: string,
  cropBox?: CropBoxNormalized,
  onProgress?: (progress: number, text: string) => void
): Promise<number[]> {
  const blob = await cropImageToBlob(imageUrl, cropBox);
  return extractImageEmbeddingFromBlob(blob, onProgress);
}
