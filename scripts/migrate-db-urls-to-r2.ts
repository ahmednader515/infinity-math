import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";

import { db } from "../lib/db";

type MappingFile = {
  mapping: Record<string, string>;
};

function readMapping(filePath: string): Record<string, string> {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as MappingFile | Record<string, string>;
  if ("mapping" in (parsed as any)) {
    return (parsed as MappingFile).mapping;
  }
  return parsed as Record<string, string>;
}

function looksLikeUploadThingUrl(url: string) {
  return url.includes("utfs.io") || url.includes("ufs.sh");
}

async function main() {
  const mappingPath = process.env.R2_MAPPING_FILE || path.join(process.cwd(), "uploadthing-to-r2-mapping.json");
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}`);
  }

  const mapping = readMapping(mappingPath);
  const mapKeys = new Set(Object.keys(mapping));

  const report: Record<string, { scanned: number; updated: number; missingMapping: number }> = {};

  async function migrateField<Model extends { id: string }, K extends keyof Model & string>(
    label: string,
    findMany: () => Promise<Array<Pick<Model, "id" | K>>>,
    update: (id: string, value: string | null) => Promise<any>,
    get: (row: Pick<Model, "id" | K>) => string | null | undefined
  ) {
    const rows = await findMany();
    report[label] = { scanned: rows.length, updated: 0, missingMapping: 0 };

    for (const row of rows) {
      const oldUrl = get(row);
      if (!oldUrl || typeof oldUrl !== "string") continue;
      if (!looksLikeUploadThingUrl(oldUrl)) continue;

      const newUrl = mapping[oldUrl];
      if (!newUrl) {
        report[label].missingMapping++;
        continue;
      }

      await update(row.id, newUrl);
      report[label].updated++;
    }
  }

  await migrateField(
    "User.image",
    () => db.user.findMany({ select: { id: true, image: true } }),
    (id, value) => db.user.update({ where: { id }, data: { image: value } }),
    (r) => (r as any).image
  );

  await migrateField(
    "Course.imageUrl",
    () => db.course.findMany({ select: { id: true, imageUrl: true } }),
    (id, value) => db.course.update({ where: { id }, data: { imageUrl: value } }),
    (r) => (r as any).imageUrl
  );

  await migrateField(
    "Attachment.url",
    () => db.attachment.findMany({ select: { id: true, url: true } }),
    (id, value) => db.attachment.update({ where: { id }, data: { url: value || "" } }),
    (r) => (r as any).url
  );

  await migrateField(
    "Chapter.videoUrl",
    () => db.chapter.findMany({ select: { id: true, videoUrl: true } }),
    (id, value) => db.chapter.update({ where: { id }, data: { videoUrl: value } }),
    (r) => (r as any).videoUrl
  );

  await migrateField(
    "Chapter.documentUrl",
    () => db.chapter.findMany({ select: { id: true, documentUrl: true } }),
    (id, value) => db.chapter.update({ where: { id }, data: { documentUrl: value } }),
    (r) => (r as any).documentUrl
  );

  await migrateField(
    "ChapterAttachment.url",
    () => db.chapterAttachment.findMany({ select: { id: true, url: true } }),
    (id, value) => db.chapterAttachment.update({ where: { id }, data: { url: value || "" } }),
    (r) => (r as any).url
  );

  await migrateField(
    "Question.imageUrl",
    () => db.question.findMany({ select: { id: true, imageUrl: true } }),
    (id, value) => db.question.update({ where: { id }, data: { imageUrl: value } }),
    (r) => (r as any).imageUrl
  );

  // eslint-disable-next-line no-console
  console.log("✅ Migration report:");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ mappingKeys: mapKeys.size, report }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ migrate-db-urls-to-r2 failed:", err);
  process.exit(1);
});


