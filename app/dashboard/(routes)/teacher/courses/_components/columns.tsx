"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export type Course = {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
    createdAt: Date;
    grade?: string | null;
    divisions?: string[];
}

export const columns: ColumnDef<Course>[] = [
    {
        accessorKey: "title",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    العنوان
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "price",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    السعر
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const price = parseFloat(row.getValue("price"));
            return <div>{formatPrice(price)}</div>;
        },
    },
    {
        accessorKey: "isPublished",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    الحالة
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const isPublished = row.getValue("isPublished") || false;
            return (
                <Badge variant={isPublished ? "default" : "secondary"}>
                    {isPublished ? "منشور" : "مسودة"}
                </Badge>
            );
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    انشئ في
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const date = new Date(row.getValue("createdAt"));
            return <div>{format(date, "dd/MM/yyyy", { locale: ar })}</div>;
        },
    },
    {
        id: "gradeDivision",
        header: "الصف والقسم",
        cell: ({ row }) => {
            const grade = row.original.grade;
            const divisions = (row.original as any).divisions || [];
            const legacyDivision = (row.original as any).division;
            
            // Handle legacy single division field
            const displayDivisions = divisions.length > 0 
                ? divisions 
                : legacyDivision 
                    ? [legacyDivision]
                    : [];
            
            if (!grade) {
                return (
                    <Badge variant="secondary" className="text-xs">
                        ⚠️ غير محدد
                    </Badge>
                );
            }
            
            if (grade === "الكل") {
                return (
                    <div className="text-sm">
                        <div className="font-medium">الكل (جميع الصفوف)</div>
                    </div>
                );
            }
            
            return (
                <div className="text-sm">
                    <div className="font-medium">{grade}</div>
                    {displayDivisions.length > 0 ? (
                        <div className="text-muted-foreground text-xs">
                            {displayDivisions.join(", ")}
                        </div>
                    ) : (
                        <Badge variant="secondary" className="text-xs mt-1">
                            ⚠️ غير محدد
                        </Badge>
                    )}
                </div>
            );
        },
    }
]; 