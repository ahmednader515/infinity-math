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
        const { courseId } = resolvedParams;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: courseId,
                isPublished: true,
            },
            include: {
                chapters: {
                    where: {
                        isPublished: true,
                    },
                    orderBy: {
                        position: "asc",
                    },
                },
                attachments: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
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

        return NextResponse.json(course);
    } catch (error) {
        console.error("[COURSE_ID]", error);
        if (error instanceof Error) {
            return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const values = await req.json();

        console.log("[COURSE_ID_PATCH] Request received", { 
            courseId: resolvedParams.courseId, 
            userId, 
            role: user?.role,
            values 
        });

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // First check if course exists
        const existingCourse = await db.course.findUnique({
            where: { id: resolvedParams.courseId }
        });

        if (!existingCourse) {
            console.log("[COURSE_ID_PATCH] Course not found");
            return new NextResponse(
                JSON.stringify({ error: "Course not found" }), 
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check permissions:
        // - ADMIN can update any course
        // - TEACHER can only update their own courses
        // - Others cannot update
        const userRole = user?.role;
        const isAdmin = userRole === "ADMIN";
        const isTeacher = userRole === "TEACHER";
        const isOwner = existingCourse.userId === userId;
        
        console.log("[COURSE_ID_PATCH] Permission check:", { 
            isAdmin, 
            isTeacher, 
            isOwner, 
            userId, 
            courseUserId: existingCourse.userId,
            userRole,
            userIdMatch: existingCourse.userId === userId,
            userIdTypes: {
                userId: typeof userId,
                courseUserId: typeof existingCourse.userId
            }
        });
        
        // Must be ADMIN or TEACHER
        if (!isAdmin && !isTeacher) {
            console.log("[COURSE_ID_PATCH] Forbidden - not staff", { userRole });
            return new NextResponse(
                JSON.stringify({ error: "Forbidden - ليس لديك صلاحية للتعديل" }), 
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        // TEACHER can only update their own courses (unless they're also ADMIN)
        if (isTeacher && !isAdmin && !isOwner) {
            console.log("[COURSE_ID_PATCH] Forbidden - teacher can only update own courses", {
                userId,
                courseUserId: existingCourse.userId
            });
            return new NextResponse(
                JSON.stringify({ error: "Forbidden - يمكنك تعديل كورساتك فقط" }), 
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Authorization already checked - use course ID for update
        // ADMIN can update any course, TEACHER can only update their own (already verified)
        console.log("[COURSE_ID_PATCH] Updating course with data:", values);

        const course = await db.course.update({
            where: { id: resolvedParams.courseId },
            data: {
                ...values,
            }
        });

        console.log("[COURSE_ID_PATCH] Course updated successfully");
        return NextResponse.json(course);
    } catch (error) {
        console.error("[COURSE_ID_PATCH] Error details:", error);
        if (error instanceof Error) {
            console.error("[COURSE_ID_PATCH] Error message:", error.message);
            console.error("[COURSE_ID_PATCH] Error stack:", error.stack);
            return new NextResponse(
                JSON.stringify({ error: error.message }), 
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return new NextResponse(
            JSON.stringify({ error: "Internal Error" }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            }
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        // Only owner or admin can delete
        if (user?.role !== "ADMIN" && course.userId !== userId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const deletedCourse = await db.course.delete({
            where: {
                id: resolvedParams.courseId,
            },
        });

        return NextResponse.json(deletedCourse);
    } catch (error) {
        console.log("[COURSE_ID_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}