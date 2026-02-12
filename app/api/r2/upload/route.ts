import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

import { authOptions } from "@/lib/auth";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2/config";
import { generateR2Key, guessContentType, joinPublicUrl } from "@/lib/r2/upload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resolvedFolder = typeof folder === "string" && folder.trim() ? folder.trim() : undefined;
    const key = generateR2Key(file.name, resolvedFolder);

    // Prefer the browser-provided content type, but fall back to extension detection.
    const contentType =
      file.type && file.type !== "application/octet-stream"
        ? file.type
        : guessContentType(file.name, "application/octet-stream");

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!R2_BUCKET_NAME) {
            throw new Error("R2_BUCKET_NAME is not set");
          }

          // Stream file to avoid buffering large uploads in memory.
          const body = Readable.fromWeb(file.stream() as any);

          const upload = new Upload({
            client: r2Client,
            params: {
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: body,
              ContentType: contentType,
              CacheControl: "public, max-age=31536000, immutable",
            },
            queueSize: 1,
            // Only use multipart for larger files; R2 has a 5MB minimum part size.
            partSize: file.size > 5 * 1024 * 1024 ? 5 * 1024 * 1024 : undefined,
          } as any);

          let lastPercent = 0;
          upload.on("httpUploadProgress", (progress) => {
            const loaded = progress.loaded ?? 0;
            const total = progress.total ?? file.size ?? 0;
            if (!total) return;

            const raw = Math.round((loaded / total) * 100);
            const percent = Math.max(0, Math.min(99, raw)); // client will set 100 on done
            if (percent <= lastPercent) return;

            lastPercent = percent;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ progress: percent, loaded, total })}\n\n`
              )
            );
          });

          await upload.done();

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                key,
                url: joinPublicUrl(R2_PUBLIC_URL, key),
                name: file.name,
                contentType,
                size: file.size,
              })}\n\n`
            )
          );
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: err?.message || "Failed to upload file",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Failed to upload file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}


