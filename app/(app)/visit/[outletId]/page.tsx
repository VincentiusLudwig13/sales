"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Box, ShoppingCart, Tag, Camera, CheckCircle2, Loader2, AlertCircle, Trash2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCache, setCache, getDraft, saveDraft, deleteDraft } from "@/lib/offline-db";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Posm {
  id: string;
  name: string;
}

interface BillItem {
  id: string;
  qty: number;
  grossSales: number;
  discount: number;
  nettSales: number;
  product: {
    name: string;
    price: number;
  };
}

interface BillOrder {
  id: string;
  date: string;
  grossSales: number;
  discount: number;
  nettSales: number;
  topTerm: string;
  items?: BillItem[];
}

interface Bill {
  id: string;
  date: string;
  value: number;
  outstanding: number;
  status: string;
  order?: BillOrder;
}

interface Outlet {
  id: string;
  name: string;
  picName: string;
  picPhone: string;
  topTerm: string;
  bills: Bill[];
}

export default function StoreVisitPage() {
  const params = useParams();
  const router = useRouter();
  const outletId = params.outletId as string;
  
  const [activeTab, setActiveTab] = useState<"stock" | "posm" | "order">("stock");
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [posms, setPosms] = useState<Posm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  // Keep track of previously saved stock checks & posm checks
  const [savedStocks, setSavedStocks] = useState<Record<string, { qty: number }>>({});
  const [savedPosms, setSavedPosms] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      const goOnline = () => setIsOffline(false);
      const goOffline = () => setIsOffline(true);
      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);
      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }
  }, []);

  const tabs = [
    { id: "stock", label: "Stock", icon: Box },
    { id: "posm", label: "POSM", icon: Tag },
    { id: "order", label: "Order", icon: ShoppingCart },
  ] as const;

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let oData: Outlet | null = null;
      let pData: Product[] = [];
      let poData: Posm[] = [];
      let vData: any = null;
      
      const offlineCheck = typeof navigator !== "undefined" && !navigator.onLine;

      if (offlineCheck) {
        // Load from Cache
        const [cachedOutlets, cachedProducts, cachedPosms] = await Promise.all([
          getCache<any[]>("outlets"),
          getCache<any[]>("products"),
          getCache<any[]>("posms")
        ]);
        
        if (cachedOutlets) {
          oData = cachedOutlets.find((o: any) => o.id === outletId) || null;
        }
        pData = cachedProducts || [];
        poData = cachedPosms || [];
        
        // Grab existing local draft
        const localDraft = await getDraft(outletId);
        if (localDraft) {
          vData = {
            stockChecks: localDraft.stockChecks,
            posmChecks: localDraft.posmChecks
          };
        }
      } else {
        // Try fetching online
        try {
          const [outletRes, productsRes, posmsRes, visitRes] = await Promise.all([
            fetch(`/api/outlets/${outletId}`),
            fetch("/api/products"),
            fetch("/api/posms"),
            fetch(`/api/visit/${outletId}`)
          ]);

          if (outletRes.ok) oData = await outletRes.json();
          if (productsRes.ok) pData = await productsRes.json();
          if (posmsRes.ok) poData = await posmsRes.json();
          if (visitRes.ok) vData = await visitRes.json();

          // Write updates to cache
          if (pData.length > 0) await setCache("products", pData);
          if (poData.length > 0) await setCache("posms", poData);
          
          if (oData) {
            const cachedOutlets = await getCache<any[]>("outlets") || [];
            const updatedOutlets = cachedOutlets.map((o: any) => o.id === oData!.id ? { ...o, ...oData } : o);
            if (!updatedOutlets.some((o: any) => o.id === oData!.id)) {
              updatedOutlets.push(oData);
            }
            await setCache("outlets", updatedOutlets);
          }
        } catch (err) {
          console.warn("Fetch failed, falling back to cache:", err);
          const [cachedOutlets, cachedProducts, cachedPosms] = await Promise.all([
            getCache<any[]>("outlets"),
            getCache<any[]>("products"),
            getCache<any[]>("posms")
          ]);
          
          if (cachedOutlets) {
            oData = cachedOutlets.find((o: any) => o.id === outletId) || null;
          }
          pData = cachedProducts || [];
          poData = cachedPosms || [];
          
          const localDraft = await getDraft(outletId);
          if (localDraft) {
            vData = {
              stockChecks: localDraft.stockChecks,
              posmChecks: localDraft.posmChecks
            };
          }
        }
      }

      if (oData) setOutlet(oData);
      if (pData.length > 0) setProducts(pData);
      if (poData.length > 0) setPosms(poData);
      
      if (vData) {
        // Process stockChecks
        const stockMap: Record<string, { qty: number }> = {};
        (vData.stockChecks ?? []).forEach((sc: any) => {
          stockMap[sc.productId] = { qty: sc.qty };
        });
        setSavedStocks(stockMap);

        // Process posmChecks
        const posmMap: Record<string, number> = {};
        (vData.posmChecks ?? []).forEach((pc: any) => {
          posmMap[pc.posmId] = pc.qty;
        });
        setSavedPosms(posmMap);
      }
    } catch (err) {
      console.error("Error loading visit page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (outletId) {
      fetchData();
    }
  }, [outletId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-2" />
        <p className="text-slate-500 text-sm">Loading outlet information...</p>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Outlet Not Found</h2>
        <p className="text-slate-500 text-sm mb-4">The outlet with ID "{outletId}" could not be loaded.</p>
        <Button onClick={() => router.back()} className="bg-blue-600 text-white">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-12 pb-6 shadow-md relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-blue-500 hover:text-white mr-2 -ml-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{outlet.name}</h1>
              <p className="text-blue-200 text-sm">PIC: {outlet.picName} ({outlet.picPhone})</p>
            </div>
          </div>
          {isOffline && (
            <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse border border-amber-400 shadow">
              <WifiOff className="w-3 h-3" /> Offline Draft
            </span>
          )}
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
        {activeTab === "stock" && <CheckStockTab products={products} outlet={outlet} initialStocks={savedStocks} onSave={fetchData} />}
        {activeTab === "posm" && <CheckPosmTab posms={posms} outlet={outlet} initialPosms={savedPosms} onSave={fetchData} />}
        {activeTab === "order" && <OrderTab products={products} outlet={outlet} refreshOutlet={fetchData} isOffline={isOffline} />}
      </div>
    </div>
  );
}

// --- TABS ---

interface CheckStockTabProps {
  products: Product[];
  outlet: Outlet;
  initialStocks: Record<string, { qty: number }>;
  onSave: () => void;
}

function CheckStockTab({ products, outlet, initialStocks, onSave }: CheckStockTabProps) {
  const [stocks, setStocks] = useState<Record<string, { qty: number }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const merged: Record<string, { qty: number }> = {};
    products.forEach((p) => {
      merged[p.id] = initialStocks[p.id] || { qty: 0 };
    });
    setStocks(merged);
  }, [products, initialStocks]);

  const handleQtyChange = (productId: string, val: number) => {
    setStocks((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], qty: Math.max(0, val) }
    }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    const stockChecks = Object.entries(stocks)
      .filter(([_, data]) => data.qty > 0)
      .map(([productId, data]) => ({
        productId,
        qty: data.qty
      }));

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      try {
        const currentDraft = await getDraft(outlet.id) || {
          outletId: outlet.id,
          outletName: outlet.name,
          date: new Date().toISOString(),
          stockChecks: [],
          posmChecks: [],
          order: null,
          status: "DRAFT"
        };
        currentDraft.stockChecks = stockChecks;
        await saveDraft(currentDraft);
        alert("Stock data saved locally (Offline draft)!");
        onSave();
      } catch (err) {
        console.error("Local save failed:", err);
        alert("Failed to save draft locally.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch(`/api/visit/${outlet.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockChecks })
      });

      if (res.ok) {
        alert("Stock data saved successfully!");
        onSave();
      } else {
        alert("Failed to save stock data.");
      }
    } catch (err) {
      console.error(err);
      const saveLocal = confirm("Network request failed. Would you like to save this stock check as a local offline draft?");
      if (saveLocal) {
        const currentDraft = await getDraft(outlet.id) || {
          outletId: outlet.id,
          outletName: outlet.name,
          date: new Date().toISOString(),
          stockChecks: [],
          posmChecks: [],
          order: null,
          status: "DRAFT"
        };
        currentDraft.stockChecks = stockChecks;
        await saveDraft(currentDraft);
        alert("Stock data saved locally (Offline draft)!");
        onSave();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800 px-1">Check Current Stock</h3>
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-100">
          {products.map((item) => {
            const current = stocks[item.id] || { qty: 0 };
            return (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">{item.name}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                    Price: Rp {item.price.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Qty</label>
                    <Input 
                      type="number" 
                      value={current.qty === 0 ? "" : current.qty} 
                      onChange={(e) => handleQtyChange(item.id, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                      className="h-10 bg-slate-50 border-slate-200" 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Button 
        onClick={handleSave}
        disabled={submitting}
        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20 flex items-center justify-center"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Stock Data"
        )}
      </Button>
    </div>
  );
}

interface CheckPosmTabProps {
  posms: Posm[];
  outlet: Outlet;
  initialPosms: Record<string, number>;
  onSave: () => void;
}

function CheckPosmTab({ posms, outlet, initialPosms, onSave }: CheckPosmTabProps) {
  const [posmQtys, setPosmQtys] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const merged: Record<string, number> = {};
    posms.forEach((p) => {
      merged[p.id] = initialPosms[p.id] || 0;
    });
    setPosmQtys(merged);
  }, [posms, initialPosms]);

  const handleQtyChange = (posmId: string, val: number) => {
    setPosmQtys((prev) => ({
      ...prev,
      [posmId]: Math.max(0, val)
    }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    const posmChecks = Object.entries(posmQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([posmId, qty]) => ({
        posmId,
        qty
      }));

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      try {
        const currentDraft = await getDraft(outlet.id) || {
          outletId: outlet.id,
          outletName: outlet.name,
          date: new Date().toISOString(),
          stockChecks: [],
          posmChecks: [],
          order: null,
          status: "DRAFT"
        };
        currentDraft.posmChecks = posmChecks;
        await saveDraft(currentDraft);
        alert("POSM data saved locally (Offline draft)!");
        onSave();
      } catch (err) {
        console.error("Local save failed:", err);
        alert("Failed to save draft locally.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch(`/api/visit/${outlet.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posmChecks })
      });

      if (res.ok) {
        alert("POSM data saved successfully!");
        onSave();
      } else {
        alert("Failed to save POSM data.");
      }
    } catch (err) {
      console.error(err);
      const saveLocal = confirm("Network request failed. Would you like to save this POSM check as a local offline draft?");
      if (saveLocal) {
        const currentDraft = await getDraft(outlet.id) || {
          outletId: outlet.id,
          outletName: outlet.name,
          date: new Date().toISOString(),
          stockChecks: [],
          posmChecks: [],
          order: null,
          status: "DRAFT"
        };
        currentDraft.posmChecks = posmChecks;
        await saveDraft(currentDraft);
        alert("POSM data saved locally (Offline draft)!");
        onSave();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800 px-1">Check POSM Present</h3>
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-100">
          {posms.map((item) => {
            const qty = posmQtys[item.id] || 0;
            return (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{item.name}</span>
                <div className="w-24">
                  <Input 
                    type="number" 
                    value={qty === 0 ? "" : qty} 
                    onChange={(e) => handleQtyChange(item.id, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                    className="h-10 bg-slate-50 border-slate-200 text-center" 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Button 
        onClick={handleSave}
        disabled={submitting}
        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20 flex items-center justify-center"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save POSM Data"
        )}
      </Button>
    </div>
  );
}

interface OrderTabProps {
  products: Product[];
  outlet: Outlet;
  refreshOutlet: () => Promise<void>;
  isOffline: boolean;
}

interface SelectedItem {
  productId: string;
  qty: number | string;
  discount: number | string;
}

function OrderTab({ products, outlet, refreshOutlet, isOffline }: OrderTabProps) {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [topTerm, setTopTerm] = useState(outlet.topTerm || "COD");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const outstandingTotal = outlet.bills.reduce((sum, b) => sum + b.outstanding, 0);

  const handleAddItem = () => {
    setSelectedItems((prev) => [
      ...prev,
      { productId: products[0]?.id || "", qty: 1, discount: 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, key: keyof SelectedItem, val: string | number) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      if (key === "qty" || key === "discount") {
        const strVal = String(val);
        // Only allow empty string or digit-only strings
        if (strVal !== "" && !/^\d*$/.test(strVal)) return copy;
        copy[index] = { ...copy[index], [key]: strVal };
      } else if (key === "productId") {
        copy[index] = { ...copy[index], productId: String(val) };
      }
      return copy;
    });
  };

  // Calculations
  const calculatedItems = selectedItems.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const price = product?.price || 0;
    const q = item.qty === "" ? 0 : Number(item.qty);
    const d = item.discount === "" ? 0 : Number(item.discount);
    const grossSales = price * q;
    const nettSales = Math.max(0, grossSales - d);
    return {
      ...item,
      name: product?.name || "",
      grossSales,
      nettSales
    };
  });

  const totalGross = calculatedItems.reduce((sum, i) => sum + i.grossSales, 0);
  const totalDiscount = calculatedItems.reduce((sum, i) => sum + (i.discount === "" ? 0 : Number(i.discount)), 0);
  const totalNett = calculatedItems.reduce((sum, i) => sum + i.nettSales, 0);


  // Capture Photo using native HTML5 camera
  const handleCapturePhoto = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.capture = "environment"; // triggers rear camera on phones
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  // Return states
  const [returnItems, setReturnItems] = useState<{ productId: string; qty: number | string; value: number }[]>([]);
  const [collectionInput, setCollectionInput] = useState<string>("0");

  useEffect(() => {
    const loadOrderDraft = async () => {
      try {
        const draft = await getDraft(outlet.id);
        if (draft && draft.order) {
          const loadedItems = draft.order.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            discount: item.discount,
          }));
          setSelectedItems(loadedItems);
          setTopTerm(draft.order.topTerm);
          setPhotoUrl(draft.order.photoUrl);
          if (draft.order.returns) {
            setReturnItems(draft.order.returns);
          }
          if (draft.order.collectionAmount !== undefined) {
            setCollectionInput(String(draft.order.collectionAmount));
          }
        }
      } catch (err) {
        console.error("Failed to load draft order:", err);
      }
    };
    loadOrderDraft();
  }, [outlet.id]);

  const handleAddReturnItem = () => {
    setReturnItems((prev) => [
      ...prev,
      { productId: products[0]?.id || "", qty: 1, value: products[0]?.price || 0 }
    ]);
  };

  const handleRemoveReturnItem = (index: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReturnItemChange = (index: number, key: "productId" | "qty", val: string | number) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      if (key === "productId") {
        const product = products.find((p) => p.id === val);
        const q = copy[index].qty === "" ? 0 : Number(copy[index].qty);
        copy[index] = {
          ...copy[index],
          productId: String(val),
          value: (product?.price || 0) * q
        };
      } else if (key === "qty") {
        const strVal = String(val);
        // Only allow empty string or digit-only strings
        if (strVal !== "" && !/^\d*$/.test(strVal)) return copy;
        const product = products.find((p) => p.id === copy[index].productId);
        const q = strVal === "" ? 0 : Math.max(0, Number(strVal));
        copy[index] = {
          ...copy[index],
          qty: strVal,
          value: (product?.price || 0) * q
        };
      }
      return copy;
    });
  };

  const totalReturnDeduction = returnItems.reduce((sum, item) => sum + item.value, 0);
  const totalCollection = Math.max(0, parseFloat(collectionInput) || 0);

  // Submit Order
  const handleSubmitOrder = async () => {
    const hasOrderItems = calculatedItems.length > 0;
    const hasReturnItems = returnItems.length > 0;
    const hasCollection = totalCollection > 0;

    if (!hasOrderItems && !hasReturnItems && !hasCollection) {
      return alert("Please enter an order, add returns, or enter a collection amount before submitting.");
    }
    if (hasOrderItems && calculatedItems.some((ci) => (ci.qty === "" ? 0 : Number(ci.qty)) <= 0)) {
      return alert("Product quantities must be at least 1.");
    }
    if (hasReturnItems && returnItems.some((ri) => (ri.qty === "" ? 0 : Number(ri.qty)) <= 0)) {
      return alert("Return product quantities must be at least 1.");
    }
    if (!photoUrl) {
      return alert("Photo attachment of the Nota & Products is required.");
    }

    setSubmittingOrder(true);

    const orderData = {
      items: calculatedItems.map((ci) => ({
        productId: ci.productId,
        qty: ci.qty === "" ? 0 : Number(ci.qty),
        grossSales: ci.grossSales,
        discount: ci.discount === "" ? 0 : Number(ci.discount),
        nettSales: ci.nettSales
      })),
      returns: returnItems.map((ri) => ({
        productId: ri.productId,
        qty: ri.qty === "" ? 0 : Number(ri.qty),
        value: ri.value
      })),
      collectionAmount: totalCollection,
      returnDeduction: totalReturnDeduction,
      grossSales: totalGross,
      discount: totalDiscount,
      nettSales: totalNett,
      topTerm,
      photoUrl
    };

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    const saveLocalDraft = async () => {
      try {
        const currentDraft = await getDraft(outlet.id) || {
          outletId: outlet.id,
          outletName: outlet.name,
          date: new Date().toISOString(),
          stockChecks: [],
          posmChecks: [],
          order: null,
          status: "DRAFT"
        };
        currentDraft.order = orderData;
        currentDraft.status = "DRAFT";
        await saveDraft(currentDraft);
        alert("Order saved locally as draft (Offline mode)!");
        router.push("/activity");
      } catch (err) {
        console.error("Local save failed:", err);
        alert("Failed to save draft locally.");
      }
    };

    if (isOffline) {
      await saveLocalDraft();
      setSubmittingOrder(false);
      return;
    }

    try {
      // Retrieve session/user state
      const statusRes = await fetch("/api/activity/status");
      const statusData = await statusRes.json();
      const actualUserId = statusData?.user?.id || "dummy-user-id";

      const orderBody = {
        userId: actualUserId,
        outletId: outlet.id,
        ...orderData
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody)
      });

      if (res.ok) {
        await deleteDraft(outlet.id);
        alert("Order submitted successfully!");
        router.push("/activity");
      } else {
        const err = await res.json();
        console.error("Submit order error response:", err);
        const saveLocal = confirm("Server error while submitting order. Would you like to save this order as a local offline draft instead?");
        if (saveLocal) {
          await saveLocalDraft();
        }
      }
    } catch (err) {
      console.error(err);
      const saveLocal = confirm("Network request failed. Would you like to save this order as a local offline draft instead?");
      if (saveLocal) {
        await saveLocalDraft();
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Outstanding Bill Section */}
      {outlet.bills.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <ShoppingCart className="w-16 h-16 text-rose-500" />
          </div>
          <h3 className="text-sm font-bold text-rose-800 mb-1">Unpaid Bills</h3>
          <p className="text-2xl font-bold text-rose-600 mb-3">Rp {outstandingTotal.toLocaleString("id-ID")}</p>
          
          <div className="bg-white rounded-lg p-3 text-sm border border-rose-100 divide-y divide-slate-100">
            {outlet.bills.map((bill) => (
              <div key={bill.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex justify-between items-center">
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
                  >
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      Bill #{bill.id.substring(0, 8)}
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-normal">
                        {expandedBillId === bill.id ? "Hide Details" : "Show Details"}
                      </span>
                    </span>
                    <span className="text-xs text-slate-400">{new Date(bill.date).toLocaleDateString("id-ID")}</span>
                  </div>
                  <span className="font-semibold text-rose-600">Rp {bill.outstanding.toLocaleString("id-ID")}</span>
                </div>

                {expandedBillId === bill.id && bill.order?.items && (
                  <div className="mt-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2 animate-in slide-in-from-top-1 duration-200">
                    <div className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1.5 flex justify-between">
                      <span>Product Detail</span>
                      <span>Subtotal (Nett)</span>
                    </div>
                    {bill.order.items.map((item) => (
                      <div key={item.id} className="text-xs flex justify-between items-start py-0.5">
                        <div className="text-slate-700 max-w-[70%]">
                          <div className="font-medium text-slate-900">{item.product?.name || "Unknown Product"}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.qty} pcs x Rp {item.product?.price.toLocaleString("id-ID")}
                            {item.discount > 0 && ` (Disc: Rp ${item.discount.toLocaleString("id-ID")})`}
                          </div>
                        </div>
                        <span className="font-medium text-slate-900">
                          Rp {item.nettSales.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-800">
                      <span>Total Value:</span>
                      <span>Rp {bill.value.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Order Form */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 px-1 mb-3">New Order Entry</h3>
        <Card className="border-none shadow-sm rounded-2xl p-4 space-y-4">
          {selectedItems.map((item, idx) => (
            <div key={idx} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-blue-600">Product #{idx + 1}</span>
                {selectedItems.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-400 hover:text-rose-500 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Product</label>
                  <select 
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Rp {p.price.toLocaleString("id-ID")})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Qty</label>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    value={item.qty}
                    onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                    className="h-10 bg-slate-50 border-slate-200" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Discount (Rp)</label>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    value={item.discount}
                    onChange={(e) => handleItemChange(idx, "discount", e.target.value)}
                    className="h-10 bg-slate-50 border-slate-200" 
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="bg-slate-50 h-10 px-3 flex items-center justify-between rounded-md border border-slate-100 text-xs">
                    <span className="text-slate-500">Nett:</span>
                    <span className="font-semibold text-slate-900">
                      Rp {calculatedItems[idx]?.nettSales.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <Button 
            variant="outline" 
            onClick={handleAddItem}
            className="w-full border-dashed border-2 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          >
            + Add Another Product
          </Button>

           {/* Return (Retur) Form Section */}
           <div className="pt-4 border-t border-slate-100 space-y-3">
             <div className="flex justify-between items-center px-1">
               <h4 className="text-sm font-bold text-slate-800">Return Items (Retur)</h4>
               <Button 
                 type="button" 
                 variant="ghost" 
                 size="sm" 
                 onClick={handleAddReturnItem}
                 className="text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-8 px-2.5 rounded-lg font-semibold"
               >
                 + Add Return
               </Button>
             </div>

             {returnItems.length === 0 ? (
               <p className="text-xs text-slate-400 italic px-1">No returns added to this order.</p>
             ) : (
               <div className="space-y-3">
                 {returnItems.map((item, idx) => (
                   <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 relative">
                     <button 
                       type="button" 
                       onClick={() => handleRemoveReturnItem(idx)}
                       className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 text-xs font-semibold"
                     >
                       Remove
                     </button>
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 mb-1 block">Product</label>
                         <select 
                           value={item.productId}
                           onChange={(e) => handleReturnItemChange(idx, "productId", e.target.value)}
                           className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none"
                         >
                           {products.map((p) => (
                             <option key={p.id} value={p.id}>{p.name}</option>
                           ))}
                         </select>
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 mb-1 block">Qty</label>
                         <Input 
                           type="text" 
                           inputMode="numeric"
                           value={item.qty} 
                           onChange={(e) => handleReturnItemChange(idx, "qty", e.target.value)}
                           className="h-8 bg-white border-slate-200 text-xs" 
                         />
                       </div>
                     </div>
                     <div className="text-[11px] text-slate-500 text-right font-medium">
                       Deduction: <span className="font-bold text-slate-800">Rp {item.value.toLocaleString("id-ID")}</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>

           {/* Payment collection inputs */}
           <div className="pt-4 border-t border-slate-100 space-y-3">
             <div>
               <label className="text-xs font-bold text-slate-800 mb-1 block">Collection Amount (Rp)</label>
               <Input 
                 type="number" 
                 placeholder="0" 
                 value={collectionInput === "0" ? "" : collectionInput} 
                 onChange={(e) => setCollectionInput(e.target.value)}
                 className="h-10 bg-slate-50 border-slate-200 font-semibold text-blue-600 focus:ring-blue-500" 
               />
               <span className="text-[10px] text-slate-400 italic block mt-1">Collection amount is sent to admin automatically when you submit the order.</span>
             </div>
           </div>

           {/* Payment terms & details */}
           <div className="pt-4 border-t border-slate-100 space-y-3">
             <div>
               <label className="text-xs font-medium text-slate-500 mb-1 block">Payment Term</label>
               <select 
                 value={topTerm}
                 onChange={(e) => setTopTerm(e.target.value)}
                 className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
               >
                 <option value="COD">COD</option>
                 <option value="3 Days">3 Days</option>
                 <option value="4 Days">4 Days</option>
                 <option value="7 Days">7 Days</option>
               </select>
             </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-sm">
               <div className="flex justify-between items-center text-slate-500">
                 <span>Total Gross Sales:</span>
                 <span>Rp {totalGross.toLocaleString("id-ID")}</span>
               </div>
               <div className="flex justify-between items-center text-slate-500">
                 <span>Total Discount:</span>
                 <span>Rp {totalDiscount.toLocaleString("id-ID")}</span>
               </div>
               <div className="flex justify-between items-center font-bold text-slate-900 border-t border-slate-200/60 pt-2 text-base">
                 <span>Total Nett Sales:</span>
                 <span>Rp {totalNett.toLocaleString("id-ID")}</span>
               </div>
               {totalReturnDeduction > 0 && (
                 <div className="flex justify-between items-center font-semibold text-rose-600 text-xs">
                   <span>Retur Deduction:</span>
                   <span>- Rp {totalReturnDeduction.toLocaleString("id-ID")}</span>
                 </div>
               )}
               {totalCollection > 0 && (
                 <div className="flex justify-between items-center font-semibold text-blue-600 text-xs">
                    <span>Collection (Pending Admin Approval):</span>
                   <span>- Rp {totalCollection.toLocaleString("id-ID")}</span>
                 </div>
               )}
               {(totalReturnDeduction > 0 || totalCollection > 0) && (
                 <div className="flex justify-between items-center font-bold text-amber-600 border-t border-dashed border-slate-200 pt-2 text-sm">
                   <span>Projected Outstanding (after approval):</span>
                   <span>Rp {Math.max(0, outstandingTotal + totalNett - totalReturnDeduction - totalCollection).toLocaleString("id-ID")}</span>
                 </div>
               )}
             </div>
           </div>
         </Card>
       </div>

      {/* Camera Attachment */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 px-1 mb-2">Attachments (Required)</h3>
        {photoUrl ? (
          <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <img src={photoUrl} alt="Order attachment" className="w-full h-40 object-cover" />
            <button 
              onClick={() => setPhotoUrl(null)} 
              className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-sm text-xs font-semibold"
            >
              Remove
            </button>
          </div>
        ) : (
          <button 
            onClick={handleCapturePhoto}
            className="w-full h-24 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Camera className="h-6 w-6 mb-1" />
            <span className="text-sm font-medium">Take Photo of Nota & Products</span>
          </button>
        )}
      </div>

      <Button 
        onClick={handleSubmitOrder}
        disabled={submittingOrder}
        className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-600/30 flex items-center justify-center"
      >
        {submittingOrder ? (
          <>
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            Submitting Order...
          </>
        ) : (
          "Submit Order"
        )}
      </Button>
    </div>
  );
}

