import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { SearchInput } from "./_components/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Clock, Users, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Course, Purchase } from "@prisma/client";

type CourseWithDetails = Course & {
    chapters: { id: string }[];
    purchases: Purchase[];
    _count: {
        purchases: number;
    };
    progress: number;
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return redirect("/");
    }

    const resolvedParams = await searchParams;
    const title = typeof resolvedParams.title === 'string' ? resolvedParams.title : '';

    // Get user's grade and division for filtering
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { grade: true, division: true, role: true }
    });

    console.log("[SEARCH_PAGE] User data:", { 
        userId: session.user.id, 
        role: user?.role, 
        grade: user?.grade, 
        division: user?.division,
        title 
    });

    // Build where clause - filter by user's grade/division if they're a student
    let whereClause: any = {
        isPublished: true,
    };

    // Add title filter if exists
    if (title) {
        whereClause.title = {
            contains: title,
            mode: 'insensitive' as const
        };
    }

    // Filter by student's grade and division if they're a regular user
    // If user is teacher/admin, show all courses
    if (user && user.role === "USER" && user.grade && user.division) {
        // Build the filter for courses:
        // 1. Courses with grade="الكل" - show to everyone
        // 2. Courses with matching grade AND student's division in the divisions array
        const gradeDivisionFilter = {
            OR: [
                // Courses for all grades
                { grade: "الكل" },
                // Courses matching student's grade and division
                {
                    AND: [
                        { grade: user.grade },
                        {
                            divisions: {
                                has: user.division
                            }
                        }
                    ]
                }
            ]
        };

        // Build AND clause to combine isPublished, title (if exists), and grade/division filter
        const andConditions: any[] = [
            { isPublished: true },
            gradeDivisionFilter
        ];

        if (title) {
            andConditions.push({
                title: {
                    contains: title,
                    mode: 'insensitive' as const
                }
            });
        }

        whereClause = {
            AND: andConditions
        };
    }

    console.log("[SEARCH_PAGE] Where clause:", JSON.stringify(whereClause, null, 2));

    const courses = await db.course.findMany({
        where: whereClause,
        include: {
            chapters: {
                where: {
                    isPublished: true,
                },
                select: {
                    id: true,
                }
            },
            purchases: {
                where: {
                    userId: session.user.id,
                }
            },
            _count: {
                select: {
                    purchases: true,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        }
    });

    console.log("[SEARCH_PAGE] Found courses:", courses.length);
    if (courses.length > 0) {
        console.log("[SEARCH_PAGE] Sample course:", {
            id: courses[0].id,
            title: courses[0].title,
            grade: courses[0].grade,
            division: courses[0].division,
            isPublished: courses[0].isPublished
        });
    }

    const coursesWithProgress = await Promise.all(
        courses.map(async (course) => {
            const totalChapters = course.chapters.length;
            const completedChapters = await db.userProgress.count({
                where: {
                    userId: session.user.id,
                    chapterId: {
                        in: course.chapters.map(chapter => chapter.id)
                    },
                    isCompleted: true
                }
            });

            const progress = totalChapters > 0 
                ? (completedChapters / totalChapters) * 100 
                : 0;

            return {
                ...course,
                progress
            } as CourseWithDetails;
        })
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">البحث عن الكورسات</h1>
                <p className="text-muted-foreground text-lg">
                    {title 
                        ? `نتائج البحث عن "${title}"`
                        : "اكتشف مجموعة متنوعة من الكورسات التعليمية المميزة"
                    }
                </p>
            </div>

            {/* Search Input Section */}
            <div className="bg-card rounded-2xl p-6 border shadow-sm">
                <div className="max-w-2xl mx-auto">
                    <Suspense fallback={
                        <div className="flex items-center gap-x-3 w-full max-w-2xl">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ابحث عن كورسات تعليمية..."
                                    className="h-12 pr-10 pl-4 text-base border-2"
                                    disabled
                                />
                            </div>
                            <Button 
                                className="h-12 px-6 bg-[#0083d3] hover:bg-[#0083d3]/90 text-white font-semibold"
                                disabled
                            >
                                <Search className="h-4 w-4 ml-2" />
                                بحث
                            </Button>
                        </div>
                    }>
                        <SearchInput />
                    </Suspense>
                </div>
            </div>

            {/* Results Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">
                        {title ? `نتائج البحث (${coursesWithProgress.length})` : `جميع الكورسات (${coursesWithProgress.length})`}
                    </h2>
                    {coursesWithProgress.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            {coursesWithProgress.length} كورس متاح
                        </div>
                    )}
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {coursesWithProgress.map((course) => (
                        <div
                            key={course.id}
                            className="group bg-card rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="relative w-full aspect-[16/9]">
                                <Image
                                    src={course.imageUrl || "/placeholder.png"}
                                    alt={course.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Course Status Badge */}
                                <div className="absolute top-4 right-4">
                                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                                        course.purchases.length > 0 
                                            ? "bg-green-500 text-white" 
                                            : "bg-white/90 backdrop-blur-sm text-gray-800"
                                    }`}>
                                        {course.purchases.length > 0 ? "مشترك" : "متاح"}
                                    </div>
                                </div>

                                {/* Price Badge */}
                                <div className="absolute top-4 left-4">
                                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                                        course.price === 0 
                                            ? "bg-green-500 text-white" 
                                            : "bg-white/90 backdrop-blur-sm text-gray-800"
                                    }`}>
                                        {course.price === 0 ? "مجاني" : `${course.price} جنيه`}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold mb-3 line-clamp-2 min-h-[3rem] text-gray-900">
                                        {course.title}
                                    </h3>
                                    
                                    {/* Course Stats */}
                                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                {course.chapters.length} {course.chapters.length === 1 ? "فصل" : "فصول"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            <span className="whitespace-nowrap">{course._count.purchases} طالب</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span className="whitespace-nowrap">{new Date(course.updatedAt).toLocaleDateString('ar', {
                                                year: 'numeric',
                                                month: 'short'
                                            })}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <Button 
                                    className="w-full bg-[#0083d3] hover:bg-[#0083d3]/90 text-white font-semibold py-3 text-base transition-all duration-200 hover:scale-105" 
                                    variant="default"
                                    asChild
                                >
                                    <Link href={course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                                        {course.purchases.length > 0 ? "متابعة التعلم" : "عرض الكورس"}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {coursesWithProgress.length === 0 && (
                    <div className="text-center py-16">
                        <div className="bg-muted/50 rounded-2xl p-8 max-w-md mx-auto">
                            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {title ? "لم يتم العثور على كورسات" : "لا توجد كورسات متاحة"}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {title 
                                    ? "جرب البحث بكلمات مختلفة أو تصفح جميع الكورسات"
                                    : user && user.role === "USER" && user.grade && user.division
                                        ? `لا توجد كورسات متاحة للصف "${user.grade}" والقسم "${user.division}" حالياً`
                                        : "سيتم إضافة كورسات جديدة قريباً"
                                }
                            </p>
                            {title && (
                                <Button asChild className="bg-[#0083d3] hover:bg-[#0083d3]/90 text-white font-semibold">
                                    <Link href="/dashboard/search">
                                        عرض جميع الكورسات
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}