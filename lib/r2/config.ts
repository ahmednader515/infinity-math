import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 is S3-compatible, so we use the AWS SDK S3 client.
export const r2Client = new S3Client({
  region: "auto",
  endpoint:
    process.env.R2_ENDPOINT ??
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

function warnIfMissing(name: string) {
  if (!process.env[name]) {
    // eslint-disable-next-line no-console
    console.warn(`[R2] ${name} is not set in environment variables`);
  }
}

warnIfMissing("R2_ACCESS_KEY_ID");
warnIfMissing("R2_SECRET_ACCESS_KEY");
warnIfMissing("R2_BUCKET_NAME");
warnIfMissing("R2_PUBLIC_URL");
warnIfMissing("R2_ACCOUNT_ID");


