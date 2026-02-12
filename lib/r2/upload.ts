import { randomUUID } from "node:crypto";

const EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  mov: "video/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function guessContentType(filename: string, fallback = "application/octet-stream") {
  const ext = filename.toLowerCase().split(".").pop() || "";
  return EXT_TO_MIME[ext] || fallback;
}

export function sanitizeFilename(originalName: string) {
  return originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
}

export function generateR2Key(originalName: string, folder?: string) {
  const ts = Date.now();
  const id = typeof randomUUID === "function" ? randomUUID() : Math.random().toString(36).slice(2);
  const safe = sanitizeFilename(originalName);
  return folder ? `${folder}/${ts}-${id}-${safe}` : `${ts}-${id}-${safe}`;
}

export function joinPublicUrl(publicBaseUrl: string, key: string) {
  if (!publicBaseUrl) return key;
  return publicBaseUrl.endsWith("/") ? `${publicBaseUrl}${key}` : `${publicBaseUrl}/${key}`;
}


