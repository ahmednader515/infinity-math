import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - Get all student settings for a quiz
export async function GET(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (user?.role !== "ADMIN" && user?.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Get quiz to verify it exists
        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // All teachers and admins can access any quiz - no ownership check needed
        // Get all student settings for this quiz
        const settings = await db.quizStudentSettings.findMany({
            where: {
                quizId: resolvedParams.quizId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phoneNumber: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("[QUIZ_STUDENT_SETTINGS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST - Create or update student settings for a quiz
export async function POST(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { studentId, maxAttempts } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (user?.role !== "ADMIN" && user?.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (!studentId || !maxAttempts || maxAttempts < 1) {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        // Get quiz to verify it exists
        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // All teachers and admins can modify any quiz - no ownership check needed
        // Create or update student settings
        const settings = await db.quizStudentSettings.upsert({
            where: {
                studentId_quizId: {
                    studentId,
                    quizId: resolvedParams.quizId
                }
            },
            update: {
                maxAttempts
            },
            create: {
                studentId,
                quizId: resolvedParams.quizId,
                maxAttempts
            }
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("[QUIZ_STUDENT_SETTINGS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Remove student settings (revert to global maxAttempts)
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (user?.role !== "ADMIN" && user?.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (!studentId) {
            return new NextResponse("Student ID required", { status: 400 });
        }

        // Get quiz to verify it exists
        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // All teachers and admins can modify any quiz - no ownership check needed
        // Delete student settings
        await db.quizStudentSettings.delete({
            where: {
                studentId_quizId: {
                    studentId,
                    quizId: resolvedParams.quizId
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[QUIZ_STUDENT_SETTINGS_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

