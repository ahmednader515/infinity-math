"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { Check, X, Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
import ReCAPTCHA from "react-google-recaptcha";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecaptchaGate } from "@/components/recaptcha-gate";

export default function SignUpPage() {
  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    grade: "",
    division: "",
    studyType: "",
    governorate: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get division options based on selected grade
  const getDivisionOptions = () => {
    switch (formData.grade) {
      case "الأول الثانوي":
        return [
          { value: "بكالوريا", label: "بكالوريا" },
          { value: "عام", label: "عام" },
        ];
      case "الثاني الثانوي":
        return [
          { value: "علمي", label: "علمي" },
          { value: "أدبي", label: "أدبي" },
        ];
      case "الثالث الثانوي":
        return [
          { value: "علمي رياضة", label: "علمي رياضة" },
          { value: "أدبي", label: "أدبي" },
        ];
      default:
        return [];
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "grade") {
      // Reset division when grade changes
      setFormData((prev) => ({
        ...prev,
        grade: value,
        division: "", // Reset division when grade changes
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validatePasswords = () => {
    return {
      match: formData.password === formData.confirmPassword,
      isValid: formData.password === formData.confirmPassword && formData.password.length > 0,
    };
  };

  const passwordChecks = validatePasswords();

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error("كلمات المرور غير متطابقة");
      setIsLoading(false);
      return;
    }

    // Check if reCAPTCHA is completed (only if site key is configured)
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error("يرجى إكمال التحقق من reCAPTCHA");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/auth/register", {
        ...formData,
        recaptchaToken,
      });
      
      if (response.data.success) {
        toast.success("تم إنشاء الحساب بنجاح");
        router.push("/sign-in");
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error("رقم الهاتف مسجل مسبقاً");
        } else if (errorMessage.includes("Parent phone number already exists")) {
          toast.error("رقم هاتف الوالد مسجل مسبقاً");
        } else if (errorMessage.includes("Phone number cannot be the same as parent phone number")) {
          toast.error("رقم الهاتف لا يمكن أن يكون نفس رقم هاتف الوالد");
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error("كلمات المرور غير متطابقة");
        } else if (errorMessage.includes("reCAPTCHA")) {
          toast.error("فشل التحقق من reCAPTCHA. يرجى المحاولة مرة أخرى");
          // Reset reCAPTCHA
          if (recaptchaRef.current) {
            recaptchaRef.current.reset();
            setRecaptchaToken(null);
          }
        } else {
          toast.error("حدث خطأ أثناء إنشاء الحساب");
        }
      } else {
        toast.error("حدث خطأ أثناء إنشاء الحساب");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RecaptchaGate>
      <div className="flex min-h-screen bg-background overflow-y-auto">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="lg" asChild>
          <Link href="/">
            <ChevronLeft className="h-10 w-10" />
          </Link>
        </Button>
      </div>
      
      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#0083d3]/10 to-[#0083d3]/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0083d3]/5"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-64 mx-auto">
              <Image
                src="/logo.png"
                alt="Teacher"
                fill
                className="object-cover rounded-full border-4 border-[#0083d3]/20 shadow-2xl"
                unoptimized
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#0083d3]">
                مرحباً بك في infinity math التعليمية
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                انضم إلينا اليوم وابدأ رحلة التعلم مع أفضل المدرسين
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight mt-8">
              إنشاء حساب جديد
            </h2>
            <p className="text-sm text-muted-foreground">
              أدخل بياناتك لإنشاء حساب جديد
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الرباعي (باللغة العربية)</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="مثال: أحمد محمد علي حسن"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">رقم الطالب (مدعوم WhatsApp)</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+20XXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhoneNumber">رقم هاتف ولي الأمر</Label>
              <Input
                id="parentPhoneNumber"
                name="parentPhoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.parentPhoneNumber}
                onChange={handleInputChange}
                placeholder="+20XXXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">الصف الدراسي</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => handleSelectChange("grade", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر الصف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الأول الثانوي">الأول الثانوي</SelectItem>
                  <SelectItem value="الثاني الثانوي">الثاني الثانوي</SelectItem>
                  <SelectItem value="الثالث الثانوي">الثالث الثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Only show division field when a grade is selected */}
            {formData.grade && (
              <div className="space-y-2">
                <Label htmlFor="division">القسم</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) => handleSelectChange("division", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDivisionOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="studyType">نوع الدراسة</Label>
              <Select
                value={formData.studyType}
                onValueChange={(value) => handleSelectChange("studyType", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر نوع الدراسة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="سنتر">سنتر</SelectItem>
                  <SelectItem value="أون لاين">أون لاين</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="governorate">المحافظة</Label>
              <Select
                value={formData.governorate}
                onValueChange={(value) => handleSelectChange("governorate", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="القاهرة">القاهرة</SelectItem>
                  <SelectItem value="الجيزة">الجيزة</SelectItem>
                  <SelectItem value="الإسكندرية">الإسكندرية</SelectItem>
                  <SelectItem value="الدقهلية">الدقهلية</SelectItem>
                  <SelectItem value="الشرقية">الشرقية</SelectItem>
                  <SelectItem value="المنوفية">المنوفية</SelectItem>
                  <SelectItem value="القليوبية">القليوبية</SelectItem>
                  <SelectItem value="البحيرة">البحيرة</SelectItem>
                  <SelectItem value="الغربية">الغربية</SelectItem>
                  <SelectItem value="بورسعيد">بورسعيد</SelectItem>
                  <SelectItem value="دمياط">دمياط</SelectItem>
                  <SelectItem value="الإسماعيلية">الإسماعيلية</SelectItem>
                  <SelectItem value="السويس">السويس</SelectItem>
                  <SelectItem value="كفر الشيخ">كفر الشيخ</SelectItem>
                  <SelectItem value="الفيوم">الفيوم</SelectItem>
                  <SelectItem value="بني سويف">بني سويف</SelectItem>
                  <SelectItem value="المنيا">المنيا</SelectItem>
                  <SelectItem value="أسيوط">أسيوط</SelectItem>
                  <SelectItem value="سوهاج">سوهاج</SelectItem>
                  <SelectItem value="قنا">قنا</SelectItem>
                  <SelectItem value="أسوان">أسوان</SelectItem>
                  <SelectItem value="الأقصر">الأقصر</SelectItem>
                  <SelectItem value="البحر الأحمر">البحر الأحمر</SelectItem>
                  <SelectItem value="الوادي الجديد">الوادي الجديد</SelectItem>
                  <SelectItem value="مطروح">مطروح</SelectItem>
                  <SelectItem value="شمال سيناء">شمال سيناء</SelectItem>
                  <SelectItem value="جنوب سيناء">جنوب سيناء</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className="h-10"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className="h-10"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {passwordChecks.match ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">كلمات المرور متطابقة</span>
              </div>
            </div>

            {/* reCAPTCHA v2 */}
            {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                  onChange={handleRecaptchaChange}
                  theme="light"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-[#0083d3] hover:bg-[#0083d3]/90 text-white"
              disabled={isLoading || !passwordChecks.isValid || (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !recaptchaToken)}
            >
              {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
            </Button>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
            <Link 
              href="/sign-in" 
              className="text-primary hover:underline transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
      </div>
    </RecaptchaGate>
  );
} 