"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, Award, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface QuizAnswer {
    questionId: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
    question: {
        text: string;
        type: string;
        points: number;
    };
}

interface QuizResult {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    attemptNumber: number;
    maxAttempts?: number;
    totalAttempts?: number;
    answers: QuizAnswer[];
}

export default function QuizResultPage({
    params,
}: {
    params: Promise<{ courseId: string; quizId: string }>;
}) {
    const router = useRouter();
    const { courseId, quizId } = use(params);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [willRedirectToDashboard, setWillRedirectToDashboard] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [canRetry, setCanRetry] = useState(false);

    useEffect(() => {
        fetchResult();
        checkNextContent();
    }, [quizId]);

    const checkNextContent = async () => {
        try {
            const contentResponse = await fetch(`/api/courses/${courseId}/content`);
            if (contentResponse.ok) {
                const allContent = await contentResponse.json();
                
                // Find the current quiz in the content array
                const currentIndex = allContent.findIndex((content: any) => 
                    content.id === quizId && content.type === 'quiz'
                );
                
                // If no next content, set flag to show dashboard button
                if (currentIndex === -1 || currentIndex >= allContent.length - 1) {
                    setWillRedirectToDashboard(true);
                }
            } else {
                setWillRedirectToDashboard(true);
            }
        } catch (error) {
            console.error("Error checking next content:", error);
            setWillRedirectToDashboard(true);
        }
    };

    const fetchResult = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/result`);
            if (response.ok) {
                const data = await response.json();
                setResult(data);
                // Check if user can retry (hasn't reached max attempts and maxAttempts > 1)
                if (data.maxAttempts && data.maxAttempts > 1 && data.totalAttempts < data.maxAttempts) {
                    setCanRetry(true);
                } else {
                    setCanRetry(false);
                }
            } else {
                console.error("Error fetching result");
            }
        } catch (error) {
            console.error("Error fetching result:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            const response = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/retry`, {
                method: "POST",
            });

            if (response.ok) {
                const data = await response.json();
                toast.success("يمكنك الآن إعادة محاولة الاختبار");
                // Small delay to ensure database operations complete
                await new Promise(resolve => setTimeout(resolve, 500));
                // Navigate to the quiz page to start a new attempt
                router.push(`/courses/${courseId}/quizzes/${quizId}`);
                router.refresh(); // Force refresh to ensure clean state
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "لا يمكن إعادة محاولة الاختبار");
            }
        } catch (error) {
            console.error("Error retrying quiz:", error);
            toast.error("حدث خطأ أثناء محاولة إعادة الاختبار");
        } finally {
            setIsRetrying(false);
        }
    };

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 80) return "text-green-500";
        if (percentage >= 70) return "text-green-400";
        if (percentage >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const getGradeBadge = (percentage: number) => {
        if (percentage >= 90) return { variant: "default" as const, className: "bg-green-600 text-white" };
        if (percentage >= 80) return { variant: "default" as const, className: "bg-green-500 text-white" };
        if (percentage >= 70) return { variant: "default" as const, className: "bg-green-400 text-white" };
        if (percentage >= 60) return { variant: "default" as const, className: "bg-orange-600 text-white" };
        return { variant: "destructive" as const, className: "" };
    };

    const handleNextChapter = async () => {
        try {
            // Get all course content (chapters and quizzes) sorted by position
            const contentResponse = await fetch(`/api/courses/${courseId}/content`);
            if (contentResponse.ok) {
                const allContent = await contentResponse.json();
                
                // Find the current quiz in the content array
                const currentIndex = allContent.findIndex((content: any) => 
                    content.id === quizId && content.type === 'quiz'
                );
                
                                 if (currentIndex !== -1 && currentIndex < allContent.length - 1) {
                     const nextContent = allContent[currentIndex + 1];
                     if (nextContent.type === 'chapter') {
                         router.push(`/courses/${courseId}/chapters/${nextContent.id}`);
                     } else if (nextContent.type === 'quiz') {
                         router.push(`/courses/${courseId}/quizzes/${nextContent.id}`);
                     }
                 } else {
                     // If no next content, go to dashboard
                     router.push(`/dashboard`);
                 }
                         } else {
                 // Fallback to dashboard
                 router.push(`/dashboard`);
             }
         } catch (error) {
             console.error("Error navigating to next chapter:", error);
             // Fallback to dashboard
             router.push(`/dashboard`);
         }
    };

    const formatAnswer = (answer: string, questionType: string) => {
        if (questionType === "TRUE_FALSE") {
            return answer === "true" ? "صح" : "خطأ";
        }
        return answer;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0083d3]"></div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">لم يتم العثور على النتيجة</h1>
                    <Button onClick={() => router.back()}>العودة</Button>
                </div>
            </div>
        );
    }

    const correctAnswers = result.answers.filter(a => a.isCorrect).length;
    const incorrectAnswers = result.answers.filter(a => !a.isCorrect).length;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                        <h1 className="text-2xl font-bold">نتيجة الاختبار</h1>
                        {result.maxAttempts && result.maxAttempts > 0 && (
                            <Badge variant="outline" className="gap-1">
                                المحاولة {result.attemptNumber} من {result.maxAttempts}
                            </Badge>
                        )}
                    </div>

                    {/* Summary Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                ملخص النتيجة
                            </CardTitle>
                            {result.maxAttempts && (
                                <CardDescription>
                                    المحاولة {result.attemptNumber} من {result.maxAttempts}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {result.score}/{result.totalPoints}
                                    </div>
                                    <div className="text-sm text-muted-foreground">الدرجة</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-bold ${getGradeColor(result.percentage)}`}>
                                        {result.percentage.toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">النسبة المئوية</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {correctAnswers}
                                    </div>
                                    <div className="text-sm text-muted-foreground">إجابات صحيحة</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        {incorrectAnswers}
                                    </div>
                                    <div className="text-sm text-muted-foreground">إجابات خاطئة</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">التقدم العام</span>
                                    <span className="text-sm font-medium">{result.percentage.toFixed(1)}%</span>
                                </div>
                                <Progress value={result.percentage} className="w-full" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Answers */}
                    <Card>
                        <CardHeader>
                            <CardTitle>تفاصيل الإجابات</CardTitle>
                            <CardDescription>
                                مراجعة إجاباتك والتحقق من الإجابات الصحيحة
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {result.answers.map((answer, index) => (
                                    <div key={answer.questionId} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium">السؤال {index + 1}</h4>
                                            <div className="flex items-center gap-2">
                                                {answer.isCorrect ? (
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                )}
                                                <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                                                    {answer.isCorrect ? "صحيح" : "خاطئ"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{answer.question.text}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium">إجابتك:</span>
                                                <p className="text-muted-foreground">
                                                    {answer.studentAnswer 
                                                        ? formatAnswer(answer.studentAnswer, answer.question.type)
                                                        : "لم تجب"
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <span className="font-medium">الإجابة الصحيحة:</span>
                                                <p className="text-green-600">
                                                    {formatAnswer(answer.correctAnswer, answer.question.type)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm">
                                            <span className="font-medium">الدرجات:</span>
                                            <span className="text-muted-foreground">
                                                {" "}{answer.pointsEarned}/{answer.question.points}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-center gap-4">
                        {canRetry && result && result.maxAttempts && (
                            <Button
                                onClick={handleRetry}
                                disabled={isRetrying}
                                variant="outline"
                                className="border-[#0083d3] text-[#0083d3] hover:bg-[#0083d3] hover:text-white"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {isRetrying ? "جاري التحضير..." : `إعادة المحاولة (${result.totalAttempts || 0}/${result.maxAttempts})`}
                            </Button>
                        )}
                        <Button
                            onClick={handleNextChapter}
                            className="bg-[#0083d3] hover:bg-[#0083d3]/90"
                        >
                            {willRedirectToDashboard ? "لوحة التحكم" : "الفصل التالي"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
} 