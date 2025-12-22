"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

const formSchema = z.object({
    grade: z.string().optional(),
    divisions: z.array(z.string()).optional(),
    studyTypes: z.array(z.string()).optional(),
});

interface CourseGradeDivisionFormProps {
    initialData: Course & { divisions?: string[]; studyTypes?: string[] };
    courseId: string;
}

// Get division options based on selected grade
const getDivisionOptions = (grade: string | null | undefined) => {
    if (!grade || grade === "الكل") return [];
    
    switch (grade) {
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

export const CourseGradeDivisionForm = ({
    initialData,
    courseId
}: CourseGradeDivisionFormProps) => {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState<string | null>(initialData.grade || null);

    // Handle legacy division field (string) and new divisions field (array)
    const initialDivisions = initialData.divisions && initialData.divisions.length > 0 
        ? initialData.divisions 
        : (initialData as any).division 
            ? [(initialData as any).division]
            : [];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            grade: initialData.grade || "",
            divisions: initialDivisions,
            studyTypes: initialData.studyTypes || [],
        },
    });

    // Reset divisions when grade changes
    const gradeValue = form.watch("grade");
    useEffect(() => {
        if (gradeValue !== selectedGrade) {
            setSelectedGrade(gradeValue || null);
            if (gradeValue === "الكل") {
                form.setValue("divisions", []);
            } else if (gradeValue) {
                form.setValue("divisions", []);
            }
        }
    }, [gradeValue, selectedGrade, form]);

    const toggleEdit = () => {
        if (isEditing) {
            // Reset form when canceling
            const divisions = initialData.divisions && initialData.divisions.length > 0 
                ? initialData.divisions 
                : (initialData as any).division 
                    ? [(initialData as any).division]
                    : [];
            form.reset({
                grade: initialData.grade || "",
                divisions: divisions,
                studyTypes: initialData.studyTypes || [],
            });
            setSelectedGrade(initialData.grade || null);
        }
        setIsEditing((current) => !current);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsLoading(true);
            
            // Prepare data
            const updateData: { grade?: string | null; divisions?: string[]; studyTypes?: string[] } = {};
            
            if (values.grade && values.grade.trim() !== "" && values.grade !== "الكل") {
                updateData.grade = values.grade.trim();
                updateData.divisions = values.divisions || [];
            } else if (values.grade === "الكل") {
                updateData.grade = "الكل";
                updateData.divisions = [];
            } else {
                updateData.grade = null;
                updateData.divisions = [];
            }
            
            // Add studyTypes
            updateData.studyTypes = values.studyTypes || [];
            
            const response = await axios.patch(`/api/courses/${courseId}`, updateData);
            
            if (response.status === 200) {
                toast.success("تم تحديث الصف الدراسي والقسم");
                toggleEdit();
                router.refresh();
            }
        } catch (error: any) {
            console.error("Error updating course grade/division:", error);
            const errorMessage = error?.response?.data?.error || error?.message || "حدث خطأ ما";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const divisionOptions = getDivisionOptions(selectedGrade);
    const selectedDivisions = form.watch("divisions") || [];

    const handleDivisionToggle = (divisionValue: string, checked: boolean) => {
        const currentDivisions = form.getValues("divisions") || [];
        if (checked) {
            form.setValue("divisions", [...currentDivisions, divisionValue]);
        } else {
            form.setValue("divisions", currentDivisions.filter((d) => d !== divisionValue));
        }
    };

    // Display divisions for viewing
    const displayDivisions = initialData.divisions && initialData.divisions.length > 0 
        ? initialData.divisions 
        : (initialData as any).division 
            ? [(initialData as any).division]
            : [];

    return (
        <div className="mt-6 border bg-slate-100 rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                الصف الدراسي والقسم
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing ? (
                        <>إلغاء</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            تعديل
                        </>
                    )}
                </Button>
            </div>
            {!isEditing && (
                <div className="mt-4 space-y-2">
                    <div className="text-sm">
                        <span className="font-medium">الصف الدراسي: </span>
                        <span className="text-muted-foreground">
                            {initialData.grade === "الكل" ? "الكل (جميع الصفوف)" : (initialData.grade || "غير محدد")}
                        </span>
                    </div>
                    {initialData.grade && initialData.grade !== "الكل" && (
                        <div className="text-sm">
                            <span className="font-medium">القسم: </span>
                            <span className="text-muted-foreground">
                                {displayDivisions.length > 0 ? displayDivisions.join(", ") : "غير محدد"}
                            </span>
                        </div>
                    )}
                    <div className="text-sm">
                        <span className="font-medium">نوع الدراسة: </span>
                        <span className="text-muted-foreground">
                            {(!initialData.studyTypes || initialData.studyTypes.length === 0)
                                ? "الكل (سنتر وأون لاين)"
                                : initialData.studyTypes.length === 2
                                ? "سنتر وأون لاين"
                                : initialData.studyTypes.includes("سنتر")
                                ? "سنتر فقط"
                                : "أون لاين فقط"
                            }
                        </span>
                    </div>
                    {initialData.grade === "الكل" && (
                        <div className="text-sm text-blue-600">
                            ℹ️ هذا الكورس متاح لجميع الصفوف
                        </div>
                    )}
                    {!initialData.grade && (
                        <div className="text-sm text-orange-600">
                            ⚠️ يجب تحديد الصف الدراسي والقسم لعرض الكورس للطلاب
                        </div>
                    )}
                </div>
            )}
            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="grade"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الصف الدراسي</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            setSelectedGrade(value);
                                            if (value === "الكل") {
                                                form.setValue("divisions", []);
                                            } else {
                                                form.setValue("divisions", []);
                                            }
                                        }}
                                        value={field.value}
                                        disabled={isLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الصف" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="الكل">الكل (جميع الصفوف)</SelectItem>
                                            <SelectItem value="الأول الثانوي">الأول الثانوي</SelectItem>
                                            <SelectItem value="الثاني الثانوي">الثاني الثانوي</SelectItem>
                                            <SelectItem value="الثالث الثانوي">الثالث الثانوي</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedGrade && selectedGrade !== "الكل" && divisionOptions.length > 0 && (
                            <FormField
                                control={form.control}
                                name="divisions"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-2">
                                            <FormLabel>القسم (يمكن اختيار أكثر من قسم)</FormLabel>
                                        </div>
                                        <div className="space-y-2">
                                            {divisionOptions.map((option) => (
                                                <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                                                    <Checkbox
                                                        id={`division-${option.value}`}
                                                        checked={selectedDivisions.includes(option.value)}
                                                        onCheckedChange={(checked) => {
                                                            handleDivisionToggle(option.value, checked as boolean);
                                                        }}
                                                        disabled={isLoading}
                                                    />
                                                    <Label
                                                        htmlFor={`division-${option.value}`}
                                                        className="text-sm font-normal cursor-pointer"
                                                    >
                                                        {option.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {selectedGrade === "الكل" && (
                            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
                                ℹ️ عند اختيار "الكل"، سيظهر هذا الكورس لجميع الطلاب بغض النظر عن صفوفهم وأقسامهم.
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="studyTypes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>نوع الدراسة</FormLabel>
                                    <FormDescription>
                                        اختر نوع الدراسة الذي ينطبق على هذا الكورس. يمكنك اختيار واحد أو كليهما.
                                    </FormDescription>
                                    <div className="space-y-2 mt-2">
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                            <Checkbox
                                                id="course-center"
                                                checked={field.value?.includes("سنتر")}
                                                onCheckedChange={(checked) => {
                                                    const current = field.value || [];
                                                    if (checked) {
                                                        field.onChange([...current, "سنتر"]);
                                                    } else {
                                                        field.onChange(current.filter((type: string) => type !== "سنتر"));
                                                    }
                                                }}
                                                disabled={isLoading}
                                            />
                                            <Label htmlFor="course-center" className="cursor-pointer font-normal">
                                                سنتر
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 space-x-reverse">
                                            <Checkbox
                                                id="course-online"
                                                checked={field.value?.includes("أون لاين")}
                                                onCheckedChange={(checked) => {
                                                    const current = field.value || [];
                                                    if (checked) {
                                                        field.onChange([...current, "أون لاين"]);
                                                    } else {
                                                        field.onChange(current.filter((type: string) => type !== "أون لاين"));
                                                    }
                                                }}
                                                disabled={isLoading}
                                            />
                                            <Label htmlFor="course-online" className="cursor-pointer font-normal">
                                                أون لاين
                                            </Label>
                                        </div>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center gap-x-2">
                            <Button
                                disabled={isLoading || (selectedGrade && selectedGrade !== "الكل" && selectedDivisions.length === 0)}
                                type="submit"
                            >
                                حفظ
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
};
