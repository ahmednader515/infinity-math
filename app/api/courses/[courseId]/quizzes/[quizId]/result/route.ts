import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
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

        // Get the quiz to get maxAttempts
        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId
            },
            select: {
                maxAttempts: true
            }
        });

        // Get all quiz results to determine total attempts
        const allResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        // Get the latest quiz result for this user (most recent attempt)
        const quizResult = await db.quizResult.findFirst({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            },
            include: {
                answers: {
                    include: {
                        question: {
                            select: {
                                text: true,
                                type: true,
                                points: true,
                                position: true
                            }
                        }
                    },
                    orderBy: {
                        question: {
                            position: 'asc'
                        }
                    }
                }
            }
        });

        if (!quizResult) {
            return new NextResponse("Quiz result not found", { status: 404 });
        }

        // Add maxAttempts and attempt info to the result
        const resultWithAttemptInfo = {
            ...quizResult,
            maxAttempts: quiz?.maxAttempts || 1,
            totalAttempts: allResults.length
        };

        return NextResponse.json(resultWithAttemptInfo);
    } catch (error) {
        console.log("[QUIZ_RESULT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 