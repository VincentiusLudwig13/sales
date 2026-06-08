"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBasket, Map, ChevronRight, CheckCircle2, Lock, Store, AlertCircle, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { signOut } from "next-auth/react";

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<"product" | "posm" | "activity">("product");
  const [isValidated, setIsValidated] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState({ product: "DRAFT", posm: "DRAFT" });
  const [loadedProductItems, setLoadedProductItems] = useState<any[]>([]);
  const [loadedPosmItems, setLoadedPosmItems] = useState<any[]>([]);
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
        setIsClosed(data.isClosed ?? false);
        setLoadingStatus({
          product: data.productLoadingStatus ?? "DRAFT",
          posm: data.posmLoadingStatus ?? "DRAFT",
        });
        setLoadedProductItems(data.productItems ?? []);
        setLoadedPosmItems(data.posmItems ?? []);
        setStatusLoading(false);
      })
      .catch(() => setStatusLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const tabs = [
    { id: "product", label: "Product", icon: Package, locked: isClosed },
    { id: "posm", label: "POSM", icon: ShoppingBasket, locked: isClosed },
    { id: "activity", label: "Activity", icon: Map, locked: !isValidated && !isClosed },
  ] as const;

  return (
    <div className="flex flex-col min-h-full animate-in fade-in duration-500">
      <div className="bg-white px-4 pt-6 pb-2 rounded-b-3xl shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Daily Activity</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50 h-8"
          >
            Logout
          </Button>
        </div>

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
      {isClosed && (
        <div className="px-4 pt-3">
          <div className="w-full py-3 px-4 rounded-xl border border-rose-200 text-rose-800 bg-rose-50 text-xs font-semibold text-center">
            🔒 Today's activity has been completed and locked. Loading reports and visits are closed until tomorrow.
          </div>
        </div>
      )}

      {/* DEV TEST BUTTON — Remove before production */}
      {!isValidated && !isClosed && (
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
        {activeTab === "product" && <ProductLoadingTab status={loadingStatus.product} loadedItems={loadedProductItems} onSubmitted={fetchStatus} />}
        {activeTab === "posm" && <PosmLoadingTab status={loadingStatus.posm} loadedItems={loadedPosmItems} onSubmitted={fetchStatus} />}
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
interface ProductLoadingTabProps {
  status: string;
  loadedItems: any[];
  onSubmitted: () => void;
}

function ProductLoadingTab({ status, loadedItems, onSubmitted }: ProductLoadingTabProps) {
  const [products, setProducts] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.map((p: any) => {
          const matched = loadedItems.find((li) => li.productId === p.id);
          return { ...p, qty: matched ? matched.qty : 0 };
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadedItems]);

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
                      value={p.qty === 0 ? "" : p.qty}
                      onChange={(e) => updateQty(p.id, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
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
interface PosmLoadingTabProps {
  status: string;
  loadedItems: any[];
  onSubmitted: () => void;
}

function PosmLoadingTab({ status, loadedItems, onSubmitted }: PosmLoadingTabProps) {
  const [posms, setPosms] = useState<{ id: string; name: string; qty: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posms")
      .then((r) => r.json())
      .then((data) => {
        setPosms(data.map((p: any) => {
          const matched = loadedItems.find((li) => li.posmId === p.id);
          return { ...p, qty: matched ? matched.qty : 0 };
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadedItems]);

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
                      value={p.qty === 0 ? "" : p.qty}
                      onChange={(e) => updateQty(p.id, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
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
  interface OutletItem {
    id: string;
    name: string;
    picName: string;
    picPhone: string;
    topTerm: string;
    latitude: number | null;
    longitude: number | null;
    photoUrl: string | null;
    routeSeq: number;
    routeGroup: string;
    bills: { outstanding: number; value: number; settled: number }[];
    orders: { nettSales: number; topTerm: string }[];
  }

  const [outlets, setOutlets] = useState<OutletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<"Route A" | "Route B" | "Route C">("Route A");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  
  // Registration Form State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPicName, setRegPicName] = useState("");
  const [regPicPhone, setRegPicPhone] = useState("");
  const [regLat, setRegLat] = useState("");
  const [regLng, setRegLng] = useState("");
  const [regPhoto, setRegPhoto] = useState<string | null>(null);
  const [regRouteGroup, setRegRouteGroup] = useState<"Route A" | "Route B" | "Route C">("Route A");
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Get User's Geolocation
  const getGeoLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          // Fallback coordinate for demo/development (Warung Pak Bejo area)
          setUserLocation({ lat: -6.2088, lng: 106.8456 });
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const fetchOutletsAndStatus = async () => {
    try {
      setLoading(true);
      const [outletsRes, statusRes] = await Promise.all([
        fetch("/api/outlets"),
        fetch("/api/activity/status")
      ]);
      if (outletsRes.ok) {
        const data = await outletsRes.json();
        setOutlets(data);
      }
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsClosed(statusData.isClosed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutletsAndStatus();
    getGeoLocation();
  }, []);

  // Haversine Distance helper (meters)
  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Radius of the earth in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters
    return d;
  };

  // Adjust route sequence up/down within active route
  const activeOutlets = outlets.filter((o) => o.routeGroup === selectedRoute);

  const handleMoveSeq = async (index: number, direction: "up" | "down") => {
    if (isClosed) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activeOutlets.length) return;

    const listCopy = [...outlets];
    // Find absolute indices in full list
    const item1 = activeOutlets[index];
    const item2 = activeOutlets[newIndex];
    const fullIndex1 = listCopy.findIndex((o) => o.id === item1.id);
    const fullIndex2 = listCopy.findIndex((o) => o.id === item2.id);

    // Swap sequence values locally
    const tempSeq = listCopy[fullIndex1].routeSeq;
    listCopy[fullIndex1].routeSeq = listCopy[fullIndex2].routeSeq;
    listCopy[fullIndex2].routeSeq = tempSeq;

    // Sort again
    listCopy.sort((a, b) => a.routeSeq - b.routeSeq);
    setOutlets(listCopy);

    // Save to database (send sequence swaps)
    try {
      await Promise.all([
        fetch(`/api/outlets/${listCopy[fullIndex1].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeSeq: listCopy[fullIndex1].routeSeq })
        }),
        fetch(`/api/outlets/${listCopy[fullIndex2].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeSeq: listCopy[fullIndex2].routeSeq })
        })
      ]);
    } catch (e) {
      console.error("Failed to persist sequence change:", e);
    }
  };

  // Handle Close Day Route
  const handleCloseRoute = async () => {
    if (confirm("Are you sure you want to CLOSE the route for today? You will not be able to perform further loading, visiting or ordering until tomorrow.")) {
      try {
        const res = await fetch("/api/activity/status", {
          method: "POST"
        });
        if (res.ok) {
          alert("Route closed successfully! See you tomorrow.");
          setIsClosed(true);
        } else {
          alert("Failed to close route.");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Handle Store Registration Camera capture
  const handleRegCamera = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.capture = "environment";
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          setRegPhoto(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  // Get registration location
  const handleGetRegLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setRegLat(String(pos.coords.latitude));
        setRegLng(String(pos.coords.longitude));
        alert("Location coordinates captured!");
      });
    } else {
      alert("GPS not supported.");
    }
  };

  // Submit Store Registration
  const handleRegisterStore = async () => {
    if (!regName || !regPicName || !regPicPhone) {
      return alert("Store Name, PIC Name, and PIC Phone are required.");
    }
    if (!regLat || !regLng) {
      return alert("Store coordinates are required. Capture using GPS button.");
    }
    if (!regPhoto) {
      return alert("Store photo is required.");
    }

    setRegSubmitting(true);
    try {
      const res = await fetch("/api/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          picName: regPicName,
          picPhone: regPicPhone,
          topTerm: "COD", // default to COD in DB, can be modified during order placement
          latitude: parseFloat(regLat),
          longitude: parseFloat(regLng),
          photoUrl: regPhoto,
          routeGroup: regRouteGroup
        })
      });

      if (res.ok) {
        alert("Store registered successfully and added to route!");
        setShowRegModal(false);
        // Clear fields
        setRegName("");
        setRegPicName("");
        setRegPicPhone("");
        setRegLat("");
        setRegLng("");
        setRegPhoto(null);
        fetchOutletsAndStatus();
      } else {
        const err = await res.json();
        alert(`Failed to register: ${err.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error registering store.");
    } finally {
      setRegSubmitting(false);
    }
  };

  // Metrics calculation based on selectedRoute
  let totalNett = 0;
  let codNett = 0;
  let topNett = 0;
  let collectionTarget = 0; 
  let collectionActual = 0; 

  activeOutlets.forEach((o) => {
    o.orders.forEach((ord) => {
      totalNett += ord.nettSales;
      if (ord.topTerm === "COD") {
        codNett += ord.nettSales;
      } else {
        topNett += ord.nettSales;
      }
    });

    o.bills.forEach((b) => {
      collectionTarget += b.value;
      collectionActual += b.settled;
    });
  });

  return (
    <div className="space-y-6">
      {/* Route selector dropdown */}
      <div className="flex flex-col space-y-1 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <label className="text-xs font-bold text-slate-500">Active Route Group</label>
        <select
          value={selectedRoute}
          onChange={(e) => {
            setSelectedRoute(e.target.value as any);
            setActiveTooltipId(null);
          }}
          className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Route A">Route A</option>
          <option value="Route B">Route B</option>
          <option value="Route C">Route C</option>
        </select>
      </div>

      {/* Route Info & Closure control */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <Map className="w-24 h-24 text-white" />
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold tracking-wide uppercase text-blue-100">{selectedRoute} Sales Summary</h4>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm font-bold border border-white/10">
              {isClosed ? "CLOSED" : "ACTIVE"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-blue-900/35 p-3 rounded-2xl border border-white/5 mb-4">
            <div>
              <p className="text-[10px] text-blue-200">Total Net Sales</p>
              <p className="text-sm font-bold mt-0.5">Rp {totalNett.toLocaleString("id-ID")}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-200">COD Net Sales</p>
              <p className="text-sm font-bold mt-0.5 text-emerald-300">Rp {codNett.toLocaleString("id-ID")}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-200">With-TOP Sales</p>
              <p className="text-sm font-bold mt-0.5 text-amber-300">Rp {topNett.toLocaleString("id-ID")}</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 text-xs border border-white/5 space-y-1.5 mb-4">
            <div className="flex justify-between font-semibold">
              <span className="text-blue-100">Collection target (Total Bills)</span>
              <span>Rp {collectionTarget.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-blue-100">Collection actual (Settled Bills)</span>
              <span className="text-emerald-300">Rp {collectionActual.toLocaleString("id-ID")}</span>
            </div>
            <div className="w-full bg-blue-900/50 h-2 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${collectionTarget > 0 ? (collectionActual / collectionTarget) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isClosed ? (
              <Button 
                onClick={handleCloseRoute}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 text-xs rounded-xl shadow border-none"
              >
                Close Today's Route
              </Button>
            ) : (
              <div className="flex-1 text-center bg-rose-900/50 py-2 rounded-xl text-xs font-semibold text-rose-200 border border-rose-800/30">
                🔒 Route closed. Loading &amp; visits locked.
              </div>
            )}
            
            <Button
              onClick={() => {
                if (isClosed) return alert("Route is closed for today.");
                setRegRouteGroup(selectedRoute); // auto set registration route to current
                setShowRegModal(true);
              }}
              disabled={isClosed}
              className="bg-white text-blue-800 hover:bg-slate-100 font-bold h-10 text-xs rounded-xl border-none shrink-0"
            >
              + Register Store
            </Button>
          </div>
        </div>
      </div>

      {/* Outlet visited & reordering controls */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-lg font-bold text-slate-800">{selectedRoute} Outlets</h3>
          {userLocation ? (
            <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> GPS Active
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
              Locating...
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : activeOutlets.length === 0 ? (
          <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-3xl text-xs text-slate-400 font-medium">
            No stores registered in {selectedRoute} yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activeOutlets.map((outlet, index) => {
              const unpaid = outlet.bills.reduce((s, b) => s + b.outstanding, 0);
              
              // Calculate distance to current outlet if location exists
              let distance = -1;
              let isWithinRadius = false;
              if (userLocation && outlet.latitude && outlet.longitude) {
                distance = getDistanceInMeters(userLocation.lat, userLocation.lng, outlet.latitude, outlet.longitude);
                isWithinRadius = distance <= 50;
              }

              return (
                <Card key={outlet.id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden rounded-2xl">
                  <div className="p-4 flex items-center">
                    {/* Ordering control handle */}
                    <div className="flex flex-col mr-2 space-y-1">
                      <button 
                        disabled={index === 0 || isClosed}
                        onClick={() => handleMoveSeq(index, "up")}
                        className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        ▲
                      </button>
                      <button 
                        disabled={index === activeOutlets.length - 1 || isClosed}
                        onClick={() => handleMoveSeq(index, "down")}
                        className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        ▼
                      </button>
                    </div>

                    <div 
                      className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mr-3 shrink-0 relative cursor-pointer hover:bg-slate-200 transition-colors"
                      onClick={() => setActiveTooltipId(activeTooltipId === outlet.id ? null : outlet.id)}
                    >
                      <Store className="h-6 w-6 text-slate-400" />
                      <span className="absolute -top-1.5 -left-1.5 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setActiveTooltipId(activeTooltipId === outlet.id ? null : outlet.id)}>
                      <h4 className="text-base font-bold text-slate-900 truncate flex items-center gap-1.5">
                        {outlet.name}
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded font-normal shrink-0">info</span>
                      </h4>
                      <div className="flex items-center text-[10px] text-slate-500 mt-1 space-x-2">
                        {unpaid > 0 ? (
                          <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                            Unpaid: Rp {unpaid.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Settled</span>
                        )}
                        {distance >= 0 && (
                          <span className={`px-1.5 py-0.5 rounded font-semibold ${isWithinRadius ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>
                            {distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>

                    {isClosed ? (
                      <span className="text-slate-300 font-semibold text-xs py-1 px-2 shrink-0 border border-slate-100 rounded-lg bg-slate-50 select-none">
                        Closed
                      </span>
                    ) : isWithinRadius ? (
                      <a href={`/visit/${outlet.id}`} className="shrink-0 text-white bg-blue-600 hover:bg-blue-700 ml-2 flex h-8 px-3 items-center justify-center rounded-lg text-xs font-bold transition-colors shadow">
                        Visit
                      </a>
                    ) : (
                      <button 
                        onClick={() => alert(`Visiting restricted. You must be standing within 50m of the store. Currently: ${distance >= 0 ? Math.round(distance) : 'Unknown'} meters away.`)}
                        className="shrink-0 text-slate-400 bg-slate-100 hover:bg-slate-200 ml-2 flex h-8 px-2 items-center justify-center rounded-lg text-[10px] font-bold transition-colors"
                      >
                        🔒 Visit
                      </button>
                    )}
                  </div>

                  {/* Inline Tooltip drawer with map and exterior photo */}
                  {activeTooltipId === outlet.id && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4 animate-in slide-in-from-top duration-200">
                      <div className="flex flex-col space-y-3">
                        {/* Static OpenStreetMap Open source Iframe map */}
                        <div className="rounded-xl overflow-hidden border border-slate-200 h-48 relative bg-slate-100 w-full shadow-sm">
                          {outlet.latitude && outlet.longitude ? (
                            <iframe
                              className="w-full h-full border-none"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${outlet.longitude - 0.002}%2C${outlet.latitude - 0.001}%2C${outlet.longitude + 0.002}%2C${outlet.latitude + 0.001}&layer=mapnik&marker=${outlet.latitude}%2C${outlet.longitude}`}
                            ></iframe>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-slate-400">Map unavailable</div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-white/85 text-[8px] px-1 py-0.5 rounded shadow text-slate-500 font-semibold pointer-events-none">OSM</div>
                        </div>

                        {/* Store front exterior photo */}
                        <div className="rounded-xl overflow-hidden border border-slate-200 h-36 relative bg-slate-100 w-full shadow-sm">
                          {outlet.photoUrl ? (
                            <img src={outlet.photoUrl} alt="Store front" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-slate-400 text-center px-2">No front photo uploaded</div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-black/55 text-[8px] px-1 py-0.5 rounded text-white font-semibold pointer-events-none">Exterior</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div className="flex justify-between"><span className="font-semibold text-slate-400">PIC:</span> <span className="font-bold text-slate-800">{outlet.picName} ({outlet.picPhone})</span></div>
                        <div className="flex justify-between"><span className="font-semibold text-slate-400">Term of Payment:</span> <span className="font-bold text-slate-800">{outlet.topTerm}</span></div>
                        <div className="flex justify-between"><span className="font-semibold text-slate-400">Coordinates:</span> <span className="font-bold text-slate-800">{outlet.latitude?.toFixed(5) ?? "-"}, {outlet.longitude?.toFixed(5) ?? "-"}</span></div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Store Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-xl animate-in slide-in-from-bottom-6 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Register New Store</h3>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Store Name</label>
                <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Toko Berkah" className="h-10 border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">PIC Name</label>
                  <Input value={regPicName} onChange={(e) => setRegPicName(e.target.value)} placeholder="e.g. Pak Ahmad" className="h-10 border-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">PIC Phone</label>
                  <Input value={regPicPhone} onChange={(e) => setRegPicPhone(e.target.value)} placeholder="e.g. 0812xxxx" className="h-10 border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-1">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Assign Route</label>
                  <select value={regRouteGroup} onChange={(e) => setRegRouteGroup(e.target.value as any)} className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none">
                    <option value="Route A">Route A</option>
                    <option value="Route B">Route B</option>
                    <option value="Route C">Route C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Store GPS Coordinates (Required)</label>
                <div className="flex gap-2">
                  <Input readOnly value={regLat ? `${parseFloat(regLat).toFixed(4)}, ${parseFloat(regLng).toFixed(4)}` : ""} placeholder="Not captured yet" className="h-10 border-slate-200 bg-slate-50 flex-1" />
                  <Button onClick={handleGetRegLocation} className="bg-blue-600 text-white h-10 px-3 shrink-0 text-xs">
                    Get Location
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">Store Exterior Photo (Required)</label>
                {regPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28">
                    <img src={regPhoto} alt="Store exterior" className="w-full h-full object-cover" />
                    <button onClick={() => setRegPhoto(null)} className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] p-1 px-2 rounded-full font-bold">Remove</button>
                  </div>
                ) : (
                  <button onClick={handleRegCamera} className="w-full h-24 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl flex flex-col items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
                    <Camera className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Capture Photo of Store front</span>
                  </button>
                )}
              </div>
            </div>

            <Button onClick={handleRegisterStore} disabled={regSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg mt-2 flex items-center justify-center">
              {regSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : "Save Registered Store"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
