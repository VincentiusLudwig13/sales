"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBasket, Map, ChevronRight, CheckCircle2, Lock, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<"product" | "posm" | "activity">("product");
  
  // Mock validation state for demonstration. 
  // Once hooked to backend, this becomes true when Admin approves both.
  const [isValidated, setIsValidated] = useState(false);

  const tabs = [
    { id: "product", label: "Product", icon: Package },
    { id: "posm", label: "POSM", icon: ShoppingBasket },
    { id: "activity", label: "Activity", icon: Map, locked: !isValidated },
  ] as const;

  return (
    <div className="flex flex-col min-h-full animate-in fade-in duration-500">
      <div className="bg-white px-4 pt-6 pb-2 rounded-b-3xl shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Daily Activity</h2>
        
        {/* Tab Navigation */}
        <div className="flex p-1 space-x-1 bg-slate-100 rounded-2xl relative">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (!tab.locked) setActiveTab(tab.id);
              }}
              disabled={tab.locked}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : tab.locked
                  ? "text-slate-300 cursor-not-allowed opacity-60"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-blue-600" : tab.locked ? "text-slate-300" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.locked && <Lock className="w-3 h-3 ml-1" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {activeTab === "product" && <ProductLoadingTab />}
        {activeTab === "posm" && <PosmLoadingTab />}
        {activeTab === "activity" && <DailyActivityTab />}
      </div>
    </div>
  );
}

// --- TAB COMPONENTS ---

function ProductLoadingTab() {
  const products = [
    { name: "Roti A", qty: 3, price: 5000, value: 15000 },
    { name: "Roti B", qty: 3, price: 6000, value: 18000 },
    { name: "Roti C", qty: 3, price: 7000, value: 21000 },
  ];
  const totalValue = products.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-800">Product Loading</h3>
        <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
          <Lock className="w-3 h-3 mr-1" /> Draft
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-slate-50 p-3 text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
          <div className="col-span-5">Product</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-5 text-right">Value (Rp)</div>
        </div>
        <div className="divide-y divide-slate-100">
          {products.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 p-3 items-center">
              <div className="col-span-5 text-sm font-medium text-slate-900">{p.name}</div>
              <div className="col-span-2 text-center text-sm font-bold text-blue-600 bg-blue-50 py-1 rounded-md">{p.qty}</div>
              <div className="col-span-5 text-right text-sm font-medium text-slate-700">
                {p.value.toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
          <span className="font-bold text-slate-700">Total Value</span>
          <span className="text-lg font-bold text-slate-900">Rp {totalValue.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20">
        Submit for Approval
      </Button>
    </div>
  );
}

function PosmLoadingTab() {
  const posms = [
    { name: "Keranjang Kecil", qty: 3 },
    { name: "Saddle Bag", qty: 3 },
    { name: "Keranjang 80L", qty: 1 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-800">POSM Loading</h3>
        <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
          <div className="col-span-3">POSM Item</div>
          <div className="col-span-1 text-center">Qty</div>
        </div>
        <div className="divide-y divide-slate-100">
          {posms.map((p, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 p-3 items-center">
              <div className="col-span-3 text-sm font-medium text-slate-900">{p.name}</div>
              <div className="col-span-1 text-center text-sm font-bold text-blue-600 bg-blue-50 py-1 rounded-md">{p.qty}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyActivityTab() {
  const outlets = [
    { id: "1", name: "Toko Makmur", p4w: 450000, unpaid: 150000 },
    { id: "2", name: "Toko Sinar Jaya", p4w: 1200000, unpaid: 0 },
    { id: "3", name: "Warung Berkah", p4w: 250000, unpaid: 50000 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 text-white shadow-md">
          <p className="text-blue-100 text-sm font-medium mb-1">Total Nett Sales</p>
          <div className="flex justify-between items-end">
            <h4 className="text-2xl font-bold">Rp 4.500.000</h4>
            <span className="text-sm bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">12 Cust</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-slate-500 text-xs font-medium mb-1">COD Sales</p>
            <h4 className="text-lg font-bold text-slate-900">Rp 1.2M</h4>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-slate-500 text-xs font-medium mb-1">TOP Sales</p>
            <h4 className="text-lg font-bold text-slate-900">Rp 3.3M</h4>
          </div>
        </div>
      </div>

      {/* Outlet Visit List */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 px-1">Outlet Visit List</h3>
        <div className="space-y-3">
          {outlets.map((outlet) => (
            <Card key={outlet.id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden rounded-2xl">
              <div className="p-4 flex items-center">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mr-4 shrink-0 overflow-hidden">
                  <Store className="h-6 w-6 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-slate-900 truncate">{outlet.name}</h4>
                  <div className="flex items-center text-xs text-slate-500 mt-1 space-x-3">
                    <span>P4W: <span className="font-medium text-slate-700">{outlet.p4w / 1000}k</span></span>
                    {outlet.unpaid > 0 ? (
                      <span className="text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded">
                        Unpaid: {outlet.unpaid / 1000}k
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                        Settled
                      </span>
                    )}
                  </div>
                </div>
                <a href={`/visit/${outlet.id}`} className="shrink-0 text-blue-600 ml-2 flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
