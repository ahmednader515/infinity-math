import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST validate promocode
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        const body = await req.json();
        const { code, coursePrice } = body;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!code || !coursePrice) {
            return new NextResponse(
                JSON.stringify({ error: "رمز الكوبون وسعر الكورس مطلوبان" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Find promocode
        const promocode = await db.promoCode.findUnique({
            where: { code: code.toUpperCase().trim() },
        });

        if (!promocode) {
            return new NextResponse(
                JSON.stringify({ error: "رمز الكوبون غير صحيح" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if promocode is active
        if (!promocode.isActive) {
            return new NextResponse(
                JSON.stringify({ error: "هذا الكوبون غير نشط" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check validity dates
        const now = new Date();
        if (promocode.validFrom && new Date(promocode.validFrom) > now) {
            return new NextResponse(
                JSON.stringify({ error: "هذا الكوبون لم يبدأ بعد" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (promocode.validUntil && new Date(promocode.validUntil) < now) {
            return new NextResponse(
                JSON.stringify({ error: "هذا الكوبون منتهي الصلاحية" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check usage limit
        if (promocode.usageLimit && promocode.usedCount >= promocode.usageLimit) {
            return new NextResponse(
                JSON.stringify({ error: "تم استنفاذ عدد مرات استخدام هذا الكوبون" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check minimum purchase
        if (promocode.minPurchase && coursePrice < promocode.minPurchase) {
            return new NextResponse(
                JSON.stringify({ 
                    error: `يجب أن يكون سعر الشراء ${promocode.minPurchase} جنيه على الأقل` 
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Calculate discount
        let discountAmount = 0;
        if (promocode.discountType === "PERCENTAGE") {
            discountAmount = (coursePrice * promocode.discountValue) / 100;
            // Apply max discount limit if set
            if (promocode.maxDiscount && discountAmount > promocode.maxDiscount) {
                discountAmount = promocode.maxDiscount;
            }
        } else {
            // FIXED discount
            discountAmount = promocode.discountValue;
            // Can't discount more than the course price
            if (discountAmount > coursePrice) {
                discountAmount = coursePrice;
            }
        }

        const finalPrice = Math.max(0, coursePrice - discountAmount);

        return NextResponse.json({
            valid: true,
            promocode: {
                id: promocode.id,
                code: promocode.code,
                discountType: promocode.discountType,
                discountValue: promocode.discountValue,
                description: promocode.description,
            },
            discountAmount: discountAmount.toFixed(2),
            originalPrice: coursePrice.toFixed(2),
            finalPrice: finalPrice.toFixed(2),
        });
    } catch (error) {
        console.error("[PROMOCODE_VALIDATE]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}
