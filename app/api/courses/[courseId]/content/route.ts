import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { userId } = await auth();

        // Check if user has purchased the course
        let hasAccess = false;
        if (userId) {
            const course = await db.course.findUnique({
                where: {
                    id: resolvedParams.courseId,
                    isPublished: true,
                },
                include: {
                    purchases: {
                        where: {
                            userId,
                            status: "ACTIVE"
                        }
                    }
                }
            });

            // Free courses are always accessible, but we still check purchase
            if (course) {
                hasAccess = course.price === 0 || course.purchases.length > 0;
            }
        }

        // Get chapters
        const chapters = await db.chapter.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: hasAccess && userId ? {
                userProgress: {
                    where: {
                        userId
                    },
                    select: {
                        isCompleted: true
                    }
                }
            } : undefined,
            orderBy: {
                position: "asc"
            }
        });

        // Get published quizzes
        const quizzes = await db.quiz.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: hasAccess && userId ? {
                quizResults: {
                    where: {
                        studentId: userId
                    },
                    select: {
                        id: true,
                        score: true,
                        totalPoints: true,
                        percentage: true
                    }
                }
            } : undefined,
            orderBy: {
                position: "asc"
            }
        });

        // Combine and sort by position
        const allContent = [
            ...chapters.map(chapter => ({
                ...chapter,
                type: 'chapter' as const,
                // Only include userProgress if user has access
                userProgress: hasAccess ? chapter.userProgress : undefined
            })),
            ...quizzes.map(quiz => ({
                ...quiz,
                type: 'quiz' as const,
                // Only include quizResults if user has access
                quizResults: hasAccess ? quiz.quizResults : undefined
            }))
        ].sort((a, b) => a.position - b.position);

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 