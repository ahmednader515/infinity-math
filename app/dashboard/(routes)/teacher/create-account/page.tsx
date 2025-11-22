"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}

export default function CreateAccountPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
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

  const handleSelectChange = (name: "grade" | "division" | "studyType" | "governorate", value: string) => {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error("كلمات المرور غير متطابقة");
      setIsLoading(false);
      return;
    }

    if (!formData.grade || !formData.division || !formData.studyType || !formData.governorate) {
      toast.error("برجاء استكمال بيانات التسجيل");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/teacher/create-account", formData);
      
      if (response.data.success) {
        setCreatedUser(response.data.user);
        toast.success("تم إنشاء حساب الطالب بنجاح");
        // Reset form
        setFormData({
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

  const resetForm = () => {
    setFormData({
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
    setCreatedUser(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/teacher/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              العودة
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            إنشاء حساب طالب جديد
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {createdUser ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                تم إنشاء الحساب بنجاح
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">الاسم الكامل</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">رقم الهاتف</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700 text-white">
                  إنشاء حساب آخر
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/teacher/courses">
                    العودة للكورسات
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                معلومات الطالب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">الاسم الكامل *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="أدخل الاسم الكامل"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">رقم الهاتف *</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="أدخل رقم الهاتف"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentPhoneNumber">رقم هاتف الوالد *</Label>
                  <Input
                    id="parentPhoneNumber"
                    name="parentPhoneNumber"
                    type="tel"
                    value={formData.parentPhoneNumber}
                    onChange={handleInputChange}
                    placeholder="أدخل رقم هاتف الوالد"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">الصف الدراسي *</Label>
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
                      <Label htmlFor="division">القسم *</Label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studyType">نوع الدراسة *</Label>
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
                    <Label htmlFor="governorate">المحافظة *</Label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="أدخل كلمة المرور"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="أكد كلمة المرور"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.password && formData.confirmPassword && (
                  <div className={`text-sm ${passwordChecks.match ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordChecks.match ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                        كلمات المرور متطابقة
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                        كلمات المرور غير متطابقة
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !passwordChecks.isValid}
                    className="flex-1 bg-[#0083d3] hover:bg-[#0083d3]/90 text-white"
                  >
                    {isLoading ? "جاري الإنشاء..." : "إنشاء الحساب"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    إعادة تعيين
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 