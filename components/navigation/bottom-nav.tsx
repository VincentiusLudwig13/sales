"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Activity",
      href: "/activity",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-50">
      <nav className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full min-h-12 min-w-12 transition-colors",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-8 w-16 items-center justify-center rounded-full transition-all duration-300",
                  isActive ? "bg-blue-100" : "bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive ? "scale-110" : ""
                  )}
                />
              </div>
              <span className="text-[10px] font-medium tracking-wide">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
