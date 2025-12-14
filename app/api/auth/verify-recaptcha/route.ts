import { NextResponse } from "next/server";

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
    const { recaptchaToken } = await req.json();

    if (!recaptchaToken) {
      return new NextResponse("reCAPTCHA token is required", { status: 400 });
    }

    // Verify reCAPTCHA (only if secret key is configured)
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
      if (!isRecaptchaValid) {
        return new NextResponse("reCAPTCHA verification failed", { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

