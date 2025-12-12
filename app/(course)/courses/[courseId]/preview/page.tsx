"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, FileQuestion, CheckCircle, Circle, ShoppingCart, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Course {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    price?: number | null;
}

interface CourseContent {
    id: string;
    title: string;
    position: number;
    type: 'chapter' | 'quiz';
    isFree?: boolean;
}

export default function CoursePreviewPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const router = useRouter();
    const { courseId } = use(params);
    const [course, setCourse] = useState<Course | null>(null);
    const [content, setContent] = useState<CourseContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);
    const [hasPurchase, setHasPurchase] = useState(false);

    useEffect(() => {
        fetchCourse();
        fetchContent();
        checkAccess();
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}`);
            if (response.ok) {
                const data = await response.json();
                setCourse(data);
            } else if (response.status === 401) {
                toast.error("يرجى تسجيل الدخول للوصول إلى هذه الصفحة");
                router.push("/sign-in");
            } else {
                toast.error("حدث خطأ أثناء تحميل الكورس");
            }
        } catch (error) {
            console.error("Error fetching course:", error);
            toast.error("حدث خطأ أثناء تحميل الكورس");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchContent = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/content`);
            if (response.ok) {
                const data = await response.json();
                setContent(data);
            }
        } catch (error) {
            console.error("Error fetching content:", error);
        }
    };

    const checkAccess = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/access`);
            if (response.ok) {
                const data = await response.json();
                setHasAccess(data.hasAccess);
                setHasPurchase(data.hasPurchase || false);
            }
        } catch (error) {
            console.error("Error checking access:", error);
        } finally {
            setIsCheckingAccess(false);
        }
    };

    const handlePurchase = async () => {
        if (!course) return;

        setIsPurchasing(true);
        try {
            const response = await fetch(`/api/courses/${courseId}/purchase`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            });

            if (response.ok) {
                toast.success("تم الحصول على الكورس بنجاح!");
                setHasAccess(true);
                router.refresh();
            } else {
                const error = await response.text();
                if (error.includes("Insufficient balance")) {
                    toast.error("رصيد غير كافي. يرجى إضافة رصيد إلى حسابك");
                } else if (error.includes("already purchased")) {
                    toast.error("لقد قمت بشراء هذه الكورس مسبقاً");
                    setHasAccess(true);
                } else {
                    toast.error(error || "حدث خطأ أثناء الشراء");
                }
            }
        } catch (error) {
            console.error("Error purchasing course:", error);
            toast.error("حدث خطأ أثناء الشراء");
        } finally {
            setIsPurchasing(false);
        }
    };

    if (isLoading || isCheckingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0083d3]"></div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">لم يتم العثور على الكورس</h1>
                    <Button onClick={() => router.back()}>العودة</Button>
                </div>
            </div>
        );
    }

    const isFree = (course.price || 0) === 0;
    const sortedContent = [...content].sort((a, b) => a.position - b.position);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold">معاينة الكورس</h1>
                    </div>

                    {/* Course Info Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-start gap-4">
                                {course.imageUrl && (
                                    <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                                        <Image
                                            src={course.imageUrl}
                                            alt={course.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                                    {course.description && (
                                        <CardDescription className="text-base mt-2">
                                            {course.description}
                                        </CardDescription>
                                    )}
                                    <div className="flex items-center gap-2 mt-4">
                                        {isFree ? (
                                            <Badge variant="default" className="bg-green-600">
                                                مجاني
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-lg">
                                                {course.price} جنيه
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Course Content */}
                    <Card>
                        <CardHeader>
                            <CardTitle>محتوى الكورس</CardTitle>
                            <CardDescription>
                                {sortedContent.length} {sortedContent.length === 1 ? "عنصر" : "عناصر"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sortedContent.length > 0 ? (
                                <div className="space-y-2">
                                    {sortedContent.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-shrink-0">
                                                {item.type === 'chapter' ? (
                                                    <BookOpen className="h-5 w-5 text-blue-600" />
                                                ) : (
                                                    <FileQuestion className="h-5 w-5 text-green-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{item.title}</span>
                                                    {item.type === 'quiz' && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            اختبار
                                                        </Badge>
                                                    )}
                                                    {item.type === 'chapter' && item.isFree && (
                                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                                            مجاني
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {index + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">
                                    لا يوجد محتوى متاح حالياً
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Purchase/Get Button */}
                    {!hasAccess && (
                        <div className="sticky bottom-0 bg-background border-t p-4 rounded-t-lg shadow-lg">
                            <Button
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                                className="w-full bg-[#0083d3] hover:bg-[#0083d3]/90 text-white font-semibold py-6 text-lg"
                                size="lg"
                            >
                                {isPurchasing ? (
                                    "جاري المعالجة..."
                                ) : isFree ? (
                                    <>
                                        <Download className="h-5 w-5 ml-2" />
                                        الحصول على الكورس
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="h-5 w-5 ml-2" />
                                        شراء الكورس
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {hasAccess && (
                        <div className="sticky bottom-0 bg-background border-t p-4 rounded-t-lg shadow-lg">
                            <Button
                                onClick={async () => {
                                    // For free courses, ensure purchase record exists before navigating
                                    if (isFree && !hasPurchase) {
                                        setIsPurchasing(true);
                                        try {
                                            const response = await fetch(`/api/courses/${courseId}/purchase`, {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                },
                                                body: JSON.stringify({}),
                                            });

                                            if (response.ok) {
                                                setHasPurchase(true);
                                                // Navigate to first content
                                                const firstChapter = sortedContent.find(c => c.type === 'chapter');
                                                if (firstChapter) {
                                                    router.push(`/courses/${courseId}/chapters/${firstChapter.id}`);
                                                } else {
                                                    const firstQuiz = sortedContent.find(c => c.type === 'quiz');
                                                    if (firstQuiz) {
                                                        router.push(`/courses/${courseId}/quizzes/${firstQuiz.id}`);
                                                    }
                                                }
                                            } else {
                                                const error = await response.text();
                                                if (error.includes("already purchased")) {
                                                    setHasPurchase(true);
                                                    // Navigate anyway
                                                    const firstChapter = sortedContent.find(c => c.type === 'chapter');
                                                    if (firstChapter) {
                                                        router.push(`/courses/${courseId}/chapters/${firstChapter.id}`);
                                                    } else {
                                                        const firstQuiz = sortedContent.find(c => c.type === 'quiz');
                                                        if (firstQuiz) {
                                                            router.push(`/courses/${courseId}/quizzes/${firstQuiz.id}`);
                                                        }
                                                    }
                                                } else {
                                                    toast.error("حدث خطأ أثناء إضافة الكورس");
                                                }
                                            }
                                        } catch (error) {
                                            console.error("Error adding free course:", error);
                                            toast.error("حدث خطأ أثناء إضافة الكورس");
                                        } finally {
                                            setIsPurchasing(false);
                                        }
                                    } else {
                                        // For paid courses or free courses with purchase, just navigate
                                        const firstChapter = sortedContent.find(c => c.type === 'chapter');
                                        if (firstChapter) {
                                            router.push(`/courses/${courseId}/chapters/${firstChapter.id}`);
                                        } else {
                                            const firstQuiz = sortedContent.find(c => c.type === 'quiz');
                                            if (firstQuiz) {
                                                router.push(`/courses/${courseId}/quizzes/${firstQuiz.id}`);
                                            }
                                        }
                                    }
                                }}
                                disabled={isPurchasing}
                                className="w-full bg-[#0083d3] hover:bg-[#0083d3]/90 text-white font-semibold py-6 text-lg"
                                size="lg"
                            >
                                {isPurchasing ? (
                                    "جاري المعالجة..."
                                ) : (
                                    <>
                                        <BookOpen className="h-5 w-5 ml-2" />
                                        بدء التعلم
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

