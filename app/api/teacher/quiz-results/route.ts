import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function GET(req: Request) {
    try {
        const { userId, user } = await auth();
        const { searchParams } = new URL(req.url);
        const quizId = searchParams.get('quizId');

        console.log("[TEACHER_QUIZ_RESULTS_GET] Request received", { userId, role: user?.role, quizId });

        if (!userId) {
            console.log("[TEACHER_QUIZ_RESULTS_GET] No userId");
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            console.log("[TEACHER_QUIZ_RESULTS_GET] Not staff", { role: user?.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        // For TEACHER role, show all quiz results (same as ADMIN)
        // This allows teachers to see all student grades regardless of course ownership
        // If you want to restrict to only teacher's courses, you can change this logic
        const whereClause: any = {};

        // Add quizId filter if provided
        if (quizId) {
            whereClause.quizId = quizId;
            console.log("[TEACHER_QUIZ_RESULTS_GET] Filtering by quizId:", quizId);
        } else {
            // If not filtering by quizId and user is TEACHER or ADMIN, show all results
            console.log("[TEACHER_QUIZ_RESULTS_GET] Showing all quiz results for", user?.role);
        }

        console.log("[TEACHER_QUIZ_RESULTS_GET] Where clause:", JSON.stringify(whereClause, null, 2));

        // Debug: Check total quiz results in database
        const totalResults = await db.quizResult.count();
        console.log("[TEACHER_QUIZ_RESULTS_GET] Total quiz results in DB:", totalResults);

        // Debug: Count results with the where clause
        const countWithWhere = await db.quizResult.count({ where: whereClause });
        console.log("[TEACHER_QUIZ_RESULTS_GET] Results matching where clause:", countWithWhere);

        // Debug: Check which courses the quiz results belong to
        const allQuizResultsWithCourses = await db.quizResult.findMany({
            take: 5, // Just check first 5
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        course: {
                            select: {
                                id: true,
                                title: true,
                                userId: true
                            }
                        }
                    }
                }
            }
        });
        console.log("[TEACHER_QUIZ_RESULTS_GET] Sample quiz results with courses:", JSON.stringify(allQuizResultsWithCourses, null, 2));
        
        // Debug: Check all courses in the database and their owners
        const allCourses = await db.course.findMany({
            select: {
                id: true,
                title: true,
                userId: true
            }
        });
        console.log("[TEACHER_QUIZ_RESULTS_GET] All courses in DB:", JSON.stringify(allCourses, null, 2));
        
        // Debug: Check which user IDs own courses
        const courseOwnerIds = [...new Set(allCourses.map(c => c.userId))];
        console.log("[TEACHER_QUIZ_RESULTS_GET] Course owner user IDs:", courseOwnerIds);
        console.log("[TEACHER_QUIZ_RESULTS_GET] Current user ID:", userId);
        console.log("[TEACHER_QUIZ_RESULTS_GET] Current user matches any course owner?", courseOwnerIds.includes(userId));

        // Get quiz results for quizzes owned by the teacher
        const quizResults = await db.quizResult.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        fullName: true,
                        phoneNumber: true
                    }
                },
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        },
                        questions: {
                            select: {
                                points: true
                            }
                        }
                    }
                },
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
            },
            orderBy: {
                submittedAt: "desc"
            }
        });

        console.log("[TEACHER_QUIZ_RESULTS_GET] Found quiz results:", quizResults.length);

        // Transform results to include calculated totalPoints for each quiz
        const resultsWithTotalPoints = quizResults.map(result => ({
            ...result,
            quiz: {
                ...result.quiz,
                totalPoints: result.quiz.questions.reduce((sum, q) => sum + q.points, 0)
            }
        }));

        // Remove questions array from quiz object in response (we only needed it for calculation)
        const transformedResults = resultsWithTotalPoints.map(result => {
            const { questions, ...quizWithoutQuestions } = result.quiz;
            return {
                ...result,
                quiz: quizWithoutQuestions
            };
        });

        console.log("[TEACHER_QUIZ_RESULTS_GET] Returning", transformedResults.length, "results");
        return NextResponse.json(transformedResults);
    } catch (error) {
        console.log("[TEACHER_QUIZ_RESULTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 