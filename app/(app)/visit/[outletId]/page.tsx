"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Box, ShoppingCart, Tag, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function StoreVisitPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"stock" | "posm" | "order">("stock");

  const tabs = [
    { id: "stock", label: "Stock", icon: Box },
    { id: "posm", label: "POSM", icon: Tag },
    { id: "order", label: "Order", icon: ShoppingCart },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-12 pb-6 shadow-md relative z-10">
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-blue-500 hover:text-white mr-2 -ml-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Toko Makmur</h1>
            <p className="text-blue-200 text-sm">ID: {params.outletId}</p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex bg-blue-700/50 p-1 rounded-xl backdrop-blur-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-blue-100 hover:text-white hover:bg-blue-500/50"
              }`}
            >
              <tab.icon className="h-5 w-5 mb-1" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-24">
        {activeTab === "stock" && <CheckStockTab />}
        {activeTab === "posm" && <CheckPosmTab />}
        {activeTab === "order" && <OrderTab />}
      </div>
    </div>
  );
}

// --- TABS ---

function CheckStockTab() {
  const stockItems = [
    { id: 1, name: "Roti A", qty: 0, ed: "" },
    { id: 2, name: "Roti B", qty: 2, ed: "2026-06-15" },
    { id: 3, name: "Roti C", qty: 0, ed: "" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800 px-1">Check Current Stock</h3>
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-100">
          {stockItems.map((item) => (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-900">{item.name}</span>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Value: Rp 0</span>
              </div>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Qty</label>
                  <Input type="number" defaultValue={item.qty} className="h-10 bg-slate-50 border-slate-200" />
                </div>
                <div className="flex-[2]">
                  <label className="text-xs text-slate-500 mb-1 block">Expiry Date</label>
                  <Input type="date" defaultValue={item.ed} className="h-10 bg-slate-50 border-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20">
        Save Stock Data
      </Button>
    </div>
  );
}

function CheckPosmTab() {
  const posmItems = [
    { id: 1, name: "Keranjang Kecil", qty: 1 },
    { id: 2, name: "Saddle Bag", qty: 0 },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800 px-1">Check POSM Present</h3>
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-100">
          {posmItems.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between">
              <span className="font-semibold text-slate-900">{item.name}</span>
              <div className="w-24">
                <Input type="number" defaultValue={item.qty} className="h-10 bg-slate-50 border-slate-200 text-center" />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20">
        Save POSM Data
      </Button>
    </div>
  );
}

function OrderTab() {
  return (
    <div className="space-y-6">
      {/* Outstanding Bill Section */}
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
          <ShoppingCart className="w-16 h-16 text-rose-500" />
        </div>
        <h3 className="text-sm font-bold text-rose-800 mb-1">Unpaid Bills</h3>
        <p className="text-2xl font-bold text-rose-600 mb-3">Rp 7.500</p>
        
        <div className="bg-white rounded-lg p-3 text-sm border border-rose-100">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
            <span className="text-slate-600">Inv 001 - Over Due</span>
            <span className="font-semibold text-rose-600">Rp 2.500</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Inv 002 - Non Due</span>
            <span className="font-semibold text-slate-900">Rp 5.000</span>
          </div>
        </div>
        
        <Button variant="outline" className="w-full mt-3 bg-white border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
          Settle Payment
        </Button>
      </div>

      {/* New Order Form */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 px-1 mb-3">New Order Entry</h3>
        <Card className="border-none shadow-sm rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Product</label>
              <select className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Roti A</option>
                <option>Roti B</option>
                <option>Roti C</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Qty</label>
              <Input type="number" defaultValue={3} className="h-10 bg-slate-50 border-slate-200" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Discount (Rp)</label>
              <Input type="number" defaultValue={3000} className="h-10 bg-slate-50 border-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Payment Term</label>
              <select className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>COD</option>
                <option>3 Days</option>
                <option>4 Days</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
            <span className="text-sm text-slate-500 font-medium">Nett Sales</span>
            <span className="font-bold text-slate-900">Rp 6.000</span>
          </div>
          
          <Button variant="outline" className="w-full border-dashed border-2 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50">
            + Add Another Product
          </Button>
        </Card>
      </div>

      {/* Camera Attachment */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 px-1 mb-2">Attachments (Required)</h3>
        <button className="w-full h-24 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
          <Camera className="h-6 w-6 mb-1" />
          <span className="text-sm font-medium">Take Photo of Nota & Products</span>
        </button>
      </div>

      <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-600/30">
        Submit Order
      </Button>
    </div>
  );
}
