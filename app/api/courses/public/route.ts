import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          },
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          },
        },
        purchases: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Return courses with default progress of 0 for public view
    const coursesWithDefaultProgress = courses.map(({ purchases, ...course }) => ({
      ...course,
      progress: 0,
      enrollmentCount: purchases.length,
    }));

    return NextResponse.json(coursesWithDefaultProgress);
  } catch (error) {
    console.log("[COURSES_PUBLIC]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return an empty array instead of an error
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return NextResponse.json([]);
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 