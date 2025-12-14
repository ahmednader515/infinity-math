"use client";

import { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface RecaptchaGateProps {
  children: React.ReactNode;
  onVerified?: () => void;
}

const VERIFICATION_STORAGE_KEY = "recaptcha_verified";
const VERIFICATION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function RecaptchaGate({ children, onVerified }: RecaptchaGateProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check if user is already verified
    const checkVerification = () => {
      try {
        const stored = localStorage.getItem(VERIFICATION_STORAGE_KEY);
        if (stored) {
          const { timestamp } = JSON.parse(stored);
          const now = Date.now();
          
          // Check if verification is still valid (within 24 hours)
          if (now - timestamp < VERIFICATION_DURATION) {
            setIsVerified(true);
            setIsChecking(false);
            onVerified?.();
            return;
          } else {
            // Expired, remove it
            localStorage.removeItem(VERIFICATION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Error checking verification:", error);
        localStorage.removeItem(VERIFICATION_STORAGE_KEY);
      }
      setIsChecking(false);
    };

    checkVerification();
  }, [onVerified]);

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleVerify = async () => {
    if (!recaptchaToken) {
      return;
    }

    setIsVerifying(true);

    try {
      // Verify the token with the server
      const response = await fetch("/api/auth/verify-recaptcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recaptchaToken }),
      });

      if (response.ok) {
        // Store verification with timestamp
        localStorage.setItem(
          VERIFICATION_STORAGE_KEY,
          JSON.stringify({ timestamp: Date.now() })
        );
        setIsVerified(true);
        onVerified?.();
      } else {
        // Verification failed, reset reCAPTCHA
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
          setRecaptchaToken(null);
        }
        alert("فشل التحقق من reCAPTCHA. يرجى المحاولة مرة أخرى");
      }
    } catch (error) {
      console.error("Error verifying reCAPTCHA:", error);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
      alert("حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى");
    } finally {
      setIsVerifying(false);
    }
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  // If verified, show children
  if (isVerified) {
    return <>{children}</>;
  }

  // Show verification modal
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  return (
    <>
      {/* Block the page content */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
      
      <Dialog open={true} modal={true}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              التحقق من الأمان
            </DialogTitle>
            <DialogDescription>
              يرجى إكمال التحقق من reCAPTCHA للوصول إلى الموقع. هذا يساعدنا في حماية الموقع من الروبوتات والهجمات.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {siteKey ? (
              <div className="flex flex-col items-center gap-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={siteKey}
                  onChange={handleRecaptchaChange}
                  theme="light"
                />
                <Button
                  onClick={handleVerify}
                  disabled={!recaptchaToken || isVerifying}
                  className="w-full"
                >
                  {isVerifying ? "جاري التحقق..." : "متابعة"}
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>reCAPTCHA غير متاح حالياً</p>
                <Button
                  onClick={() => {
                    localStorage.setItem(
                      VERIFICATION_STORAGE_KEY,
                      JSON.stringify({ timestamp: Date.now() })
                    );
                    setIsVerified(true);
                    onVerified?.();
                  }}
                  className="mt-4"
                  variant="outline"
                >
                  تخطي (للتطوير فقط)
                </Button>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            هذا الموقع محمي بواسطة reCAPTCHA ويخضع لسياسة الخصوصية وشروط الخدمة من Google
          </p>
        </DialogContent>
      </Dialog>

      {/* Render children but keep them hidden */}
      <div className="opacity-0 pointer-events-none">{children}</div>
    </>
  );
}

