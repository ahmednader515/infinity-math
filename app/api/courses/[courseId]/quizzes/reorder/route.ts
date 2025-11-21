import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { list } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        for (const item of list) {
            try {
                await db.quiz.update({
                    where: { id: item.id },
                    data: { position: item.position }
                });
            } catch (quizError) {
                try {
                    await db.chapter.update({
                        where: { id: item.id },
                        data: { position: item.position }
                    });
                } catch (chapterError) {
                    console.log("[QUIZ_REORDER] Failed to update item:", item.id, quizError, chapterError);
                    return new NextResponse("Failed to update item", { status: 400 });
                }
            }
        }

        return new NextResponse("Success", { status: 200 });
    } catch (error) {
        console.log("[QUIZ_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
