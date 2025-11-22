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

        const currentAttemptNumber = existingResults.length + 1;

        if (existingResults.length >= quiz.maxAttempts) {
            return new NextResponse("Maximum attempts reached for this quiz", { status: 400 });
        }

        const existingAttempt = await db.quizAttempt.findUnique({
            where: {
                studentId_quizId: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                }
            }
        });

        // If there's an existing attempt
        if (existingAttempt) {
            // If the attempt is completed, allow retry by deleting it and creating a new one
            if (existingAttempt.completedAt) {
                console.log(`[QUIZ_GET] Found completed attempt, deleting and creating new one for retry`);
                // Delete the completed attempt
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
                // If attempt is not completed, block access
                console.log(`[QUIZ_GET] Found incomplete attempt, blocking access`);
                return new NextResponse("Quiz attempt already started and cannot be reopened", { status: 400 });
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

        // Add attempt information to the quiz response
        const quizWithAttemptInfo = {
            ...quiz,
            currentAttempt: currentAttemptNumber,
            maxAttempts: quiz.maxAttempts,
            previousAttempts: existingResults.length
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
