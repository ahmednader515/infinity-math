import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";

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

        // Get the quiz
        const quiz = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        points: true,
                        imageUrl: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        // Don't parse options here - the frontend will handle parsing
        // This keeps the original string format for consistency

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Check if user has already taken this quiz and if they can take it again
        const existingResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        const existingAttempt = await db.quizAttempt.findUnique({
            where: {
                studentId_quizId: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                }
            }
        });

        // Count total attempts: submitted attempts (QuizResults) + incomplete attempts
        const submittedAttempts = existingResults.length;
        const hasIncompleteAttempt = existingAttempt && !existingAttempt.completedAt;
        const totalAttempts = submittedAttempts + (hasIncompleteAttempt ? 1 : 0);

        // Check if they've reached max attempts
        if (totalAttempts >= quiz.maxAttempts) {
            // If they have an incomplete attempt, they can't retry
            if (hasIncompleteAttempt) {
                return new NextResponse("Maximum attempts reached for this quiz. You have an incomplete attempt that counts as an attempt.", { status: 400 });
            }
            // If they only have submitted attempts and reached max, block
            return new NextResponse("Maximum attempts reached for this quiz", { status: 400 });
        }

        const currentAttemptNumber = submittedAttempts + 1;
        let isRetry = false;
        let retryReason = null;

        // If there's an existing attempt
        if (existingAttempt) {
            // If the attempt is completed (has completedAt)
            if (existingAttempt.completedAt) {
                // Check if there's a corresponding QuizResult (meaning they submitted)
                if (existingResults.length > 0) {
                    // They already submitted, and we've confirmed they have retries left
                    // Delete the completed attempt and create a new one for retry
                    console.log(`[QUIZ_GET] Found completed and submitted attempt, allowing retry`);
                    isRetry = true;
                    retryReason = "submitted";
                    await db.quizAttempt.delete({
                        where: {
                            studentId_quizId: {
                                studentId: userId,
                                quizId: resolvedParams.quizId
                            }
                        }
                    });
                    // Create a new attempt for retry
                    await db.quizAttempt.create({
                        data: {
                            studentId: userId,
                            quizId: resolvedParams.quizId
                        }
                    });
                } else {
                    // Completed attempt but no QuizResult (edge case - shouldn't happen normally)
                    // Allow retry by deleting and creating new attempt
                    console.log(`[QUIZ_GET] Found completed attempt without result, allowing retry`);
                    isRetry = true;
                    retryReason = "completed";
                    await db.quizAttempt.delete({
                        where: {
                            studentId_quizId: {
                                studentId: userId,
                                quizId: resolvedParams.quizId
                            }
                        }
                    });
                    await db.quizAttempt.create({
                        data: {
                            studentId: userId,
                            quizId: resolvedParams.quizId
                        }
                    });
                }
            } else {
                // If attempt is not completed (no completedAt), it counts as an attempt
                // If they have retries left, delete the incomplete attempt and allow a new one
                console.log(`[QUIZ_GET] Found incomplete attempt, counting as attempt. Total attempts: ${totalAttempts}, Max: ${quiz.maxAttempts}`);
                
                if (totalAttempts < quiz.maxAttempts) {
                    // They have retries left, delete the incomplete attempt and create a new one
                    console.log(`[QUIZ_GET] Allowing retry after incomplete attempt`);
                    isRetry = true;
                    retryReason = "incomplete";
                    await db.quizAttempt.delete({
                        where: {
                            studentId_quizId: {
                                studentId: userId,
                                quizId: resolvedParams.quizId
                            }
                        }
                    });
                    // Create a new attempt for retry
                    await db.quizAttempt.create({
                        data: {
                            studentId: userId,
                            quizId: resolvedParams.quizId
                        }
                    });
                } else {
                    // No retries left, block access
                    return new NextResponse("Maximum attempts reached for this quiz. Your incomplete attempt counts as an attempt.", { status: 400 });
                }
            }
        } else {
            // No existing attempt, create a new one
            console.log(`[QUIZ_GET] No existing attempt, creating new one`);
            await db.quizAttempt.create({
                data: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                }
            });
        }

        // Calculate remaining attempts
        // Remaining = maxAttempts - currentAttemptNumber (current attempt is in progress, so it counts)
        const remainingAttempts = Math.max(0, quiz.maxAttempts - currentAttemptNumber);

        // Add attempt information to the quiz response
        const quizWithAttemptInfo = {
            ...quiz,
            currentAttempt: currentAttemptNumber,
            maxAttempts: quiz.maxAttempts,
            previousAttempts: existingResults.length,
            isRetry: isRetry,
            retryReason: retryReason,
            remainingAttempts: remainingAttempts
        };

        return NextResponse.json(quizWithAttemptInfo);
    } catch (error) {
        console.log("[QUIZ_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { title, description, questions, position } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const course = await db.course.findUnique({
            where: { id: resolvedParams.courseId }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        const updatedQuiz = await db.quiz.update({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            },
            data: {
                title,
                description,
                position,
                questions: {
                    deleteMany: {},
                    create: questions.map((question: any, index: number) => ({
                        text: question.text,
                        type: question.type,
                        options: question.type === "MULTIPLE_CHOICE" ? stringifyQuizOptions(question.options) : null,
                        correctAnswer: question.correctAnswer,
                        points: question.points,
                        imageUrl: question.imageUrl || null,
                        position: index + 1
                    }))
                }
            },
            include: {
                course: {
                    select: {
                        title: true
                    }
                },
                questions: {
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        return NextResponse.json(updatedQuiz);
    } catch (error) {
        console.log("[QUIZ_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
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

        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        await db.quiz.delete({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[QUIZ_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
