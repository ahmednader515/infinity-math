import "dotenv/config";

import { db } from "../lib/db";

async function main() {
  const [users, courses, attachments, chapters, chapterAttachments, questions] =
    await Promise.all([
      db.user.findMany({ select: { id: true, image: true } }),
      db.course.findMany({ select: { id: true, imageUrl: true } }),
      db.attachment.findMany({ select: { id: true, url: true, name: true } }),
      db.chapter.findMany({
        select: { id: true, videoUrl: true, documentUrl: true, documentName: true },
      }),
      db.chapterAttachment.findMany({ select: { id: true, url: true, name: true } }),
      db.question.findMany({ select: { id: true, imageUrl: true } }),
    ]);

  const snapshot = {
    backedUpAt: new Date().toISOString(),
    users,
    courses,
    attachments,
    chapters,
    chapterAttachments,
    questions,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


