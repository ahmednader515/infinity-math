import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error("[RECAPTCHA] Secret key not configured");
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    
    // For reCAPTCHA v2, just check success
    // For v3, also check score (score should be >= 0.5)
    if (data.success === true) {
      // If score exists (v3), check it; otherwise (v2) just check success
      if (data.score !== undefined) {
        // v3: score ranges from 0.0 (bot) to 1.0 (human)
        // Typically, scores above 0.5 are considered legitimate
        return data.score >= 0.5;
      }
      // v2: just check success
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[RECAPTCHA] Verification error:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { 
      fullName, 
      phoneNumber, 
      parentPhoneNumber, 
      grade,
      division,
      studyType,
      governorate,
      password, 
      confirmPassword,
      recaptchaToken
    } = await req.json();

    if (!fullName || !phoneNumber || !parentPhoneNumber || !password || !confirmPassword) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Verify reCAPTCHA (only if secret key is configured)
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return new NextResponse("reCAPTCHA verification required", { status: 400 });
      }

      const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
      if (!isRecaptchaValid) {
        return new NextResponse("reCAPTCHA verification failed", { status: 400 });
      }
    }

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    // Check if phone number is the same as parent phone number
    if (phoneNumber === parentPhoneNumber) {
      return new NextResponse("Phone number cannot be the same as parent phone number", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { parentPhoneNumber }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return new NextResponse("Phone number already exists", { status: 400 });
      }
      if (existingUser.parentPhoneNumber === parentPhoneNumber) {
        return new NextResponse("Parent phone number already exists", { status: 400 });
      }
    }

    // Hash password (no complexity requirements)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user directly without email verification
    await db.user.create({
      data: {
        fullName,
        phoneNumber,
        parentPhoneNumber,
        grade,
        division,
        studyType,
        governorate,
        hashedPassword,
        role: "USER",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return a specific error message
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return new NextResponse("Database not initialized. Please run database migrations.", { status: 503 });
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 