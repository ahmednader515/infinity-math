import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../lib/r2/config";
import { generateR2Key, guessContentType, joinPublicUrl } from "../lib/r2/upload";

type UploadThingRow = {
  name: string;
  key: string;
  customId: string | null;
  url: string;
  size: number;
  uploadedAt: string;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function inferFolderFromName(fileName: string) {
  const ct = guessContentType(fileName, "");
  if (ct.startsWith("image/")) return "images";
  if (ct.startsWith("video/")) return "videos";
  return "documents";
}

async function uploadFileToR2(localPath: string, key: string) {
  const body = fs.createReadStream(localPath);
  const contentType = guessContentType(path.basename(localPath));

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return joinPublicUrl(R2_PUBLIC_URL, key);
}

/**
 * Upload local files to R2 and create a mapping file old UploadThing URL -> new R2 URL.
 *
 * Defaults:
 * - Source JSON: ./selected-rows-1.json and ./selected-rows-2.json (UploadThing export)
 * - Local folder: set LOCAL_FILES_DIR env var (e.g. E:\uploadthing-files\infinity-math)
 *
 * Output mapping:
 * - ./uploadthing-to-r2-mapping.json
 */
async function main() {
  if (!R2_BUCKET_NAME) throw new Error("R2_BUCKET_NAME is not set");
  if (!R2_PUBLIC_URL) throw new Error("R2_PUBLIC_URL is not set");

  const localDir = process.env.LOCAL_FILES_DIR;
  if (!localDir) {
    throw new Error("LOCAL_FILES_DIR is not set (path to downloaded UploadThing files)");
  }

  const jsonFiles = (process.env.UPLOADTHING_JSON_FILES || "selected-rows-1.json,selected-rows-2.json")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const rows: UploadThingRow[] = [];
  for (const jf of jsonFiles) {
    const p = path.join(process.cwd(), jf);
    if (!fs.existsSync(p)) continue;
    rows.push(...readJson<UploadThingRow[]>(p));
  }

  if (!rows.length) {
    throw new Error(`No rows found. Checked: ${jsonFiles.join(", ")}`);
  }

  const mapping: Record<string, string> = {};
  const results: Array<{ oldUrl: string; newUrl?: string; success: boolean; error?: string }> = [];

  // eslint-disable-next-line no-console
  console.log(`📦 Found ${rows.length} files in JSON export`);
  // eslint-disable-next-line no-console
  console.log(`📁 Using local files dir: ${localDir}`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const localPath = path.join(localDir, row.name);
    // eslint-disable-next-line no-console
    console.log(`[${i + 1}/${rows.length}] ${row.name}`);

    try {
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found: ${localPath}`);
      }

      const folder = inferFolderFromName(row.name);
      const key = generateR2Key(row.name, folder);
      const newUrl = await uploadFileToR2(localPath, key);

      mapping[row.url] = newUrl;
      results.push({ oldUrl: row.url, newUrl, success: true });
      ok++;
    } catch (err: any) {
      results.push({ oldUrl: row.url, success: false, error: err?.message || String(err) });
      fail++;
    }
  }

  const out = {
    createdAt: new Date().toISOString(),
    total: rows.length,
    ok,
    fail,
    mapping,
    results,
  };

  const outPath = path.join(process.cwd(), "uploadthing-to-r2-mapping.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  // eslint-disable-next-line no-console
  console.log(`\n✅ Done. Mapping written to: ${outPath}`);
  if (fail) {
    // eslint-disable-next-line no-console
    console.log(`⚠️  ${fail} files failed. See results in mapping file.`);
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ upload-to-r2 failed:", err);
  process.exit(1);
});


