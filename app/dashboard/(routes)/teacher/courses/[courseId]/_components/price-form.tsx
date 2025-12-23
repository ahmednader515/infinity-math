"use client"

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Course } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/format";

interface PriceFormProps {
    initialData: Course;

    courseId: string;
}

const formSchema = z.object({
    price: z.coerce.number(),
    isFree: z.boolean().default(false)
});

export const PriceForm = ({
    initialData,
    courseId
}: PriceFormProps) => {

    const [isEditing, setIsEditing] = useState(false);

    const toggleEdit = () => setIsEditing((current) => !current);

    const router = useRouter();

    const isFreeCourse = initialData?.price === 0;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            price: initialData?.price ?? 0,
            isFree: isFreeCourse,
        }
    });

    const { isSubmitting, isValid } = form.formState;
    const isFree = form.watch("isFree");

    // Update price to 0 when isFree is checked
    useEffect(() => {
        if (isFree) {
            form.setValue("price", 0);
        }
    }, [isFree, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            // If course is free, ensure price is 0 (not null or undefined)
            const priceToSubmit = values.isFree ? 0 : (values.price || 0);
            // Explicitly ensure we send a number, not null
            await axios.patch(`/api/courses/${courseId}`, { price: Number(priceToSubmit) });
            toast.success("تم تحديث الكورس");
            toggleEdit();
            router.refresh();
        } catch {
            toast.error("حدث خطأ");
        }
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                سعر الكورس
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing && (<>إلغاء</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        تعديل السعر
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <p className={cn(
                    "text-sm mt-2 text-muted-foreground",
                    !initialData.price && initialData.price !== 0 && "text-muted-foreground italic"
                )}>
                    {initialData.price === 0
                      ? "مجاني"
                      : initialData.price
                      ? formatPrice(initialData.price)
                      : "لا يوجد سعر"
                    }
                </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField 
                            control={form.control}
                            name="isFree"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                            }}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            كورس مجاني
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField 
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>السعر (جنيه)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number"
                                            step="0.01"
                                            disabled={isSubmitting || isFree}
                                            placeholder="ضع سعر للكورس"
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                field.onChange(value === '' ? 0 : parseFloat(value));
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button disabled={!isValid || isSubmitting} type="submit">
                                حفظ
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}