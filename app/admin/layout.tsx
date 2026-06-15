"use client";
import React from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, LayoutDashboard, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between shrink-0 p-5">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 mb-8 px-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/35">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white uppercase">Salesman Tools</h1>
              <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Admin Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <a
              href="/admin/dashboard"
              className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-slate-800 text-white font-semibold transition-all hover:bg-slate-800/80 text-sm"
            >
              <LayoutDashboard className="h-4.5 w-4.5 text-indigo-400" />
              <span>Dashboard</span>
            </a>
          </nav>
        </div>

        {/* Footer info & logout */}
        <div className="pt-6 border-t border-slate-800/80 mt-6">
          <div className="flex items-center space-x-3 px-2 mb-4">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4 text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{session?.user?.name || "Admin User"}</p>
              <p className="text-[10px] text-indigo-400 font-medium">Administrator</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full justify-start text-xs font-bold text-slate-400 hover:text-white hover:bg-rose-950/20 hover:text-rose-400 rounded-xl px-4 py-3"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-6 md:px-8 shrink-0">
          <h2 className="text-sm font-semibold text-slate-400">Salesman Tools / Admin</h2>
          <div className="flex items-center space-x-4">
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Console Online
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
