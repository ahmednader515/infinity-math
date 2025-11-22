import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET single promocode
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ promocodeId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can access promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if promoCode exists on db object
        if (!db.promoCode) {
            console.error("[PROMOCODE_GET] db.promoCode is undefined. Available models:", Object.keys(db).filter(key => !key.startsWith('$')));
            return new NextResponse(
                JSON.stringify({ error: "Database model not available. Please restart the server." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const promocode = await db.promoCode.findUnique({
            where: { id: resolvedParams.promocodeId },
        });

        if (!promocode) {
            return new NextResponse("Promocode not found", { status: 404 });
        }

        return NextResponse.json(promocode);
    } catch (error) {
        console.error("[PROMOCODE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PATCH update promocode
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ promocodeId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can update promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxDiscount,
            usageLimit,
            isActive,
            validFrom,
            validUntil,
            description,
        } = body;

        // Check if promocode exists
        const existingPromocode = await db.promoCode.findUnique({
            where: { id: resolvedParams.promocodeId },
        });

        if (!existingPromocode) {
            return new NextResponse("Promocode not found", { status: 404 });
        }

        // If code is being changed, check if new code already exists
        if (code && code !== existingPromocode.code) {
            const codeExists = await db.promoCode.findUnique({
                where: { code: code.toUpperCase().trim() },
            });

            if (codeExists) {
                return new NextResponse(
                    JSON.stringify({ error: "رمز الكوبون موجود بالفعل" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // Validate discount type if provided
        if (discountType && discountType !== "PERCENTAGE" && discountType !== "FIXED") {
            return new NextResponse(
                JSON.stringify({ error: "نوع الخصم يجب أن يكون PERCENTAGE أو FIXED" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Validate discount value if provided
        if (discountValue !== undefined && discountValue <= 0) {
            return new NextResponse(
                JSON.stringify({ error: "قيمة الخصم يجب أن تكون أكبر من الصفر" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build update data
        const updateData: any = {};
        if (code !== undefined) updateData.code = code.toUpperCase().trim();
        if (discountType !== undefined) updateData.discountType = discountType;
        if (discountValue !== undefined) updateData.discountValue = discountValue;
        if (minPurchase !== undefined) updateData.minPurchase = minPurchase || null;
        if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount || null;
        if (usageLimit !== undefined) updateData.usageLimit = usageLimit || null;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null;
        if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
        if (description !== undefined) updateData.description = description || null;

        const promocode = await db.promoCode.update({
            where: { id: resolvedParams.promocodeId },
            data: updateData,
        });

        return NextResponse.json(promocode);
    } catch (error) {
        console.error("[PROMOCODE_PATCH]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE promocode
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ promocodeId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can delete promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const promocode = await db.promoCode.findUnique({
            where: { id: resolvedParams.promocodeId },
        });

        if (!promocode) {
            return new NextResponse("Promocode not found", { status: 404 });
        }

        await db.promoCode.delete({
            where: { id: resolvedParams.promocodeId },
        });

        return NextResponse.json({ message: "تم حذف الكوبون بنجاح" });
    } catch (error) {
        console.error("[PROMOCODE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
