"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Edit, Trash2, Search, Ticket, X, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Course {
    id: string;
    title: string;
}

interface PromoCode {
    id: string;
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    minPurchase: number | null;
    maxDiscount: number | null;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
    validFrom: string | null;
    validUntil: string | null;
    description: string | null;
    courseIds?: string[];
    createdAt: string;
    updatedAt: string;
}

const TeacherPromoCodesPage = () => {
    const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPromocode, setEditingPromocode] = useState<PromoCode | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [applyToAllCourses, setApplyToAllCourses] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Form state
    const [code, setCode] = useState("");
    const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
    const [discountValue, setDiscountValue] = useState("");
    const [minPurchase, setMinPurchase] = useState("");
    const [maxDiscount, setMaxDiscount] = useState("");
    const [usageLimit, setUsageLimit] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [validFrom, setValidFrom] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        fetchPromocodes();
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                setCourses(data.map((course: any) => ({
                    id: course.id,
                    title: course.title,
                })));
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchPromocodes = async () => {
        try {
            const response = await fetch("/api/promocodes");
            if (response.ok) {
                const data = await response.json();
                setPromocodes(data);
            } else {
                toast.error("حدث خطأ أثناء جلب الكوبونات");
            }
        } catch (error) {
            console.error("Error fetching promocodes:", error);
            toast.error("حدث خطأ أثناء جلب الكوبونات");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCode("");
        setDiscountType("PERCENTAGE");
        setDiscountValue("");
        setMinPurchase("");
        setMaxDiscount("");
        setUsageLimit("");
        setIsActive(true);
        setValidFrom("");
        setValidUntil("");
        setDescription("");
        setSelectedCourseIds([]);
        setApplyToAllCourses(true);
        setSearchQuery("");
        setEditingPromocode(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (promocode: PromoCode) => {
        setCode(promocode.code);
        setDiscountType(promocode.discountType);
        setDiscountValue(promocode.discountValue.toString());
        setMinPurchase(promocode.minPurchase?.toString() || "");
        setMaxDiscount(promocode.maxDiscount?.toString() || "");
        setUsageLimit(promocode.usageLimit?.toString() || "");
        setIsActive(promocode.isActive);
        setValidFrom(promocode.validFrom ? promocode.validFrom.split("T")[0] : "");
        setValidUntil(promocode.validUntil ? promocode.validUntil.split("T")[0] : "");
        setDescription(promocode.description || "");
        const courseIds = promocode.courseIds || [];
        setSelectedCourseIds(courseIds);
        setApplyToAllCourses(courseIds.length === 0);
        setEditingPromocode(promocode);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        // Validation
        if (!code.trim()) {
            toast.error("رمز الكوبون مطلوب");
            return;
        }

        if (!discountValue || parseFloat(discountValue) <= 0) {
            toast.error("قيمة الخصم يجب أن تكون أكبر من الصفر");
            return;
        }

        const data = {
            code: code.trim(),
            discountType,
            discountValue: parseFloat(discountValue),
            minPurchase: minPurchase ? parseFloat(minPurchase) : null,
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            isActive,
            validFrom: validFrom || null,
            validUntil: validUntil || null,
            description: description.trim() || null,
            courseIds: applyToAllCourses ? [] : selectedCourseIds,
        };

        try {
            const url = editingPromocode 
                ? `/api/promocodes/${editingPromocode.id}`
                : "/api/promocodes";
            const method = editingPromocode ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast.success(editingPromocode ? "تم تحديث الكوبون بنجاح" : "تم إنشاء الكوبون بنجاح");
                setIsDialogOpen(false);
                resetForm();
                fetchPromocodes();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "حدث خطأ");
            }
        } catch (error) {
            console.error("Error saving promocode:", error);
            toast.error("حدث خطأ أثناء حفظ الكوبون");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الكوبون؟")) {
            return;
        }

        try {
            const response = await fetch(`/api/promocodes/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف الكوبون بنجاح");
                fetchPromocodes();
            } else {
                toast.error("حدث خطأ أثناء حذف الكوبون");
            }
        } catch (error) {
            console.error("Error deleting promocode:", error);
            toast.error("حدث خطأ أثناء حذف الكوبون");
        }
    };

    const filteredPromocodes = promocodes.filter(promo =>
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (promo.description && promo.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    كوبونات الخصم
                </h1>
                <Button onClick={openCreateDialog} className="bg-[#0083d3] hover:bg-[#0083d3]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء كوبون جديد
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>قائمة الكوبونات</CardTitle>
                    <div className="flex items-center space-x-2 mt-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث برمز الكوبون أو الوصف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredPromocodes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الرمز</TableHead>
                                    <TableHead className="text-right">نوع الخصم</TableHead>
                                    <TableHead className="text-right">قيمة الخصم</TableHead>
                                    <TableHead className="text-right">الحد الأدنى</TableHead>
                                    <TableHead className="text-right">الاستخدام</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPromocodes.map((promo) => (
                                    <TableRow key={promo.id}>
                                        <TableCell className="font-mono font-bold">
                                            <Badge variant="outline" className="gap-1">
                                                <Ticket className="h-3 w-3" />
                                                {promo.code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {promo.discountType === "PERCENTAGE" ? "نسبة مئوية" : "مبلغ ثابت"}
                                        </TableCell>
                                        <TableCell>
                                            {promo.discountType === "PERCENTAGE" 
                                                ? `${promo.discountValue}%` 
                                                : `${promo.discountValue} جنيه`}
                                        </TableCell>
                                        <TableCell>
                                            {promo.minPurchase ? `${promo.minPurchase} جنيه` : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {promo.usageLimit 
                                                ? `${promo.usedCount}/${promo.usageLimit}` 
                                                : promo.usedCount}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={promo.isActive ? "default" : "secondary"}>
                                                {promo.isActive ? "نشط" : "غير نشط"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditDialog(promo)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(promo.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            {searchTerm ? "لا توجد نتائج" : "لا توجد كوبونات"}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPromocode ? "تعديل الكوبون" : "إنشاء كوبون جديد"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPromocode ? "قم بتعديل بيانات الكوبون" : "قم بإنشاء كوبون خصم جديد"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">رمز الكوبون *</Label>
                                <Input
                                    id="code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="مثال: SUMMER2024"
                                    disabled={!!editingPromocode}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="discountType">نوع الخصم *</Label>
                                <Select value={discountType} onValueChange={(value: "PERCENTAGE" | "FIXED") => setDiscountType(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERCENTAGE">نسبة مئوية (%)</SelectItem>
                                        <SelectItem value="FIXED">مبلغ ثابت (جنيه)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="discountValue">قيمة الخصم *</Label>
                                <Input
                                    id="discountValue"
                                    type="number"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                    placeholder={discountType === "PERCENTAGE" ? "مثال: 20" : "مثال: 50"}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            {discountType === "PERCENTAGE" && (
                                <div className="space-y-2">
                                    <Label htmlFor="maxDiscount">الحد الأقصى للخصم (جنيه)</Label>
                                    <Input
                                        id="maxDiscount"
                                        type="number"
                                        value={maxDiscount}
                                        onChange={(e) => setMaxDiscount(e.target.value)}
                                        placeholder="مثال: 100"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minPurchase">الحد الأدنى للشراء (جنيه)</Label>
                                <Input
                                    id="minPurchase"
                                    type="number"
                                    value={minPurchase}
                                    onChange={(e) => setMinPurchase(e.target.value)}
                                    placeholder="مثال: 100"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="usageLimit">الحد الأقصى للاستخدام</Label>
                                <Input
                                    id="usageLimit"
                                    type="number"
                                    value={usageLimit}
                                    onChange={(e) => setUsageLimit(e.target.value)}
                                    placeholder="مثال: 100"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="validFrom">تاريخ البداية</Label>
                                <Input
                                    id="validFrom"
                                    type="date"
                                    value={validFrom}
                                    onChange={(e) => setValidFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="validUntil">تاريخ الانتهاء</Label>
                                <Input
                                    id="validUntil"
                                    type="date"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">الوصف</Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="وصف الكوبون (اختياري)"
                            />
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <Label>الكورسات المطبقة عليها الكوبون</Label>
                            <div className="flex items-center space-x-2 space-x-reverse">
                                <Checkbox
                                    id="applyToAll"
                                    checked={applyToAllCourses}
                                    onCheckedChange={(checked) => {
                                        setApplyToAllCourses(checked as boolean);
                                        if (checked) {
                                            setSelectedCourseIds([]);
                                        }
                                    }}
                                />
                                <Label htmlFor="applyToAll" className="cursor-pointer font-normal">
                                    ينطبق على جميع الكورسات
                                </Label>
                            </div>
                            {!applyToAllCourses && (
                                <div className="space-y-2 mt-3">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between h-auto min-h-10 py-2"
                                            >
                                                <div className="flex flex-wrap gap-1 flex-1">
                                                    {selectedCourseIds.length === 0 ? (
                                                        <span className="text-muted-foreground">اختر الكورسات...</span>
                                                    ) : (
                                                        selectedCourseIds.map((courseId) => {
                                                            const course = courses.find(c => c.id === courseId);
                                                            return course ? (
                                                                <Badge
                                                                    key={courseId}
                                                                    variant="secondary"
                                                                    className="mr-1 mb-1"
                                                                >
                                                                    {course.title}
                                                                    <button
                                                                        className="mr-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") {
                                                                                setSelectedCourseIds(selectedCourseIds.filter(id => id !== courseId));
                                                                            }
                                                                        }}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                        }}
                                                                        onClick={() => {
                                                                            setSelectedCourseIds(selectedCourseIds.filter(id => id !== courseId));
                                                                        }}
                                                                    >
                                                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                    </button>
                                                                </Badge>
                                                            ) : null;
                                                        })
                                                    )}
                                                </div>
                                                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent 
                                            className="w-[var(--radix-popover-trigger-width)] p-0 z-[102]" 
                                            align="start"
                                            onWheel={(e) => e.stopPropagation()}
                                            onTouchMove={(e) => e.stopPropagation()}
                                        >
                                            <Command shouldFilter={false}>
                                                <CommandInput 
                                                    placeholder="ابحث عن كورس..." 
                                                    value={searchQuery}
                                                    onValueChange={setSearchQuery}
                                                />
                                                <CommandList 
                                                    className="max-h-[300px] overflow-y-auto overscroll-contain"
                                                    style={{ 
                                                        touchAction: 'pan-y',
                                                        WebkitOverflowScrolling: 'touch'
                                                    }}
                                                    onWheel={(e) => {
                                                        e.stopPropagation();
                                                        const target = e.currentTarget;
                                                        if (!target) return;
                                                        
                                                        const scrollTop = target.scrollTop;
                                                        const scrollHeight = target.scrollHeight;
                                                        const clientHeight = target.clientHeight;
                                                        const isAtTop = scrollTop <= 0;
                                                        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
                                                        
                                                        // Only prevent default if we're at the boundary
                                                        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onTouchStart={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    onTouchMove={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    onTouchEnd={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <CommandEmpty>لا يوجد كورسات.</CommandEmpty>
                                                    <CommandGroup>
                                                        {courses
                                                            .filter(course => 
                                                                searchQuery === "" || 
                                                                course.title.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .map((course) => (
                                                                <CommandItem
                                                                    key={course.id}
                                                                    value={course.title}
                                                                    onSelect={() => {
                                                                        if (selectedCourseIds.includes(course.id)) {
                                                                            setSelectedCourseIds(selectedCourseIds.filter(id => id !== course.id));
                                                                        } else {
                                                                            setSelectedCourseIds([...selectedCourseIds, course.id]);
                                                                        }
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedCourseIds.includes(course.id) ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {course.title}
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {selectedCourseIds.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            تم اختيار {selectedCourseIds.length} كورس
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="isActive" className="cursor-pointer">
                                نشط
                            </Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                إلغاء
                            </Button>
                            <Button onClick={handleSubmit} className="bg-[#0083d3] hover:bg-[#0083d3]/90">
                                {editingPromocode ? "تحديث" : "إنشاء"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherPromoCodesPage;
