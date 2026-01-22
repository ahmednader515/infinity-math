import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const resolvedParams = await params;
  const { courseId } = resolvedParams;

  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        purchases: {
          where: {
            userId,
          },
        },
      },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Check if user has any purchase with ACTIVE status
    const validPurchase = course.purchases.some(purchase => 
      purchase.status === "ACTIVE"
    );

    // For both free and paid courses, require a purchase record to access quizzes
    // Free courses still need a purchase record to be created
    return NextResponse.json({ 
      hasAccess: validPurchase,
      hasPurchase: validPurchase
    });
  } catch (error) {
    console.error("[COURSE_ACCESS]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
} 