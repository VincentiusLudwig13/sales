"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBasket, Map, ChevronRight, CheckCircle2, Lock, Store, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<"product" | "posm" | "activity">("product");
  const [isValidated, setIsValidated] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState({ product: "DRAFT", posm: "DRAFT" });
  const [statusLoading, setStatusLoading] = useState(true);

  const fetchStatus = () => {
    setStatusLoading(true);
    fetch("/api/activity/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.isValidated) {
          setIsValidated(true);
          setActiveTab("activity");
        } else {
          setIsValidated(false);
        }
        setLoadingStatus({
          product: data.productLoadingStatus ?? "DRAFT",
          posm: data.posmLoadingStatus ?? "DRAFT",
        });
        setStatusLoading(false);
      })
      .catch(() => setStatusLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const tabs = [
    { id: "product", label: "Product", icon: Package, locked: false },
    { id: "posm", label: "POSM", icon: ShoppingBasket, locked: false },
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
              onClick={() => { if (!tab.locked) setActiveTab(tab.id); }}
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

      {/* DEV TEST BUTTON — Remove before production */}
      {!isValidated && (
        <div className="px-4 pt-3">
          <button
            onClick={async () => {
              const res = await fetch("/api/dev/approve-all", { method: "POST" });
              const data = await res.json();
              if (res.ok && (data.productUpdated > 0 || data.posmUpdated > 0)) {
                fetchStatus();
              } else {
                alert("Nothing to approve yet — submit Product and POSM loading first!");
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-amber-400 text-amber-700 bg-amber-50 text-sm font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
          >
            ⚡ [TEST ONLY] Approve Product &amp; POSM Loading
          </button>
        </div>
      )}

      <div className="flex-1 p-4">
        {activeTab === "product" && <ProductLoadingTab status={loadingStatus.product} onSubmitted={fetchStatus} />}
        {activeTab === "posm" && <PosmLoadingTab status={loadingStatus.posm} onSubmitted={fetchStatus} />}
        {activeTab === "activity" && <DailyActivityTab />}
      </div>
    </div>
  );
}

// --- STATUS BADGE ---
function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</span>;
  if (status === "PENDING")
    return <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Pending Approval</span>;
  return <span className="flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200"><Lock className="w-3 h-3 mr-1" /> Draft</span>;
}

// --- PRODUCT LOADING TAB ---
function ProductLoadingTab({ status, onSubmitted }: { status: string; onSubmitted: () => void }) {
  const [products, setProducts] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.map((p: any) => ({ ...p, qty: 0 })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateQty = (id: string, qty: number) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, qty: Math.max(0, qty) } : p)));
  };

  const totalValue = products.reduce((sum, p) => sum + p.price * p.qty, 0);

  const handleSubmit = async () => {
    if (products.every((p) => p.qty === 0)) return alert("Please enter at least one product quantity.");
    setSubmitting(true);
    const items = products.filter((p) => p.qty > 0).map((p) => ({
      productId: p.id,
      qty: p.qty,
      value: p.price * p.qty,
    }));
    const res = await fetch("/api/loading/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSubmitting(false);
    if (res.ok) onSubmitted();
    else alert("Failed to submit. Please try again.");
  };

  const isLocked = status === "PENDING" || status === "APPROVED";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-800">Product Loading</h3>
        <StatusBadge status={status} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 p-3 text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
            <div className="col-span-5">Product</div>
            <div className="col-span-3 text-center">Qty</div>
            <div className="col-span-4 text-right">Value (Rp)</div>
          </div>
          <div className="divide-y divide-slate-100">
            {products.map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 p-3 items-center">
                <div className="col-span-5 text-sm font-medium text-slate-900">{p.name}</div>
                <div className="col-span-3 text-center">
                  {isLocked ? (
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 py-1 px-2 rounded-md">{p.qty}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={p.qty}
                      onChange={(e) => updateQty(p.id, parseInt(e.target.value) || 0)}
                      className="w-full text-center text-sm font-bold text-blue-600 bg-blue-50 py-1 rounded-md border border-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                  )}
                </div>
                <div className="col-span-4 text-right text-sm font-medium text-slate-700">
                  {(p.price * p.qty).toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-700">Total Value</span>
            <span className="text-lg font-bold text-slate-900">Rp {totalValue.toLocaleString("id-ID")}</span>
          </div>
        </div>
      )}

      {!isLocked && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20"
        >
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit for Approval"}
        </Button>
      )}
    </div>
  );
}

// --- POSM LOADING TAB ---
function PosmLoadingTab({ status, onSubmitted }: { status: string; onSubmitted: () => void }) {
  const [posms, setPosms] = useState<{ id: string; name: string; qty: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posms")
      .then((r) => r.json())
      .then((data) => {
        setPosms(data.map((p: any) => ({ ...p, qty: 0 })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateQty = (id: string, qty: number) => {
    setPosms((prev) => prev.map((p) => (p.id === id ? { ...p, qty: Math.max(0, qty) } : p)));
  };

  const handleSubmit = async () => {
    if (posms.every((p) => p.qty === 0)) return alert("Please enter at least one POSM quantity.");
    setSubmitting(true);
    const items = posms.filter((p) => p.qty > 0).map((p) => ({ posmId: p.id, qty: p.qty }));
    const res = await fetch("/api/loading/posm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSubmitting(false);
    if (res.ok) onSubmitted();
    else alert("Failed to submit. Please try again.");
  };

  const isLocked = status === "PENDING" || status === "APPROVED";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-800">POSM Loading</h3>
        <StatusBadge status={status} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
            <div className="col-span-3">POSM Item</div>
            <div className="col-span-1 text-center">Qty</div>
          </div>
          <div className="divide-y divide-slate-100">
            {posms.map((p) => (
              <div key={p.id} className="grid grid-cols-4 gap-2 p-3 items-center">
                <div className="col-span-3 text-sm font-medium text-slate-900">{p.name}</div>
                <div className="col-span-1 text-center">
                  {isLocked ? (
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 py-1 px-2 rounded-md">{p.qty}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={p.qty}
                      onChange={(e) => updateQty(p.id, parseInt(e.target.value) || 0)}
                      className="w-full text-center text-sm font-bold text-blue-600 bg-blue-50 py-1 rounded-md border border-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLocked && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20"
        >
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit for Approval"}
        </Button>
      )}
    </div>
  );
}

// --- DAILY ACTIVITY TAB ---
function DailyActivityTab() {
  const [outlets, setOutlets] = useState<{ id: string; name: string; bills: { outstanding: number }[]; orders: { nettSales: number }[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/outlets")
      .then((r) => r.json())
      .then((data) => { setOutlets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalNett = outlets.reduce((s, o) => s + o.orders.reduce((a, b) => a + b.nettSales, 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 text-white shadow-md">
          <p className="text-blue-100 text-sm font-medium mb-1">Total Nett Sales Today</p>
          <div className="flex justify-between items-end">
            <h4 className="text-2xl font-bold">Rp {totalNett.toLocaleString("id-ID")}</h4>
            <span className="text-sm bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">{outlets.length} Outlets</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 px-1">Outlet Visit List</h3>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-3">
            {outlets.map((outlet) => {
              const unpaid = outlet.bills.reduce((s, b) => s + b.outstanding, 0);
              return (
                <Card key={outlet.id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden rounded-2xl">
                  <div className="p-4 flex items-center">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mr-4 shrink-0">
                      <Store className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-slate-900 truncate">{outlet.name}</h4>
                      <div className="flex items-center text-xs text-slate-500 mt-1 space-x-3">
                        {unpaid > 0 ? (
                          <span className="text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded">
                            Unpaid: Rp {unpaid.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">Settled</span>
                        )}
                      </div>
                    </div>
                    <a href={`/visit/${outlet.id}`} className="shrink-0 text-blue-600 ml-2 flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
                      <ChevronRight className="h-5 w-5" />
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
