"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EditGradeDivisionDialog } from "@/app/dashboard/(routes)/teacher/courses/_components/edit-grade-division-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Course = {
  id: string;
  title: string;
  price: number;
  isPublished: boolean;
  createdAt: string | Date;
  grade?: string | null;
  division?: string | null;
};

export function AdminCoursesTable({ courses, onDeleted }: { courses: Course[]; onDeleted?: () => void }) {
  const router = useRouter();
  const [filterValue, setFilterValue] = useState("");
  
  // Filter courses based on search
  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(filterValue.toLowerCase())
  );

  const handleDelete = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "فشل حذف الكورس");
      }
      toast.success("تم حذف الكورس بنجاح");
      router.refresh();
      onDeleted?.();
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ");
    }
  };

  return (
    <div>
      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute h-4 w-4 top-3 left-3 text-muted-foreground" />
          <Input
            placeholder="ابحث عن الكورسات..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="w-full pl-9"
          />
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العنوان</TableHead>
              <TableHead className="text-right">السعر</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">انشئ في</TableHead>
              <TableHead className="text-right">الصف والقسم</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>{formatPrice(course.price || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={course.isPublished ? "default" : "secondary"}>
                      {course.isPublished ? "منشور" : "مسودة"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(course.createdAt), "dd/MM/yyyy", { locale: ar })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {course.grade ? (
                      course.grade === "الكل" ? (
                        <div className="text-sm">
                          <div className="font-medium">الكل (جميع الصفوف)</div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="font-medium">{course.grade}</div>
                          {(course as any).divisions && (course as any).divisions.length > 0 ? (
                            <div className="text-muted-foreground text-xs">
                              {(course as any).divisions.join(", ")}
                            </div>
                          ) : (course as any).division ? (
                            <div className="text-muted-foreground text-xs">{(course as any).division}</div>
                          ) : (
                            <Badge variant="secondary" className="text-xs mt-1">
                              ⚠️ غير محدد
                            </Badge>
                          )}
                        </div>
                      )
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        ⚠️ غير محدد
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/teacher/courses/${course.id}`}>
                        <Button variant="ghost" size="icon" title="تعديل الكورس">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <EditGradeDivisionDialog course={course as any} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="حذف الكورس">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              لا يمكن التراجع عن هذا العمل. سيتم حذف الكورس وكل محتواها بشكل دائم.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(course.id)}>
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center"
                >
                  لا يوجد نتائج.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


