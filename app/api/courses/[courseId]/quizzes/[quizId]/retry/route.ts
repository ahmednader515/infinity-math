import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST - Reset quiz attempt to allow retry
export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user has access to the course
        const purchase = await db.purchase.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: resolvedParams.courseId
                }
            }
        });

        if (!purchase) {
            return new NextResponse("Course access required", { status: 403 });
        }

        // Get the quiz to check maxAttempts
        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId
            },
            select: {
                maxAttempts: true
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Check how many attempts the user has made
        const existingResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            }
        });

        // Check if user can retry (hasn't reached max attempts)
        if (existingResults.length >= quiz.maxAttempts) {
            return new NextResponse(
                JSON.stringify({ error: "لقد وصلت إلى الحد الأقصى من المحاولات المسموحة" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check for existing attempt first
        const existingAttempt = await db.quizAttempt.findUnique({
            where: {
                studentId_quizId: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                }
            }
        });

        console.log(`[QUIZ_RETRY] Existing attempt found:`, existingAttempt ? { id: existingAttempt.id, completedAt: existingAttempt.completedAt } : "none");

        // Delete any existing quiz attempt (completed or in progress)
        // Use deleteMany to handle cases where multiple attempts might exist
        const deleteResult = await db.quizAttempt.deleteMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            }
        });

        console.log(`[QUIZ_RETRY] Deleted ${deleteResult.count} attempt(s) for user ${userId}, quiz ${resolvedParams.quizId}`);

        // Verify deletion
        const verifyAttempt = await db.quizAttempt.findUnique({
            where: {
                studentId_quizId: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                }
            }
        });

        if (verifyAttempt) {
            console.error(`[QUIZ_RETRY] ERROR: Attempt still exists after deletion!`);
            return new NextResponse(
                JSON.stringify({ error: "حدث خطأ أثناء إعادة تعيين المحاولة" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`[QUIZ_RETRY] Successfully deleted attempt. User can now retry.`);

        return NextResponse.json({
            success: true,
            message: "يمكنك الآن إعادة محاولة الاختبار",
            nextAttempt: existingResults.length + 1,
            maxAttempts: quiz.maxAttempts
        });
    } catch (error) {
        console.error("[QUIZ_RETRY]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}
