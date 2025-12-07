import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET all promocodes - for teachers and admins
export async function GET(req: NextRequest) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can access promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if promoCode exists on db object
        if (!db.promoCode) {
            console.error("[PROMOCODES_GET] db.promoCode is undefined. Available models:", Object.keys(db).filter(key => !key.startsWith('$')));
            return new NextResponse(
                JSON.stringify({ error: "Database model not available. Please restart the server." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const promocodes = await db.promoCode.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(promocodes);
    } catch (error) {
        console.error("[PROMOCODES_GET] Error details:", error);
        if (error instanceof Error) {
            console.error("[PROMOCODES_GET] Error message:", error.message);
            console.error("[PROMOCODES_GET] Error stack:", error.stack);
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST create new promocode - for teachers and admins
export async function POST(req: NextRequest) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can create promocodes
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

        // Validate required fields
        if (!code || !discountType || discountValue === undefined) {
            return new NextResponse(
                JSON.stringify({ error: "الرمز ونوع الخصم وقيمة الخصم مطلوبة" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Validate discount type
        if (discountType !== "PERCENTAGE" && discountType !== "FIXED") {
            return new NextResponse(
                JSON.stringify({ error: "نوع الخصم يجب أن يكون PERCENTAGE أو FIXED" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Validate discount value
        if (discountValue <= 0) {
            return new NextResponse(
                JSON.stringify({ error: "قيمة الخصم يجب أن تكون أكبر من الصفر" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if promoCode exists on db object
        if (!db.promoCode) {
            console.error("[PROMOCODES_POST] db.promoCode is undefined. Available models:", Object.keys(db).filter(key => !key.startsWith('$')));
            return new NextResponse(
                JSON.stringify({ error: "Database model not available. Please restart the server." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if code already exists
        const existingCode = await db.promoCode.findUnique({
            where: { code: code.toUpperCase().trim() },
        });

        if (existingCode) {
            return new NextResponse(
                JSON.stringify({ error: "رمز الكوبون موجود بالفعل" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create promocode
        const promocode = await db.promoCode.create({
            data: {
                code: code.toUpperCase().trim(),
                discountType,
                discountValue,
                minPurchase: minPurchase || null,
                maxDiscount: maxDiscount || null,
                usageLimit: usageLimit || null,
                isActive: isActive !== undefined ? isActive : true,
                validFrom: validFrom ? new Date(validFrom) : null,
                validUntil: validUntil ? new Date(validUntil) : null,
                description: description || null,
            },
        });

        return NextResponse.json(promocode);
    } catch (error) {
        console.error("[PROMOCODES_POST]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}
