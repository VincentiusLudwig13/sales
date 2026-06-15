"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  TrendingUp,
  Coins,
  Store,
  Clock,
  Check,
  Package,
  Tag,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  FileText,
  CircleCheck,
  Search,
  Filter,
  TrendingDown,
  Activity
} from "lucide-react";

interface ProductItem {
  id: string;
  qty: number;
  value: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

interface PosmItem {
  id: string;
  qty: number;
  posm: {
    id: string;
    name: string;
  };
}

interface PendingProductReport {
  id: string;
  date: string;
  status: string;
  totalValue: number;
  user: {
    id: string;
    name: string;
    username: string;
  };
  items: ProductItem[];
}

interface PendingPosmReport {
  id: string;
  date: string;
  status: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
  items: PosmItem[];
}

// Outstanding order bill shown as a card in the Payments queue
interface PendingBill {
  id: string;
  date: string;
  value: number;
  outstanding: number;
  settled: number;
  status: string;
  outlet: {
    id: string;
    name: string;
  };
  order: {
    id: string;
    date: string;
    nettSales: number;
    topTerm: string;
    collectionAmount: number;
  } | null;
}

// Collection-only PaymentSettlement shown as picker options
interface PendingCollection {
  id: string;
  amount: number;
  createdAt: string;
  collectionOnly: boolean;
  user: { id: string; name: string };
}

// Direct (bundled) settlement for simple approve/reject
interface PendingDirectSettlement {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user: { id: string; name: string };
  bill: {
    id: string;
    value: number;
    outlet: { id: string; name: string };
    order: { id: string; date: string; nettSales: number; collectionAmount: number } | null;
  };
}

interface SalesmanStatus {
  id: string;
  name: string;
  username: string;
  productStatus: string;
  posmStatus: string;
  isClosed: boolean;
  visitsCount: number;
  todaySales: number;
}

interface MtdOrder {
  date: string;
  nettSales: number;
}

interface StoreActivity {
  active: number;
  inactive: number;
  total: number;
}

interface BillSettlement {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
  };
}

interface AllBill {
  id: string;
  date: string;
  value: number;
  settled: number;
  outstanding: number;
  status: string;
  outlet: {
    id: string;
    name: string;
  };
  order: {
    id: string;
    date: string;
    nettSales: number;
  } | null;
  settlements: BillSettlement[];
}

interface DashboardData {
  metrics: {
    totalSales: number;
    totalCollectionTarget: number;
    totalCollectionActual: number;
    todayVisitsCount: number;
    totalOutletsCount: number;
    pendingProductReportsCount: number;
    pendingPosmReportsCount: number;
    pendingSettlementsCount: number; // = outstanding order bills count
  };
  pendingProductReports: PendingProductReport[];
  pendingPosmReports: PendingPosmReport[];
  pendingBills: PendingBill[];
  pendingDirectSettlements: PendingDirectSettlement[];
  salesmenStatuses: SalesmanStatus[];
  mtdOrders: MtdOrder[];
  storeActivity: StoreActivity;
  allBills: AllBill[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"loading" | "payments" | "analytics">("loading");
  const [loadingSubTab, setLoadingSubTab] = useState<"product" | "posm">("product");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Expanded list rows for viewing item details
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Ledger state variables
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatus, setLedgerStatus] = useState<"ALL" | "PAID" | "PARTIAL" | "UNPAID">("ALL");
  const [expandedLedgerBill, setExpandedLedgerBill] = useState<string | null>(null);

  // Payments tab search state
  const [paymentsSearch, setPaymentsSearch] = useState("");

  // Per-bill: which collection-only PaymentSettlement the admin has selected
  const [selectedCollectionMap, setSelectedCollectionMap] = useState<Record<string, string>>({});

  // Per-bill: list of available collection-only submissions (loaded lazily when row expands)
  const [outletCollectionsMap, setOutletCollectionsMap] = useState<Record<string, PendingCollection[]>>({});
  const [loadingCollectionsFor, setLoadingCollectionsFor] = useState<string | null>(null);

  const fetchDashboardData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        console.error("Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Error fetching admin dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Load pending collection-only submissions for an outlet when admin expands a bill row
  const loadOutletCollections = useCallback(async (billId: string, outletId: string) => {
    if (outletCollectionsMap[billId]) return; // already loaded
    setLoadingCollectionsFor(billId);
    try {
      const res = await fetch(`/api/outlets/${outletId}/collections`);
      if (res.ok) {
        const collections: PendingCollection[] = await res.json();
        setOutletCollectionsMap((prev) => ({ ...prev, [billId]: collections }));
      }
    } catch (err) {
      console.error("Error loading outlet collections:", err);
    } finally {
      setLoadingCollectionsFor(null);
    }
  }, [outletCollectionsMap]);

  const handleExpandBill = (bill: PendingBill) => {
    const isExpanded = expandedRow === bill.id;
    if (isExpanded) {
      setExpandedRow(null);
    } else {
      setExpandedRow(bill.id);
      loadOutletCollections(bill.id, bill.outlet.id);
    }
  };

  // Admin settles a bill — must have selected a collection-only submission first
  const handleBillSettle = (bill: PendingBill) => {
    const selectedCollectionId = selectedCollectionMap[bill.id];
    if (!selectedCollectionId) {
      alert("Please select a collection entry to match this bill before approving.");
      return;
    }
    const collections = outletCollectionsMap[bill.id] ?? [];
    const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
    if (!selectedCollection) return;

    // Validate: collection amount must not exceed the bill's outstanding balance
    if (selectedCollection.amount > bill.outstanding + 0.01) {
      alert(`Collection amount (Rp ${selectedCollection.amount.toLocaleString("id-ID")}) exceeds bill outstanding (Rp ${bill.outstanding.toLocaleString("id-ID")}). Cannot approve.`);
      return;
    }

    handleAction("bill_settlement", bill.id, "approve", undefined, selectedCollectionId);
  };

  const handleAction = async (
    type: "product_loading" | "posm_loading" | "settlement" | "bill_settlement",
    id: string,
    action: "approve" | "reject",
    targetBillId?: string,
    collectionId?: string
  ) => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;

    setProcessingId(id);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, id, action,
          ...(targetBillId ? { targetBillId } : {}),
          ...(collectionId ? { collectionId } : {})
        })
      });

      if (res.ok) {
        alert(`Request ${action}d successfully!`);
        fetchDashboardData(true);
        // Clear cached collection data for this bill
        setOutletCollectionsMap((prev) => { const n = { ...prev }; delete n[id]; return n; });
        setSelectedCollectionMap((prev) => { const n = { ...prev }; delete n[id]; return n; });
      } else {
        const errorData = await res.json();
        alert(`Action failed: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while processing approval.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold tracking-wide uppercase">Assembling Console Metrics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p className="text-sm">Failed to load admin dashboard. Please try again.</p>
        <Button onClick={() => fetchDashboardData(true)} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const { metrics, pendingProductReports, pendingPosmReports, pendingBills, pendingDirectSettlements, salesmenStatuses } = data;
  const totalPendingApprovals = metrics.pendingProductReportsCount + metrics.pendingPosmReportsCount + metrics.pendingSettlementsCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner and Refresh Control */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-md">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Overview of salesmen performance, loading report approvals, and cash collection auditing.
          </p>
        </div>
        <Button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          variant="outline"
          className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl px-4 py-2 flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          <span className="text-xs font-bold uppercase tracking-wider">{refreshing ? "Syncing..." : "Sync Monitor"}</span>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Net Sales */}
        <Card className="bg-slate-900 border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:border-slate-700/80 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Sales</p>
              <h3 className="text-xl font-extrabold text-white mt-1.5">
                Rp {metrics.totalSales.toLocaleString("id-ID")}
              </h3>
              <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                Live Revenue Today
              </p>
            </div>
            <div className="h-12 w-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Collections target vs actual */}
        <Card className="bg-slate-900 border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:border-slate-700/80 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Collections Audited</p>
                <h3 className="text-xl font-extrabold text-white mt-1.5">
                  Rp {metrics.totalCollectionActual.toLocaleString("id-ID")}
                </h3>
              </div>
              <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[9px] font-semibold text-slate-400 mb-1">
                <span>Target: Rp {metrics.totalCollectionTarget.toLocaleString("id-ID")}</span>
                <span>{metrics.totalCollectionTarget > 0 ? Math.round((metrics.totalCollectionActual / metrics.totalCollectionTarget) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${metrics.totalCollectionTarget > 0 ? (metrics.totalCollectionActual / metrics.totalCollectionTarget) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Outlets Visited */}
        <Card className="bg-slate-900 border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:border-slate-700/80 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Check-Ins Completed</p>
                <h3 className="text-xl font-extrabold text-white mt-1.5">
                  {metrics.todayVisitsCount} <span className="text-xs text-slate-500 font-bold">visits</span>
                </h3>
              </div>
              <div className="h-12 w-12 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-500/20 shrink-0">
                <Store className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[9px] font-semibold text-slate-400 mb-1">
                <span>Total Registered Outlets: {metrics.totalOutletsCount}</span>
                <span>{metrics.totalOutletsCount > 0 ? Math.round((metrics.todayVisitsCount / metrics.totalOutletsCount) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${metrics.totalOutletsCount > 0 ? (metrics.todayVisitsCount / metrics.totalOutletsCount) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Pending Approvals */}
        <Card className={`bg-slate-900 border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:border-slate-700/80 transition-colors ${totalPendingApprovals > 0 ? "ring-1 ring-amber-500/20" : ""}`}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Approvals Queue</p>
              <h3 className="text-xl font-extrabold text-white mt-1.5">
                {totalPendingApprovals} <span className="text-xs text-slate-500 font-bold">pending</span>
              </h3>
              <p className={`text-[10px] mt-1.5 flex items-center gap-1 font-semibold ${totalPendingApprovals > 0 ? "text-amber-400" : "text-slate-400"}`}>
                <Clock className="w-3.5 h-3.5" />
                {totalPendingApprovals > 0 ? "Needs Review ASAP" : "All Caught Up"}
              </p>
            </div>
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shrink-0 ${totalPendingApprovals > 0 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-800 text-slate-500 border-slate-700"}`}>
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Approvals Board / Analytics Panel */}
        <div className={activeTab === "analytics" ? "lg:col-span-12 space-y-6" : "lg:col-span-8 space-y-4"}>
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <h3 className="text-lg font-black text-white">
              {activeTab === "analytics" ? "Ledger & Analytics Console" : "Approvals Workbench"}
            </h3>
            
            {/* Approvals tab selectors */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveTab("loading");
                  setExpandedRow(null);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "loading"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-205"
                }`}
              >
                Loading ({metrics.pendingProductReportsCount + metrics.pendingPosmReportsCount})
              </button>
              <button
                onClick={() => {
                  setActiveTab("payments");
                  setExpandedRow(null);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "payments"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-205"
                }`}
              >
                Payments ({metrics.pendingSettlementsCount})
              </button>
              <button
                onClick={() => {
                  setActiveTab("analytics");
                  setExpandedRow(null);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "analytics"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-205"
                }`}
              >
                Analytics & Ledger
              </button>
            </div>
          </div>

          {/* Loading reports container */}
          {activeTab === "loading" && (
            <div className="space-y-4">
              {/* Product vs POSM subtabs */}
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setLoadingSubTab("product");
                    setExpandedRow(null);
                  }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    loadingSubTab === "product"
                      ? "bg-slate-800 border-indigo-500 text-indigo-400"
                      : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-400"
                  }`}
                >
                  <Package className="w-3.5 h-3.5 inline mr-1" />
                  Product Load ({pendingProductReports.length})
                </button>
                <button
                  onClick={() => {
                    setLoadingSubTab("posm");
                    setExpandedRow(null);
                  }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    loadingSubTab === "posm"
                      ? "bg-slate-800 border-indigo-500 text-indigo-400"
                      : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-400"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 inline mr-1" />
                  POSM Materials ({pendingPosmReports.length})
                </button>
              </div>

              {/* Product Reports queue */}
              {loadingSubTab === "product" && (
                <div className="space-y-3">
                  {pendingProductReports.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-900 border-dashed text-slate-500 text-xs">
                      No pending product loading reports.
                    </div>
                  ) : (
                    pendingProductReports.map((report) => {
                      const isExpanded = expandedRow === report.id;
                      return (
                        <Card key={report.id} className="bg-slate-900 border-slate-800/80 rounded-2xl overflow-hidden">
                          <div className="p-4 flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/10">
                                <Package className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-100">{report.user.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Username: @{report.user.username} | Submitted: {new Date(report.date).toLocaleDateString("id-ID")}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-slate-500 font-bold">Total Loading Value</p>
                                <p className="text-sm font-extrabold text-indigo-400 mt-0.5">Rp {report.totalValue.toLocaleString("id-ID")}</p>
                              </div>

                              <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                                <Button
                                  size="icon"
                                  onClick={() => setExpandedRow(isExpanded ? null : report.id)}
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-400 hover:text-white"
                                >
                                  {isExpanded ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={processingId === report.id}
                                  onClick={() => handleAction("product_loading", report.id, "approve")}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs rounded-lg flex items-center gap-1 shadow"
                                >
                                  {processingId === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={processingId === report.id}
                                  onClick={() => handleAction("product_loading", report.id, "reject")}
                                  className="text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 font-bold h-8 text-xs rounded-lg"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded products items list */}
                          {isExpanded && (
                            <div className="bg-slate-950/60 border-t border-slate-800/80 px-6 py-4 space-y-3">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Checklist Declared:</h4>
                              <div className="divide-y divide-slate-800/60 text-xs">
                                {report.items.map((item) => (
                                  <div key={item.id} className="py-2 flex justify-between">
                                    <span className="font-semibold text-slate-300">{item.product.name}</span>
                                    <div className="space-x-6">
                                      <span className="text-slate-400">{item.qty} units x Rp {item.product.price.toLocaleString("id-ID")}</span>
                                      <span className="font-bold text-slate-100">Rp {item.value.toLocaleString("id-ID")}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              )}

              {/* POSM Reports queue */}
              {loadingSubTab === "posm" && (
                <div className="space-y-3">
                  {pendingPosmReports.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-900 border-dashed text-slate-500 text-xs">
                      No pending POSM loading reports.
                    </div>
                  ) : (
                    pendingPosmReports.map((report) => {
                      const isExpanded = expandedRow === report.id;
                      return (
                        <Card key={report.id} className="bg-slate-900 border-slate-800/80 rounded-2xl overflow-hidden">
                          <div className="p-4 flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/10">
                                <Tag className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-100">{report.user.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Username: @{report.user.username} | Submitted: {new Date(report.date).toLocaleDateString("id-ID")}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-slate-500 font-bold">POSM Type count</p>
                                <p className="text-sm font-extrabold text-indigo-400 mt-0.5">{report.items.length} items</p>
                              </div>

                              <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                                <Button
                                  size="icon"
                                  onClick={() => setExpandedRow(isExpanded ? null : report.id)}
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-400 hover:text-white"
                                >
                                  {isExpanded ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={processingId === report.id}
                                  onClick={() => handleAction("posm_loading", report.id, "approve")}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs rounded-lg flex items-center gap-1 shadow"
                                >
                                  {processingId === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={processingId === report.id}
                                  onClick={() => handleAction("posm_loading", report.id, "reject")}
                                  className="text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 font-bold h-8 text-xs rounded-lg"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded POSM items list */}
                          {isExpanded && (
                            <div className="bg-slate-950/60 border-t border-slate-800/80 px-6 py-4 space-y-3">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">POSM Checklist Declared:</h4>
                              <div className="divide-y divide-slate-800/60 text-xs">
                                {report.items.map((item) => (
                                  <div key={item.id} className="py-2 flex justify-between">
                                    <span className="font-semibold text-slate-300">{item.posm.name}</span>
                                    <span className="font-bold text-slate-100">{item.qty} units</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment settlements queue — outstanding order bills */}
          {activeTab === "payments" && (
            <div className="space-y-3">
              {/* Search bar for pending bills */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search outstanding bills by ID or Outlet Name..."
                  value={paymentsSearch}
                  onChange={(e) => setPaymentsSearch(e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-4 py-2 w-full focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              {(() => {
                const filteredPendingBills = pendingBills.filter((bill) =>
                  bill.outlet.name.toLowerCase().includes(paymentsSearch.toLowerCase()) ||
                  bill.id.toLowerCase().includes(paymentsSearch.toLowerCase())
                );

                if (filteredPendingBills.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-900 border-dashed text-slate-550 text-xs">
                      {paymentsSearch ? "No matching outstanding bills found." : "No outstanding order bills to settle."}
                    </div>
                  );
                }

                return filteredPendingBills.map((bill) => {
                  const isExpanded = expandedRow === bill.id;
                  const collections = outletCollectionsMap[bill.id] ?? [];
                  const selectedCollectionId = selectedCollectionMap[bill.id];
                  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
                  const isLoadingCollections = loadingCollectionsFor === bill.id;

                  // Amount fit check
                  const amountFits = selectedCollection
                    ? selectedCollection.amount <= bill.outstanding + 0.01
                    : null;

                  return (
                    <Card key={bill.id} className="bg-slate-900 border-slate-800/80 rounded-2xl overflow-hidden animate-in fade-in duration-200">
                      <div className="p-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="h-10 w-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/10">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-100">{bill.outlet.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Bill #{bill.id.substring(0, 8)}
                              {bill.order?.topTerm ? ` · ${bill.order.topTerm}` : ""}
                              {" · "}{new Date(bill.date).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-slate-500 font-bold">Outstanding</p>
                            <p className="text-sm font-extrabold text-amber-400 mt-0.5">Rp {bill.outstanding.toLocaleString("id-ID")}</p>
                          </div>

                          <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
                            <Button
                              size="icon"
                              onClick={() => handleExpandBill(bill)}
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-white"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              disabled={processingId === bill.id || !selectedCollectionId}
                              onClick={() => handleBillSettle(bill)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs rounded-lg flex items-center gap-1 shadow disabled:opacity-40"
                            >
                              {processingId === bill.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded: Collection Picker Panel */}
                      {isExpanded && (
                        <div className="bg-slate-950/60 border-t border-slate-800/80 px-6 py-5 space-y-4">
                          {/* Header */}
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Select a Collection Entry to Apply
                            </h4>
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              Pick from collection-only payments submitted by a salesman for{" "}
                              <span className="text-slate-400 font-semibold">{bill.outlet.name}</span>.
                              The selected amount will be credited against this outstanding bill.
                            </p>
                          </div>

                          {/* Bill outstanding reference */}
                          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5">
                            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs text-slate-400 font-semibold">Bill outstanding balance:</span>
                            <span className="text-sm font-extrabold text-amber-400 ml-auto">
                              Rp {bill.outstanding.toLocaleString("id-ID")}
                            </span>
                          </div>

                          {/* Collection list */}
                          {isLoadingCollections ? (
                            <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-xs">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading collections...
                            </div>
                          ) : collections.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800 border-dashed">
                              No pending collection submissions found for this outlet.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {collections.map((col) => {
                                const fits = col.amount <= bill.outstanding + 0.01;
                                const isSelected = selectedCollectionId === col.id;
                                return (
                                  <button
                                    key={col.id}
                                    onClick={() =>
                                      setSelectedCollectionMap((prev) => ({
                                        ...prev,
                                        [bill.id]: isSelected ? "" : col.id
                                      }))
                                    }
                                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                                      isSelected
                                        ? "border-indigo-500/60 bg-indigo-500/10"
                                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                          isSelected ? "border-indigo-400 bg-indigo-500" : "border-slate-600"
                                        }`}>
                                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-200">
                                              {col.user.name}
                                            </span>
                                            {fits && (
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                <CircleCheck className="w-3 h-3" /> Fits
                                              </span>
                                            )}
                                            {!fits && (
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                                                <ShieldAlert className="w-3 h-3" /> Exceeds
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-slate-500 mt-0.5">
                                            Submitted: {new Date(col.createdAt).toLocaleDateString("id-ID")}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-[10px] text-slate-500 font-semibold">Collected</p>
                                        <p className={`text-sm font-extrabold mt-0.5 ${
                                          fits ? "text-emerald-400" : "text-rose-400"
                                        }`}>
                                          Rp {col.amount.toLocaleString("id-ID")}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Selection status indicator */}
                          {selectedCollection && amountFits !== null && (
                            <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border text-xs font-semibold ${
                              amountFits
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            }`}>
                              {amountFits ? (
                                <>
                                  <CircleCheck className="w-4 h-4 shrink-0" />
                                  Rp {selectedCollection.amount.toLocaleString("id-ID")} will be credited. Ready to approve.
                                </>
                              ) : (
                                <>
                                  <ShieldAlert className="w-4 h-4 shrink-0" />
                                  Collection (Rp {selectedCollection.amount.toLocaleString("id-ID")}) exceeds outstanding (Rp {bill.outstanding.toLocaleString("id-ID")}). Cannot approve.
                                </>
                              )}
                            </div>
                          )}

                          {/* Bill details context */}
                          <div className="border-t border-slate-800/60 pt-3">
                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <FileText className="w-3 h-3" /> Bill Details
                            </h4>
                            <div className="text-xs space-y-1.5 text-slate-500">
                              <div className="flex justify-between">
                                <span>Bill ID:</span>
                                <span className="text-slate-400 font-bold">#{bill.id.substring(0, 8)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Invoice Value:</span>
                                <span className="text-slate-400 font-bold">Rp {bill.value.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Settled So Far:</span>
                                <span className="text-slate-400 font-bold">Rp {bill.settled.toLocaleString("id-ID")}</span>
                              </div>
                              {bill.order && (
                                <div className="flex justify-between">
                                  <span>Order Date:</span>
                                  <span className="text-slate-400 font-bold">{new Date(bill.order.date).toLocaleDateString("id-ID")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                });
              })()}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Analytics Header Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MTD Sales Performance</p>
                      <h3 className="text-xl font-extrabold text-white mt-1.5">
                        Rp {data.mtdOrders?.reduce((sum, o) => sum + o.nettSales, 0).toLocaleString("id-ID") ?? 0}
                      </h3>
                      <p className="text-[10px] text-indigo-400 mt-1.5 flex items-center gap-1 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Month-to-Date Cumulative Revenue
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-slate-900 border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Store Ratio</p>
                      <h3 className="text-xl font-extrabold text-white mt-1.5">
                        {data.storeActivity?.active ?? 0} / {data.storeActivity?.total ?? 0}
                      </h3>
                      <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1 font-semibold">
                        <Activity className="w-3.5 h-3.5" />
                        {data.storeActivity?.total > 0 ? Math.round(((data.storeActivity?.active ?? 0) / data.storeActivity?.total) * 100) : 0}% stores active this week
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Store className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-slate-900 border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ledger Invoice Volume</p>
                      <h3 className="text-xl font-extrabold text-white mt-1.5">
                        Rp {data.allBills?.reduce((sum, b) => sum + b.value, 0).toLocaleString("id-ID") ?? 0}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-semibold">
                        <Coins className="w-3.5 h-3.5 text-slate-500" />
                        Outstanding: Rp {data.allBills?.reduce((sum, b) => sum + b.outstanding, 0).toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-700 shrink-0">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cumulative/Daily MTD Sales Area Chart */}
                <Card className="bg-slate-900 border-slate-800/80 rounded-3xl p-6 shadow-md lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">MTD Sales Trend</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Daily sales distribution for the current calendar month</p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full uppercase">
                      Current Month
                    </span>
                  </div>

                  <div className="w-full relative h-[180px] bg-slate-950/40 rounded-2xl border border-slate-900 overflow-hidden flex items-end">
                    {/* SVG Render */}
                    {(() => {
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth();
                      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                      
                      const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        return { day, amount: 0 };
                      });
                      
                      data.mtdOrders?.forEach((o) => {
                        const oDate = new Date(o.date);
                        if (oDate.getFullYear() === currentYear && oDate.getMonth() === currentMonth) {
                          const day = oDate.getDate();
                          if (dailyData[day - 1]) {
                            dailyData[day - 1].amount += o.nettSales;
                          }
                        }
                      });

                      const maxVal = Math.max(...dailyData.map((d) => d.amount), 500000);
                      const width = 600;
                      const height = 140;
                      const padX = 30;
                      const padY = 15;

                      const points = dailyData.map((d, index) => {
                        const x = padX + (index / (daysInMonth - 1)) * (width - padX * 2);
                        const y = height - padY - (d.amount / maxVal) * (height - padY * 2);
                        return { x, y, ...d };
                      });

                      const pathStr = points.length > 0
                        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ")
                        : "";
                      
                      const areaStr = points.length > 0
                        ? `${pathStr} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`
                        : "";

                      return (
                        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#1e293b" strokeDasharray="3,3" />
                          <line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="#1e293b" strokeDasharray="3,3" />
                          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#334155" />

                          {/* Area Path */}
                          {areaStr && <path d={areaStr} fill="url(#salesGrad)" />}

                          {/* Line Path */}
                          {pathStr && <path d={pathStr} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />}

                          {/* Interactive/Highlight Dots */}
                          {points.map((p) => {
                            if (p.amount <= 0) return null;
                            return (
                              <g key={p.day} className="group/dot cursor-pointer">
                                <circle cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="#ffffff" strokeWidth="1" />
                                <circle cx={p.x} cy={p.y} r="8" fill="#6366f1" fillOpacity="0" className="hover:fill-opacity-10 transition-all" />
                                <title>
                                  Day {p.day}: Rp {p.amount.toLocaleString("id-ID")}
                                </title>
                              </g>
                            );
                          })}

                          {/* X-Axis Labels */}
                          <text x={padX} y={height - 2} fill="#64748b" fontSize="8" textAnchor="middle">Day 1</text>
                          <text x={width / 2} y={height - 2} fill="#64748b" fontSize="8" textAnchor="middle">Day {Math.round(daysInMonth / 2)}</text>
                          <text x={width - padX} y={height - 2} fill="#64748b" fontSize="8" textAnchor="middle">Day {daysInMonth}</text>
                        </svg>
                      );
                    })()}
                  </div>
                </Card>

                {/* Active vs Inactive Store Donut Chart */}
                <Card className="bg-slate-900 border-slate-800/80 rounded-3xl p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Store Activity</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Active stores placed at least 1 order in the last 7 days</p>
                  </div>

                  <div className="flex justify-center items-center py-4 relative">
                    {(() => {
                      const active = data.storeActivity?.active ?? 0;
                      const inactive = data.storeActivity?.inactive ?? 0;
                      const total = data.storeActivity?.total ?? 1;
                      
                      const activePct = Math.round((active / total) * 100);
                      const radius = 35;
                      const strokeWidth = 8;
                      const circ = 2 * Math.PI * radius; // ~219.9
                      const dashArray = circ;
                      const activeOffset = dashArray - (active / total) * dashArray;

                      return (
                        <div className="relative flex items-center justify-center h-32 w-32">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Inactive Base Track (Grey) */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke="#334155"
                              strokeWidth={strokeWidth}
                            />
                            {/* Active segment (Emerald) */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke="#10b981"
                              strokeWidth={strokeWidth}
                              strokeDasharray={dashArray}
                              strokeDashoffset={activeOffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-xl font-extrabold text-white">{activePct}%</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Active</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2 text-[10px] font-bold border-t border-slate-800/60 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Active Outlets
                      </span>
                      <span className="text-slate-300">{data.storeActivity?.active ?? 0} stores</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                        Inactive Outlets
                      </span>
                      <span className="text-slate-300">{data.storeActivity?.inactive ?? 0} stores</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Comprehensive Billing and Collections Ledger */}
              <Card className="bg-slate-900 border-slate-800/80 rounded-3xl p-6 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Billing Ledger Database</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Audit log of all orders, invoice settlements, and collection history</p>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search outlet name..."
                        value={ledgerSearch}
                        onChange={(e) => setLedgerSearch(e.target.value)}
                        className="bg-slate-950/60 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-4 py-2 w-full sm:w-56 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                      />
                    </div>
                    <div className="flex bg-slate-950/60 p-1 border border-slate-800 rounded-xl">
                      {(["ALL", "PAID", "PARTIAL", "UNPAID"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setLedgerStatus(st)}
                          className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider transition-all ${
                            ledgerStatus === st
                              ? "bg-slate-800 text-indigo-400 shadow-sm"
                              : "text-slate-500 hover:text-slate-400"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ledger Table rendering */}
                <div className="overflow-x-auto">
                  {(() => {
                    const filtered = (data.allBills ?? []).filter((b) => {
                      const matchesSearch =
                        b.outlet.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                        b.id.toLowerCase().includes(ledgerSearch.toLowerCase());
                      
                      if (!matchesSearch) return false;
                      if (ledgerStatus === "ALL") return true;
                      if (ledgerStatus === "PAID") return b.outstanding <= 0.01;
                      if (ledgerStatus === "PARTIAL") return b.settled > 0 && b.outstanding > 0.01;
                      if (ledgerStatus === "UNPAID") return b.settled === 0 && b.outstanding > 0.01;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                          No matching invoices found in history.
                        </div>
                      );
                    }

                    return (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[9px] pb-3">
                            <th className="pb-3 pl-2">Invoice ID</th>
                            <th className="pb-3">Outlet</th>
                            <th className="pb-3">Order Date</th>
                            <th className="pb-3 text-right">Invoice Value</th>
                            <th className="pb-3 text-right">Paid</th>
                            <th className="pb-3 text-right">Outstanding</th>
                            <th className="pb-3 text-center">Status</th>
                            <th className="pb-3 text-center">History</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((b) => {
                            const isExpanded = expandedLedgerBill === b.id;
                            const statusColor =
                              b.outstanding <= 0.01
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : b.settled > 0
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20";
                            
                            const statusText =
                              b.outstanding <= 0.01 ? "SETTLED" : b.settled > 0 ? "PARTIAL" : "UNPAID";

                            return (
                              <React.Fragment key={b.id}>
                                <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                  <td className="py-3.5 pl-2 font-mono font-bold text-slate-400">
                                    #{b.id.substring(0, 8)}
                                  </td>
                                  <td className="py-3.5 font-bold text-white">{b.outlet.name}</td>
                                  <td className="py-3.5 text-slate-400">
                                    {new Date(b.date).toLocaleDateString("id-ID")}
                                  </td>
                                  <td className="py-3.5 text-right font-semibold text-slate-200">
                                    Rp {b.value.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-3.5 text-right font-semibold text-emerald-500">
                                    Rp {b.settled.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-3.5 text-right font-extrabold text-amber-500">
                                    Rp {b.outstanding.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${statusColor}`}>
                                      {statusText}
                                    </span>
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandedLedgerBill(isExpanded ? null : b.id)}
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                                    >
                                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </Button>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr>
                                    <td colSpan={8} className="bg-slate-950/50 border-b border-slate-800/80 px-4 py-4">
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            Settlement Audit Logs
                                          </h4>
                                          <span className="text-[8px] text-slate-650 font-mono">ID: {b.id}</span>
                                        </div>
                                        {b.settlements.length === 0 ? (
                                          <p className="text-[10px] text-slate-500 italic py-2">
                                            No collections have been applied to this invoice yet.
                                          </p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {b.settlements.map((col) => (
                                              <div
                                                key={col.id}
                                                className="flex justify-between items-center bg-slate-900/40 border border-slate-800 px-3 py-2 rounded-xl text-[10px]"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                                                  <span className="text-slate-300 font-semibold">
                                                    Collector: {col.user.name}
                                                  </span>
                                                  <span className="text-slate-600">|</span>
                                                  <span className="text-slate-500">
                                                    {new Date(col.createdAt).toLocaleString("id-ID")}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <span className="font-extrabold text-emerald-400">
                                                    Rp {col.amount.toLocaleString("id-ID")}
                                                  </span>
                                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                                                    col.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                    col.status === "REJECTED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                                    "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                  }`}>
                                                    {col.status}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right: Salesmen Status Monitor (4 cols) */}
        {activeTab !== "analytics" && (
          <div className="lg:col-span-4 space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h3 className="text-lg font-black text-white">Salesmen Monitor</h3>
          </div>

          <div className="space-y-3">
            {salesmenStatuses.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/40 rounded-3xl border border-slate-900 border-dashed text-slate-500 text-xs">
                No salesmen registered in the database.
              </div>
            ) : (
              salesmenStatuses.map((salesman) => {
                const isRouteClosed = salesman.isClosed;

                return (
                  <Card key={salesman.id} className="bg-slate-900 border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-800 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-sm text-white">{salesman.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">@{salesman.username}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isRouteClosed ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                        {isRouteClosed ? "CLOSED" : "ACTIVE"}
                      </span>
                    </div>

                    {/* Salesman checklist metrics */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[10px] bg-slate-950/45 p-2.5 rounded-xl border border-slate-850">
                      <div>
                        <span className="text-slate-500 font-semibold block">Visits</span>
                        <span className="font-bold text-slate-200 text-xs block mt-0.5">{salesman.visitsCount} outlets</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block">Today's Sales</span>
                        <span className="font-bold text-indigo-400 text-xs block mt-0.5">Rp {salesman.todaySales.toLocaleString("id-ID")}</span>
                      </div>
                    </div>

                    {/* Checkpoints Status */}
                    <div className="mt-3.5 space-y-2 text-[10px] font-semibold">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-slate-500" /> Product Loading:
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-extrabold ${
                          salesman.productStatus === "APPROVED" ? "text-emerald-400 bg-emerald-500/5" :
                          salesman.productStatus === "REJECTED" ? "text-rose-400 bg-rose-500/5" :
                          salesman.productStatus === "PENDING" ? "text-amber-400 bg-amber-500/5" :
                          "text-slate-500 bg-slate-800"
                        }`}>
                          {salesman.productStatus}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-slate-500" /> POSM Loading:
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-extrabold ${
                          salesman.posmStatus === "APPROVED" ? "text-emerald-400 bg-emerald-500/5" :
                          salesman.posmStatus === "REJECTED" ? "text-rose-400 bg-rose-500/5" :
                          salesman.posmStatus === "PENDING" ? "text-amber-400 bg-amber-500/5" :
                          "text-slate-500 bg-slate-800"
                        }`}>
                          {salesman.posmStatus}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
      </div>

      {/* No modal needed — inline validation is used in the bill cards above */}
    </div>
  );
}
