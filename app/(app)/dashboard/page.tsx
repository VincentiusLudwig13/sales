"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CheckCircle2, Wallet, Store, MapPin, Users, User, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

type DashboardData = {
  totalSales: number;
  paidBill: number;
  unpaidBill: number;
  outletActive: number;
  outletVisit: number;
  totalCall: number;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const currentMonth = format(new Date(), "MMMM yyyy");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (val: number) =>
    "Rp " + val.toLocaleString("id-ID");

  const metrics = [
    { title: "Total Sales", value: loading ? "..." : fmt(data?.totalSales ?? 0), icon: TrendingUp, color: "text-blue-600", bgColor: "bg-blue-100" },
    { title: "Paid Bill", value: loading ? "..." : fmt(data?.paidBill ?? 0), icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { title: "Unpaid Bill", value: loading ? "..." : fmt(data?.unpaidBill ?? 0), icon: Wallet, color: "text-rose-600", bgColor: "bg-rose-100" },
    { title: "Outlet Active", value: loading ? "..." : String(data?.outletActive ?? 0), icon: Store, color: "text-indigo-600", bgColor: "bg-indigo-100" },
    { title: "Outlet Visit", value: loading ? "..." : String(data?.outletVisit ?? 0), icon: MapPin, color: "text-amber-600", bgColor: "bg-amber-100" },
    { title: "Total Call", value: loading ? "..." : String(data?.totalCall ?? 0), icon: Users, color: "text-violet-600", bgColor: "bg-violet-100" },
  ];

  return (
    <div className="flex flex-col min-h-full animate-in fade-in duration-500">
      {/* Header Profile Section */}
      <div className="bg-white px-4 pt-8 pb-6 rounded-b-3xl shadow-sm border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-md">
              <User className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Welcome back,</p>
              <h2 className="text-xl font-bold text-slate-900">
                {session?.user?.name ?? "Loading..."}
              </h2>
            </div>
          </div>
          <button className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
            <CalendarIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-800">Performance Overview</h3>
          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
            {currentMonth}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group rounded-2xl overflow-hidden relative">
              <div className={`absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform group-hover:scale-110 transition-transform`}>
                <metric.icon className="w-16 h-16" />
              </div>
              <CardContent className="p-5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${metric.bgColor}`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">{metric.title}</p>
                  <p className="text-lg font-bold text-slate-900">{metric.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
