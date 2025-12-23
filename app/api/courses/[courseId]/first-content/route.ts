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

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user has purchased the course
        let hasAccess = false;
        const course = await (db.course as any).findFirst({
            where: {
                id: resolvedParams.courseId,
                isPublished: true,
            },
            select: {
                id: true,
                price: true,
                purchases: {
                    where: {
                        userId,
                        status: "ACTIVE"
                    }
                }
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        hasAccess = course.price === 0 || course.purchases.length > 0;

        // Get chapters - always include requiredQuiz, but conditionally include quizResults
        const chaptersQuery: any = {
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                requiredQuiz: true
            },
            orderBy: {
                position: "asc"
            }
        };

        const chapters = await (db.chapter as any).findMany(chaptersQuery);

        // Fetch quiz results separately if needed
        if (hasAccess && userId) {
            for (const chapter of chapters) {
                if (chapter.requiredQuizId) {
                    const quizResults = await (db.quizResult as any).findMany({
                        where: {
                            quizId: chapter.requiredQuizId,
                            studentId: userId
                        },
                        select: {
                            percentage: true
                        },
                        orderBy: {
                            submittedAt: 'desc'
                        },
                        take: 1
                    });
                    (chapter as any).requiredQuiz = chapter.requiredQuiz ? {
                        ...chapter.requiredQuiz,
                        quizResults
                    } : null;
                }
            }
        }

        // Get published quizzes
        const quizzesQuery: any = {
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
                        percentage: true
                    }
                }
            } : {},
            orderBy: {
                position: "asc"
            }
        };

        const quizzes = await (db.quiz as any).findMany(quizzesQuery);

        // Get user's study type if they have access
        let userStudyType: string | null = null;
        if (hasAccess && userId) {
            const user = await (db.user as any).findUnique({
                where: { id: userId },
                select: { studyType: true }
            });
            userStudyType = user?.studyType || null;
        }

        // Combine all content and sort by position
        const allContentUnsorted = [
            ...chapters.map((chapter: any) => ({
                ...chapter,
                type: 'chapter' as const,
            })),
            ...quizzes.map((quiz: any) => ({
                ...quiz,
                type: 'quiz' as const,
            }))
        ].sort((a, b) => a.position - b.position);

        // Find the first accessible content
        for (const content of allContentUnsorted) {
            if (content.type === 'quiz') {
                // Check if quiz is locked
                const quiz = content as typeof content & { type: 'quiz' };
                let isLocked = false;

                // Check sequential access - if there's a quiz before this quiz that hasn't been passed
                if (hasAccess && userId) {
                    const currentIndex = allContentUnsorted.findIndex(c => c.id === quiz.id);
                    // Find the previous quiz before this quiz
                    for (let i = currentIndex - 1; i >= 0; i--) {
                        const prevContent = allContentUnsorted[i];
                        if (prevContent.type === 'quiz') {
                            const prevQuiz = prevContent as typeof prevContent & { type: 'quiz' };
                            const quizResults = prevQuiz.quizResults || [];
                            if (quizResults.length === 0) {
                                isLocked = true;
                                break;
                            }
                            
                            const bestResult = quizResults.reduce((best: typeof quizResults[0], current: typeof quizResults[0]) => 
                                current.percentage > best.percentage ? current : best
                            );
                            
                            if (bestResult.percentage < 50) {
                                isLocked = true;
                                break;
                            }
                            
                            break;
                        }
                    }
                }

                // Quizzes are accessible if user has access and quiz is not locked
                if (hasAccess && !isLocked) {
                    return NextResponse.json({
                        id: content.id,
                        type: 'quiz'
                    });
                }
            } else {
                // Check if chapter is locked
                const chapter = content as typeof content & { type: 'chapter' };
                let isLocked = false;

                // Check study type matching
                if (!isLocked && hasAccess && userId && userStudyType && chapter.studyTypes && chapter.studyTypes.length > 0) {
                    const chapterStudyTypes = chapter.studyTypes.map((st: string) => st.trim());
                    const normalizedUserStudyType = userStudyType.trim();
                    
                    const hasMatchingStudyType = chapterStudyTypes.some((chapterStudyType: string) => 
                        chapterStudyType === normalizedUserStudyType || 
                        (chapterStudyType.includes("أون لاين") && normalizedUserStudyType.includes("أون لاين")) ||
                        (chapterStudyType.includes("أونلاين") && normalizedUserStudyType.includes("أونلاين")) ||
                        (chapterStudyType.includes("سنتر") && normalizedUserStudyType.includes("سنتر"))
                    );

                    if (!hasMatchingStudyType) {
                        isLocked = true;
                    }
                }

                // Check explicit quiz requirement
                if (!isLocked && chapter.requirePassingQuiz && chapter.requiredQuizId) {
                    if (!hasAccess || !userId) {
                        isLocked = true;
                    } else {
                        const quizResult = chapter.requiredQuiz?.quizResults?.[0];
                        if (!quizResult || quizResult.percentage < 50) {
                            isLocked = true;
                        }
                    }
                }

                // Check sequential access
                if (!isLocked && hasAccess && userId) {
                    const currentIndex = allContentUnsorted.findIndex(c => c.id === chapter.id);
                    // Find the previous quiz before this chapter
                    for (let i = currentIndex - 1; i >= 0; i--) {
                        const prevContent = allContentUnsorted[i];
                        if (prevContent.type === 'quiz') {
                            const prevQuiz = prevContent as typeof prevContent & { type: 'quiz' };
                            const quizResults = prevQuiz.quizResults || [];
                            if (quizResults.length === 0) {
                                isLocked = true;
                                break;
                            }
                            
                            const bestResult = quizResults.reduce((best: typeof quizResults[0], current: typeof quizResults[0]) => 
                                current.percentage > best.percentage ? current : best
                            );
                            
                            if (bestResult.percentage < 50) {
                                isLocked = true;
                                break;
                            }
                            
                            break;
                        }
                    }
                }

                // If chapter is not locked and user has access (or it's free), return it
                if (!isLocked && (hasAccess || chapter.isFree)) {
                    return NextResponse.json({
                        id: chapter.id,
                        type: 'chapter'
                    });
                }
            }
        }

        // No accessible content found
        return NextResponse.json({
            id: null,
            type: null
        });
    } catch (error) {
        console.error("[FIRST_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

