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
            const course = await (db.course as any).findFirst({
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
        const chapters = await (db.chapter as any).findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                requiredQuiz: hasAccess && userId ? {
                    include: {
                        quizResults: {
                            where: {
                                studentId: userId
                            },
                            select: {
                                percentage: true
                            },
                            orderBy: {
                                submittedAt: 'desc'
                            },
                            take: 1
                        }
                    }
                } : undefined,
                userProgress: hasAccess && userId ? {
                    where: {
                        userId
                    },
                    select: {
                        isCompleted: true
                    }
                } : undefined
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get published quizzes
        const quizzes = await (db.quiz as any).findMany({
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

        // Combine all content and sort by position to check sequential access
        const allContentUnsorted = [
            ...chapters.map((chapter: typeof chapters[0]) => ({
                ...chapter,
                type: 'chapter' as const,
                userProgress: hasAccess ? chapter.userProgress : undefined
            })),
            ...quizzes.map((quiz: typeof quizzes[0]) => ({
                ...quiz,
                type: 'quiz' as const,
                quizResults: hasAccess ? quiz.quizResults : undefined
            }))
        ].sort((a, b) => a.position - b.position);

        // Check sequential access for both chapters and quizzes
        const allContent = allContentUnsorted.map((content, index) => {
            let isLocked = false;
            let lockReason: string | null = null;

            if (content.type === 'chapter') {
                const chapter = content as typeof content & { type: 'chapter' };

                // Note: Study type checking is done in the chapter API route
                // We don't mark chapters as locked here so they remain clickable in sidebar
                // The chapter page will show the error message when accessed

                // First check explicit quiz requirement
                if (!isLocked && chapter.requirePassingQuiz && chapter.requiredQuizId) {
                    if (!hasAccess || !userId) {
                        isLocked = true;
                        lockReason = "يجب شراء الكورس أولاً";
                    } else {
                        const quizResult = chapter.requiredQuiz?.quizResults?.[0];
                        if (!quizResult || quizResult.percentage < 50) {
                            isLocked = true;
                            lockReason = "يجب اجتياز الاختبار المطلوب بنسبة 50% على الأقل";
                        }
                    }
                }

                // Check sequential access - if there's a quiz before this chapter
                if (!isLocked && hasAccess && userId) {
                    // Find the previous quiz before this chapter
                    for (let i = index - 1; i >= 0; i--) {
                        const prevContent = allContentUnsorted[i];
                        if (prevContent.type === 'quiz') {
                            const prevQuiz = prevContent as typeof prevContent & { type: 'quiz' };
                            // Check if student passed this quiz (50% or higher)
                            const quizResults = prevQuiz.quizResults || [];
                            if (quizResults.length === 0) {
                                // Student hasn't taken the quiz yet
                                isLocked = true;
                                lockReason = `يجب اجتياز الاختبار "${prevQuiz.title}" بنسبة 50% على الأقل أولاً`;
                                break;
                            }
                            
                            // Get the best result (highest percentage)
                            const bestResult = quizResults.reduce((best: typeof quizResults[0], current: typeof quizResults[0]) => 
                                current.percentage > best.percentage ? current : best
                            );
                            
                            if (bestResult.percentage < 50) {
                                isLocked = true;
                                lockReason = `يجب اجتياز الاختبار "${prevQuiz.title}" بنسبة 50% على الأقل أولاً`;
                                break;
                            }
                            
                            // Found a passed quiz, stop checking
                            break;
                        }
                    }
                }

                return {
                    ...chapter,
                    isLocked,
                    lockReason
                };
            } else {
                // Handle quiz locking
                const quiz = content as typeof content & { type: 'quiz' };

                // Check sequential access - if there's a quiz before this quiz that hasn't been passed
                if (hasAccess && userId) {
                    // Find the previous quiz before this quiz
                    for (let i = index - 1; i >= 0; i--) {
                        const prevContent = allContentUnsorted[i];
                        if (prevContent.type === 'quiz') {
                            const prevQuiz = prevContent as typeof prevContent & { type: 'quiz' };
                            // Check if student passed this quiz (50% or higher)
                            const quizResults = prevQuiz.quizResults || [];
                            if (quizResults.length === 0) {
                                // Student hasn't taken the quiz yet
                                isLocked = true;
                                lockReason = `يجب اجتياز الاختبار "${prevQuiz.title}" بنسبة 50% على الأقل أولاً`;
                                break;
                            }
                            
                            // Get the best result (highest percentage)
                            const bestResult = quizResults.reduce((best: typeof quizResults[0], current: typeof quizResults[0]) => 
                                current.percentage > best.percentage ? current : best
                            );
                            
                            if (bestResult.percentage < 50) {
                                isLocked = true;
                                lockReason = `يجب اجتياز الاختبار "${prevQuiz.title}" بنسبة 50% على الأقل أولاً`;
                                break;
                            }
                            
                            // Found a passed quiz, stop checking
                            break;
                        }
                    }
                }

                return {
                    ...quiz,
                    isLocked,
                    lockReason
                };
            }
        });

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 