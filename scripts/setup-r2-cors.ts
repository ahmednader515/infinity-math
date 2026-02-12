import "dotenv/config";
import { PutBucketCorsCommand } from "@aws-sdk/client-s3";

import { r2Client, R2_BUCKET_NAME } from "../lib/r2/config";

async function setupCORS() {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not set");
  }

  const command = new PutBucketCorsCommand({
    Bucket: R2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedOrigins: ["*"], // tighten in production
          ExposeHeaders: [
            "ETag",
            "Content-Length",
            "Content-Type",
            "Accept-Ranges",
            "Content-Range",
          ],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  await r2Client.send(command);
  // eslint-disable-next-line no-console
  console.log("✅ R2 CORS configuration applied successfully!");
}

setupCORS().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Failed to apply R2 CORS configuration:", err);
  process.exit(1);
});


