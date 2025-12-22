"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, Pencil, EyeOff, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import axios from "axios";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Editor } from "@/components/editor";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { IconBadge } from "@/components/icon-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChapterFormProps {
    initialData: {
        title: string;
        description: string | null;
        isFree: boolean;
        isPublished: boolean;
        studyTypes?: string[];
        requirePassingQuiz?: boolean;
        requiredQuizId?: string | null;
    };
    courseId: string;
    chapterId: string;
}

const titleSchema = z.object({
    title: z.string().min(1, {
        message: "Title is required",
    }),
});

const descriptionSchema = z.object({
    description: z.string().min(1, {
        message: "Description is required",
    }),
});

const accessSchema = z.object({
    isFree: z.boolean().default(false),
});

const studyTypeSchema = z.object({
    studyTypes: z.array(z.string()).default([]),
});

const requiredQuizSchema = z.object({
    requirePassingQuiz: z.boolean().default(false),
    requiredQuizId: z.string().optional().nullable(),
});

export const ChapterForm = ({
    initialData,
    courseId,
    chapterId
}: ChapterFormProps) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isEditingAccess, setIsEditingAccess] = useState(false);
    const [isEditingStudyType, setIsEditingStudyType] = useState(false);
    const [isEditingRequiredQuiz, setIsEditingRequiredQuiz] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([]);

    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/quizzes`);
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data);
            }
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        }
    };

    const titleForm = useForm<z.infer<typeof titleSchema>>({
        resolver: zodResolver(titleSchema),
        defaultValues: {
            title: initialData?.title || "",
        },
    });

    const descriptionForm = useForm<z.infer<typeof descriptionSchema>>({
        resolver: zodResolver(descriptionSchema),
        defaultValues: {
            description: initialData?.description || "",
        },
    });

    const accessForm = useForm<z.infer<typeof accessSchema>>({
        resolver: zodResolver(accessSchema),
        defaultValues: {
            isFree: !!initialData.isFree
        }
    });

    const studyTypeForm = useForm<z.infer<typeof studyTypeSchema>>({
        resolver: zodResolver(studyTypeSchema),
        defaultValues: {
            studyTypes: initialData.studyTypes || []
        }
    });

    const requiredQuizForm = useForm<z.infer<typeof requiredQuizSchema>>({
        resolver: zodResolver(requiredQuizSchema),
        defaultValues: {
            requirePassingQuiz: initialData.requirePassingQuiz || false,
            requiredQuizId: initialData.requiredQuizId || null,
        }
    });

    const { isSubmitting: isSubmittingTitle, isValid: isValidTitle } = titleForm.formState;
    const { isSubmitting: isSubmittingDescription, isValid: isValidDescription } = descriptionForm.formState;
    const { isSubmitting: isSubmittingAccess, isValid: isValidAccess } = accessForm.formState;
    const { isSubmitting: isSubmittingStudyType, isValid: isValidStudyType } = studyTypeForm.formState;
    const { isSubmitting: isSubmittingRequiredQuiz, isValid: isValidRequiredQuiz } = requiredQuizForm.formState;

    const onSubmitTitle = async (values: z.infer<typeof titleSchema>) => {
        try {
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error('Failed to update chapter title');
            }

            toast.success("Chapter title updated");
            setIsEditingTitle(false);
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_TITLE]", error);
            toast.error("Something went wrong");
        }
    }

    const onSubmitDescription = async (values: z.infer<typeof descriptionSchema>) => {
        try {
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                throw new Error('Failed to update chapter description');
            }

            toast.success("Chapter description updated");
            setIsEditingDescription(false);
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_DESCRIPTION]", error);
            toast.error("Something went wrong");
        }
    }

    const onSubmitAccess = async (values: z.infer<typeof accessSchema>) => {
        try {
            await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            toast.success("Chapter access updated");
            setIsEditingAccess(false);
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_ACCESS]", error);
            toast.error("Something went wrong");
        }
    }

    const onSubmitStudyType = async (values: z.infer<typeof studyTypeSchema>) => {
        try {
            await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            toast.success("تم تحديث نوع الدراسة");
            setIsEditingStudyType(false);
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_STUDY_TYPE]", error);
            toast.error("حدث خطأ");
        }
    }

    const onSubmitRequiredQuiz = async (values: z.infer<typeof requiredQuizSchema>) => {
        try {
            await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requirePassingQuiz: values.requirePassingQuiz,
                    requiredQuizId: values.requirePassingQuiz ? values.requiredQuizId : null,
                }),
            });

            toast.success("تم تحديث إعدادات الاختبار المطلوب");
            setIsEditingRequiredQuiz(false);
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_REQUIRED_QUIZ]", error);
            toast.error("حدث خطأ");
        }
    }

    const onPublish = async () => {
        try {
            setIsLoading(true);
            
            await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}/publish`);
            
            toast.success(initialData.isPublished ? "تم إلغاء النشر" : "تم النشر");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }

    if (!isMounted) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                    <IconBadge icon={LayoutDashboard} />
                    <h2 className="text-xl">
                        إعدادات الفصل
                    </h2>
                </div>
                <Button
                    onClick={onPublish}
                    disabled={isLoading}
                    variant={initialData.isPublished ? "outline" : "default"}
                >
                    {initialData.isPublished ? (
                        <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            إلغاء النشر
                        </>
                    ) : (
                        <>
                            <Eye className="h-4 w-4 mr-2" />
                            نشر
                        </>
                    )}
                </Button>
            </div>
            <div className="space-y-4">
                <div className="border bg-card rounded-md p-4">
                    <div className="font-medium flex items-center justify-between">
                        عنوان الفصل
                        <Button onClick={() => setIsEditingTitle(!isEditingTitle)} variant="ghost">
                            {isEditingTitle ? (
                                <>إلغاء</>
                            ) : (
                                <>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    تعديل العنوان
                                </>
                            )}
                        </Button>
                    </div>
                    {!isEditingTitle && (
                        <p className={cn(
                            "text-sm mt-2",
                            !initialData.title && "text-muted-foreground italic"
                        )}>
                            {initialData.title || "لا يوجد عنوان"}
                        </p>
                    )}
                    {isEditingTitle && (
                        <Form {...titleForm}>
                            <form
                                onSubmit={titleForm.handleSubmit(onSubmitTitle)}
                                className="space-y-4 mt-4"
                            >
                                <FormField
                                    control={titleForm.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    disabled={isSubmittingTitle}
                                                    placeholder="e.g. 'Introduction to the course'"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center gap-x-2">
                                    <Button
                                        disabled={!isValidTitle || isSubmittingTitle}
                                        type="submit"
                                    >
                                        حفظ
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </div>
                <div className="border bg-card rounded-md p-4">
                    <div className="font-medium flex items-center justify-between">
                        وصف الفصل
                        <Button onClick={() => setIsEditingDescription(!isEditingDescription)} variant="ghost">
                            {isEditingDescription ? (
                                <>إلغاء</>
                            ) : (
                                <>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    تعديل الوصف
                                </>
                            )}
                        </Button>
                    </div>
                    {!isEditingDescription && (
                        <div className={cn(
                            "text-sm mt-2",
                            !initialData.description && "text-muted-foreground italic"
                        )}>
                            {!initialData.description && "لا يوجد وصف"}
                            {initialData.description && (
                                <div 
                                    className="prose prose-sm max-w-none space-y-4"
                                    dangerouslySetInnerHTML={{ __html: initialData.description }}
                                />
                            )}
                        </div>
                    )}
                    {isEditingDescription && (
                        <Form {...descriptionForm}>
                            <form
                                onSubmit={descriptionForm.handleSubmit(onSubmitDescription)}
                                className="space-y-4 mt-4"
                            >
                                <FormField
                                    control={descriptionForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Editor
                                                    onChange={field.onChange}
                                                    value={field.value}
                                                    placeholder="e.g. 'This chapter will cover the basics of...'"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center gap-x-2">
                                    <Button
                                        disabled={!isValidDescription || isSubmittingDescription}
                                        type="submit"
                                    >
                                        حفظ
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center gap-x-2">
                    <IconBadge icon={Eye} />
                    <h2 className="text-xl">
                        إعدادات الوصول
                    </h2>
                </div>
                <div className="space-y-4 mt-4">
                    <div className="border bg-card rounded-md p-4">
                        <div className="font-medium flex items-center justify-between">
                            إعدادات الوصول
                            <Button onClick={() => setIsEditingAccess(!isEditingAccess)} variant="ghost">
                                {isEditingAccess ? (
                                    <>الغاء</>
                                ) : (
                                    <>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        تعديل الوصول
                                    </>
                                )}
                            </Button>
                        </div>
                        {!isEditingAccess && (
                            <p className={cn(
                                "text-sm mt-2",
                                !initialData.isFree && "text-muted-foreground italic"
                            )}>
                                {initialData.isFree ? "هذا الفصل مجاني للمعاينة" : "هذا الفصل غير مجاني"}
                            </p>
                        )}
                        {isEditingAccess && (
                            <Form {...accessForm}>
                                <form
                                    onSubmit={accessForm.handleSubmit(onSubmitAccess)}
                                    className="space-y-4 mt-4"
                                >
                                    <FormField
                                        control={accessForm.control}
                                        name="isFree"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormDescription>
                                                        قم بالتحقق من هذا المربع إذا أردت جعل هذا الفصل مجانيًا للمعاينة
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex items-center gap-x-2">
                                        <Button
                                            disabled={!isValidAccess || isSubmittingAccess}
                                            type="submit"
                                        >
                                            حفظ
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center gap-x-2">
                    <IconBadge icon={LayoutDashboard} />
                    <h2 className="text-xl">
                        نوع الدراسة
                    </h2>
                </div>
                <div className="space-y-4 mt-4">
                    <div className="border bg-card rounded-md p-4">
                        <div className="font-medium flex items-center justify-between">
                            نوع الدراسة
                            <Button onClick={() => setIsEditingStudyType(!isEditingStudyType)} variant="ghost">
                                {isEditingStudyType ? (
                                    <>إلغاء</>
                                ) : (
                                    <>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        تعديل نوع الدراسة
                                    </>
                                )}
                            </Button>
                        </div>
                        {!isEditingStudyType && (
                            <p className={cn(
                                "text-sm mt-2",
                                (!initialData.studyTypes || initialData.studyTypes.length === 0) && "text-muted-foreground italic"
                            )}>
                                {(!initialData.studyTypes || initialData.studyTypes.length === 0) 
                                    ? "لم يتم تحديد نوع الدراسة (متاح للجميع)"
                                    : initialData.studyTypes.length === 2
                                    ? "سنتر وأون لاين"
                                    : initialData.studyTypes.includes("سنتر")
                                    ? "سنتر فقط"
                                    : "أون لاين فقط"
                                }
                            </p>
                        )}
                        {isEditingStudyType && (
                            <Form {...studyTypeForm}>
                                <form
                                    onSubmit={studyTypeForm.handleSubmit(onSubmitStudyType)}
                                    className="space-y-4 mt-4"
                                >
                                    <FormField
                                        control={studyTypeForm.control}
                                        name="studyTypes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="space-y-3">
                                                    <FormDescription>
                                                        اختر نوع الدراسة الذي ينطبق عليه هذا الفصل. يمكنك اختيار واحد أو كليهما.
                                                    </FormDescription>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center space-x-2 space-x-reverse">
                                                            <Checkbox
                                                                id="center"
                                                                checked={field.value?.includes("سنتر")}
                                                                onCheckedChange={(checked) => {
                                                                    const current = field.value || [];
                                                                    if (checked) {
                                                                        field.onChange([...current, "سنتر"]);
                                                                    } else {
                                                                        field.onChange(current.filter((type: string) => type !== "سنتر"));
                                                                    }
                                                                }}
                                                            />
                                                            <Label htmlFor="center" className="cursor-pointer font-normal">
                                                                سنتر
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2 space-x-reverse">
                                                            <Checkbox
                                                                id="online"
                                                                checked={field.value?.includes("أون لاين")}
                                                                onCheckedChange={(checked) => {
                                                                    const current = field.value || [];
                                                                    if (checked) {
                                                                        field.onChange([...current, "أون لاين"]);
                                                                    } else {
                                                                        field.onChange(current.filter((type: string) => type !== "أون لاين"));
                                                                    }
                                                                }}
                                                            />
                                                            <Label htmlFor="online" className="cursor-pointer font-normal">
                                                                أون لاين
                                                            </Label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex items-center gap-x-2">
                                        <Button
                                            disabled={!isValidStudyType || isSubmittingStudyType}
                                            type="submit"
                                        >
                                            حفظ
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center gap-x-2">
                    <IconBadge icon={LayoutDashboard} />
                    <h2 className="text-xl">
                        متطلبات الفصل
                    </h2>
                </div>
                <div className="space-y-4 mt-4">
                    <div className="border bg-card rounded-md p-4">
                        <div className="font-medium flex items-center justify-between">
                            الاختبار المطلوب
                            <Button onClick={() => setIsEditingRequiredQuiz(!isEditingRequiredQuiz)} variant="ghost">
                                {isEditingRequiredQuiz ? (
                                    <>إلغاء</>
                                ) : (
                                    <>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        تعديل المتطلبات
                                    </>
                                )}
                            </Button>
                        </div>
                        {!isEditingRequiredQuiz && (
                            <p className={cn(
                                "text-sm mt-2",
                                !initialData.requirePassingQuiz && "text-muted-foreground italic"
                            )}>
                                {!initialData.requirePassingQuiz 
                                    ? "لا يوجد اختبار مطلوب (الفصل متاح للجميع)"
                                    : initialData.requiredQuizId
                                    ? `يجب اجتياز الاختبار: ${quizzes.find(q => q.id === initialData.requiredQuizId)?.title || "غير محدد"}`
                                    : "يجب تحديد الاختبار المطلوب"
                                }
                            </p>
                        )}
                        {isEditingRequiredQuiz && (
                            <Form {...requiredQuizForm}>
                                <form
                                    onSubmit={requiredQuizForm.handleSubmit(onSubmitRequiredQuiz)}
                                    className="space-y-4 mt-4"
                                >
                                    <FormField
                                        control={requiredQuizForm.control}
                                        name="requirePassingQuiz"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={(checked) => {
                                                            field.onChange(checked);
                                                            if (!checked) {
                                                                requiredQuizForm.setValue("requiredQuizId", null);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormDescription>
                                                        قم بالتحقق من هذا المربع إذا أردت أن يكون الفصل مرئياً فقط بعد اجتياز اختبار معين
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    {requiredQuizForm.watch("requirePassingQuiz") && (
                                        <FormField
                                            control={requiredQuizForm.control}
                                            name="requiredQuizId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormDescription>
                                                        اختر الاختبار الذي يجب على الطالب اجتيازه لرؤية هذا الفصل
                                                    </FormDescription>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value || ""}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="اختر الاختبار" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {quizzes.map((quiz) => (
                                                                <SelectItem key={quiz.id} value={quiz.id}>
                                                                    {quiz.title}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <div className="flex items-center gap-x-2">
                                        <Button
                                            disabled={!isValidRequiredQuiz || isSubmittingRequiredQuiz}
                                            type="submit"
                                        >
                                            حفظ
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 