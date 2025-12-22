import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;
    
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
        courseId: courseId,
      },
      include: {
        course: {
          select: {
            userId: true,
          }
        },
        userProgress: {
          where: {
            userId,
          }
        },
        attachments: {
          orderBy: {
            position: 'asc',
          },
        }
      }
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // Check if user has access to the course
    const purchase = await db.purchase.findFirst({
      where: {
        userId,
        courseId: courseId,
        status: "ACTIVE"
      }
    });

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { price: true }
    });

    const hasAccess = course && (course.price === 0 || purchase !== null);

    // Check if chapter is locked due to sequential access
    if (hasAccess && userId) {
      const [chapters, quizzes] = await db.$transaction([
        db.chapter.findMany({
          where: {
            courseId: courseId,
            isPublished: true
          },
          select: {
            id: true,
            position: true
          },
          orderBy: {
            position: "asc"
          }
        }),
        db.quiz.findMany({
          where: {
            courseId: courseId,
            isPublished: true
          },
          select: {
            id: true,
            position: true
          },
          orderBy: {
            position: "asc"
          }
        })
      ]);

      const chaptersWithType = chapters.map(chapter => ({ ...chapter, type: 'chapter' as const }));
      const quizzesWithType = quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const }));

      const sortedContent = [...chaptersWithType, ...quizzesWithType].sort((a, b) => a.position - b.position);

      const currentIndex = sortedContent.findIndex(content => 
        content.id === chapterId && content.type === 'chapter'
      );

      // Check if there's a quiz before this chapter that needs to be passed
      if (currentIndex > 0) {
        for (let i = currentIndex - 1; i >= 0; i--) {
          const prevContent = sortedContent[i];
          if (prevContent.type === 'quiz') {
            // Check if student passed this quiz
            const quizResults = await db.quizResult.findMany({
              where: {
                studentId: userId,
                quizId: prevContent.id
              },
              select: {
                percentage: true
              },
              orderBy: {
                submittedAt: 'desc'
              }
            });

            if (quizResults.length === 0) {
              return new NextResponse(
                JSON.stringify({ 
                  error: "يجب اجتياز الاختبار السابق بنسبة 50% على الأقل أولاً",
                  isLocked: true 
                }), 
                { status: 403 }
              );
            }

            const bestResult = quizResults.reduce((best, current) => 
              current.percentage > best.percentage ? current : best
            );

            if (bestResult.percentage < 50) {
              return new NextResponse(
                JSON.stringify({ 
                  error: "يجب اجتياز الاختبار السابق بنسبة 50% على الأقل أولاً",
                  isLocked: true 
                }), 
                { status: 403 }
              );
            }

            // Found a passed quiz, stop checking
            break;
          }
        }
      }
    }

    const [chapters, quizzes] = await db.$transaction([
      db.chapter.findMany({
        where: {
          courseId: courseId,
          isPublished: true
        },
        select: {
          id: true,
          position: true
        },
        orderBy: {
          position: "asc"
        }
      }),
      db.quiz.findMany({
        where: {
          courseId: courseId,
          isPublished: true
        },
        select: {
          id: true,
          position: true
        },
        orderBy: {
          position: "asc"
        }
      })
    ]);

    const chaptersWithType = chapters.map(chapter => ({ ...chapter, type: 'chapter' as const }));
    const quizzesWithType = quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const }));

    const sortedContent = [...chaptersWithType, ...quizzesWithType].sort((a, b) => a.position - b.position);

    const currentIndex = sortedContent.findIndex(content => 
      content.id === chapterId && content.type === 'chapter'
    );

    const nextContent = currentIndex !== -1 && currentIndex < sortedContent.length - 1 
      ? sortedContent[currentIndex + 1] 
      : null;
    
    const previousContent = currentIndex > 0 
      ? sortedContent[currentIndex - 1] 
      : null;

    const response = {
      ...chapter,
      nextChapterId: nextContent?.id || null,
      previousChapterId: previousContent?.id || null,
      nextContentType: nextContent?.type || null,
      previousContentType: previousContent?.type || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[CHAPTER_ID] Detailed error:", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}\nStack: ${error.stack}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const values = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        const chapter = await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                ...values,
            }
        });

        return NextResponse.json(chapter);
    } catch (error) {
        console.log("[CHAPTER_ID]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
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

        const existingChapter = await db.chapter.findUnique({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            }
        });

        if (!existingChapter) {
            return new NextResponse("Chapter not found", { status: 404 });
        }

        await db.chapter.delete({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            }
        });

        return new NextResponse("Chapter deleted successfully", { status: 200 });
    } catch (error) {
        console.error("[CHAPTER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
