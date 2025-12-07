import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;
    const body = await req.json();
    const { promocode: promocodeInput } = body || {};

    if (!userId) {
      console.log("[PURCHASE_ERROR] No user ID found in auth");
      return new NextResponse("Unauthorized - Please sign in to make a purchase", { status: 401 });
    }

    console.log(`[PURCHASE_ATTEMPT] User ${userId} attempting to purchase course ${resolvedParams.courseId}`);

    const course = await db.course.findUnique({
      where: {
        id: resolvedParams.courseId,
        isPublished: true,
      },
    });

    if (!course) {
      console.log(`[PURCHASE_ERROR] Course ${resolvedParams.courseId} not found or not published`);
      return new NextResponse("Course not found or not available for purchase", { status: 404 });
    }

    // Check if user already purchased this course
    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: resolvedParams.courseId,
        },
      },
    });

    if (existingPurchase && existingPurchase.status === "ACTIVE") {
      console.log(`[PURCHASE_ERROR] User ${userId} already has an active purchase for course ${resolvedParams.courseId}`);
      return new NextResponse("You have already purchased this course", { status: 400 });
    }

    // Get user with current balance
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        balance: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    let coursePrice = course.price || 0;
    let discountAmount = 0;
    let promocodeId = null;
    let appliedPromocode = null;

    // Validate and apply promocode if provided
    if (promocodeInput) {
      const promocode = await db.promoCode.findUnique({
        where: { code: promocodeInput.toUpperCase().trim() },
      });

      if (promocode && promocode.isActive) {
        const now = new Date();
        const isValidDate = 
          (!promocode.validFrom || new Date(promocode.validFrom) <= now) &&
          (!promocode.validUntil || new Date(promocode.validUntil) >= now);
        
        const isWithinUsageLimit = !promocode.usageLimit || promocode.usedCount < promocode.usageLimit;
        const meetsMinimumPurchase = !promocode.minPurchase || coursePrice >= promocode.minPurchase;

        if (isValidDate && isWithinUsageLimit && meetsMinimumPurchase) {
          // Calculate discount
          if (promocode.discountType === "PERCENTAGE") {
            discountAmount = (coursePrice * promocode.discountValue) / 100;
            if (promocode.maxDiscount && discountAmount > promocode.maxDiscount) {
              discountAmount = promocode.maxDiscount;
            }
          } else {
            discountAmount = promocode.discountValue;
          }
          
          // Can't discount more than the course price
          if (discountAmount > coursePrice) {
            discountAmount = coursePrice;
          }

          coursePrice = Math.max(0, coursePrice - discountAmount);
          promocodeId = promocode.id;
          appliedPromocode = promocode.code;
        }
      }
    }

    // Check if user has sufficient balance
    if (user.balance < coursePrice) {
      console.log(`[PURCHASE_ERROR] User ${userId} has insufficient balance. Required: ${coursePrice}, Available: ${user.balance}`);
      return new NextResponse("Insufficient balance", { status: 400 });
    }

    // Create purchase and update balance in a transaction
    const result = await db.$transaction(async (tx) => {
      // Delete any existing failed purchase
      if (existingPurchase && existingPurchase.status === "FAILED") {
        await tx.purchase.delete({
          where: {
            id: existingPurchase.id,
          },
        });
      }

      // Create the purchase
      const purchase = await tx.purchase.create({
        data: {
          userId,
          courseId: resolvedParams.courseId,
          status: "ACTIVE",
        },
      });

      // Update user balance
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          balance: {
            decrement: coursePrice,
          },
        },
      });

      // Create balance transaction record
      const transactionDescription = appliedPromocode
        ? `تم شراء الكورس: ${course.title} (كوبون خصم: ${appliedPromocode})`
        : `تم شراء الكورس: ${course.title}`;

      await tx.balanceTransaction.create({
        data: {
          userId,
          amount: -coursePrice,
          type: "PURCHASE",
          description: transactionDescription,
        },
      });

      // Increment promocode usage count if applied
      if (promocodeId) {
        await tx.promoCode.update({
          where: { id: promocodeId },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      return { purchase, updatedUser };
    });

    console.log(`[PURCHASE_SUCCESS] User ${userId} successfully purchased course ${resolvedParams.courseId}${appliedPromocode ? ` with promocode: ${appliedPromocode}` : ''}`);

    return NextResponse.json({
      success: true,
      purchaseId: result.purchase.id,
      newBalance: result.updatedUser.balance,
      originalPrice: (course.price || 0).toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      finalPrice: coursePrice.toFixed(2),
      promocode: appliedPromocode,
    });
  } catch (error) {
    console.error("[PURCHASE_ERROR] Unexpected error:", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
} 