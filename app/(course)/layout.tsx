"use client";

import { usePathname } from "next/navigation";
import { CourseNavbar } from "./_components/course-navbar";
import { CourseSidebar } from "./_components/course-sidebar";

const CourseLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const pathname = usePathname();
    const isPreviewPage = pathname?.includes("/preview");

    return (
        <div className="min-h-screen flex flex-col course-layout">
            <div className="h-[80px] fixed inset-x-0 top-0 w-full z-50">
                <CourseNavbar />
            </div>
            {!isPreviewPage && (
                <div className="hidden md:flex h-[calc(100vh-80px)] w-64 md:w-80 flex-col fixed inset-y-0 top-[80px] right-0 z-40 border-l">
                    <CourseSidebar />
                </div>
            )}
            <main className={`pt-[80px] flex-1 ${!isPreviewPage ? "md:pr-64 md:lg:pr-80" : ""}`}>
                {children}
            </main>
        </div>
    );
}

export default CourseLayout; 