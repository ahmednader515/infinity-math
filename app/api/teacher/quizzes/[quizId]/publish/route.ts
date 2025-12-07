import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { isPublished } = await req.json();

        const quiz = await db.quiz.findUnique({
            where: { id: resolvedParams.quizId }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        const updatedQuiz = await db.quiz.update({
            where: {
                id: resolvedParams.quizId
            },
            data: {
                isPublished
            }
        });

        return NextResponse.json(updatedQuiz);
    } catch (error) {
        console.log("[QUIZ_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}