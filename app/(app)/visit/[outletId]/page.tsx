"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Box, ShoppingCart, Tag, Camera, CheckCircle2, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  
  // Keep track of previously saved stock checks & posm checks
  const [savedStocks, setSavedStocks] = useState<Record<string, { qty: number }>>({});
  const [savedPosms, setSavedPosms] = useState<Record<string, number>>({});

  const tabs = [
    { id: "stock", label: "Stock", icon: Box },
    { id: "posm", label: "POSM", icon: Tag },
    { id: "order", label: "Order", icon: ShoppingCart },
  ] as const;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [outletRes, productsRes, posmsRes, visitRes] = await Promise.all([
        fetch(`/api/outlets/${outletId}`),
        fetch("/api/products"),
        fetch("/api/posms"),
        fetch(`/api/visit/${outletId}`)
      ]);

      if (outletRes.ok) {
        const oData = await outletRes.json();
        setOutlet(oData);
      }
      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProducts(pData);
      }
      if (posmsRes.ok) {
        const poData = await posmsRes.json();
        setPosms(poData);
      }
      if (visitRes.ok) {
        const vData = await visitRes.json();
        if (vData) {
          // Process stockChecks
          const stockMap: Record<string, { qty: number }> = {};
          (vData.stockChecks ?? []).forEach((sc: any) => {
            stockMap[sc.productId] = {
              qty: sc.qty
            };
          });
          setSavedStocks(stockMap);

          // Process posmChecks
          const posmMap: Record<string, number> = {};
          (vData.posmChecks ?? []).forEach((pc: any) => {
            posmMap[pc.posmId] = pc.qty;
          });
          setSavedPosms(posmMap);
        }
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
            <h1 className="text-xl font-bold tracking-tight">{outlet.name}</h1>
            <p className="text-blue-200 text-sm">PIC: {outlet.picName} ({outlet.picPhone})</p>
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
        {activeTab === "stock" && <CheckStockTab products={products} outletId={outletId} initialStocks={savedStocks} onSave={fetchData} />}
        {activeTab === "posm" && <CheckPosmTab posms={posms} outletId={outletId} initialPosms={savedPosms} onSave={fetchData} />}
        {activeTab === "order" && <OrderTab products={products} outlet={outlet} refreshOutlet={fetchData} />}
      </div>
    </div>
  );
}

// --- TABS ---

interface CheckStockTabProps {
  products: Product[];
  outletId: string;
  initialStocks: Record<string, { qty: number }>;
  onSave: () => void;
}

function CheckStockTab({ products, outletId, initialStocks, onSave }: CheckStockTabProps) {
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
    try {
      const stockChecks = Object.entries(stocks)
        .filter(([_, data]) => data.qty > 0)
        .map(([productId, data]) => ({
          productId,
          qty: data.qty
        }));

      const res = await fetch(`/api/visit/${outletId}`, {
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
      alert("An error occurred while saving stock data.");
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
  outletId: string;
  initialPosms: Record<string, number>;
  onSave: () => void;
}

function CheckPosmTab({ posms, outletId, initialPosms, onSave }: CheckPosmTabProps) {
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
    try {
      const posmChecks = Object.entries(posmQtys)
        .filter(([_, qty]) => qty > 0)
        .map(([posmId, qty]) => ({
          posmId,
          qty
        }));

      const res = await fetch(`/api/visit/${outletId}`, {
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
      alert("An error occurred while saving POSM data.");
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
}

interface SelectedItem {
  productId: string;
  qty: number;
  discount: number;
}

function OrderTab({ products, outlet, refreshOutlet }: OrderTabProps) {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([
    { productId: products[0]?.id || "", qty: 1, discount: 0 }
  ]);
  const [topTerm, setTopTerm] = useState(outlet.topTerm || "COD");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [settlingBill, setSettlingBill] = useState<string | null>(null);
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
      if (key === "qty") {
        copy[index] = { ...copy[index], qty: Math.max(1, Number(val)) };
      } else if (key === "discount") {
        copy[index] = { ...copy[index], discount: Math.max(0, Number(val)) };
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
    const grossSales = price * item.qty;
    const nettSales = Math.max(0, grossSales - item.discount);
    return {
      ...item,
      name: product?.name || "",
      grossSales,
      nettSales
    };
  });

  const totalGross = calculatedItems.reduce((sum, i) => sum + i.grossSales, 0);
  const totalDiscount = calculatedItems.reduce((sum, i) => sum + i.discount, 0);
  const totalNett = calculatedItems.reduce((sum, i) => sum + i.nettSales, 0);

  // Settle Bill helper
  const handleSettle = async (bill: Bill) => {
    setSettlingBill(bill.id);
    try {
      // Fetch user status info to get the active authenticated user's ID
      const statusRes = await fetch("/api/activity/status");
      const statusData = await statusRes.json();
      const actualUserId = statusData?.user?.id || "dummy-user-id";
      
      const res = await fetch(`/api/bills/${bill.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bill.outstanding,
          userId: actualUserId
        })
      });

      if (res.ok) {
        alert("Payment settlement requested! Pending Admin approval.");
        await refreshOutlet();
      } else {
        const errorData = await res.json();
        alert(`Settlement request failed: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while settling payment.");
    } finally {
      setSettlingBill(null);
    }
  };

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

  // Submit Order
  const handleSubmitOrder = async () => {
    if (calculatedItems.length === 0) {
      return alert("Please add at least one product to the order.");
    }
    if (!photoUrl) {
      return alert("Photo attachment of the Nota & Products is required.");
    }

    setSubmittingOrder(true);
    try {
      // Retrieve session/user state
      const statusRes = await fetch("/api/activity/status");
      const statusData = await statusRes.json();
      const actualUserId = statusData?.user?.id || "dummy-user-id";

      const orderBody = {
        userId: actualUserId,
        outletId: outlet.id,
        grossSales: totalGross,
        discount: totalDiscount,
        nettSales: totalNett,
        topTerm,
        photoUrl,
        items: calculatedItems.map((ci) => ({
          productId: ci.productId,
          qty: ci.qty,
          grossSales: ci.grossSales,
          discount: ci.discount,
          nettSales: ci.nettSales
        }))
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody)
      });

      if (res.ok) {
        alert("Order submitted successfully!");
        router.push("/activity");
      } else {
        const err = await res.json();
        alert(`Failed to submit order: ${JSON.stringify(err)}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting order.");
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
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-rose-600">Rp {bill.outstanding.toLocaleString("id-ID")}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      disabled={settlingBill === bill.id}
                      onClick={() => handleSettle(bill)}
                      className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      {settlingBill === bill.id ? "Settling..." : "Settle"}
                    </Button>
                  </div>
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
                    type="number" 
                    value={item.qty} 
                    onChange={(e) => handleItemChange(idx, "qty", parseInt(e.target.value) || 1)}
                    className="h-10 bg-slate-50 border-slate-200" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Discount (Rp)</label>
                  <Input 
                    type="number" 
                    value={item.discount} 
                    onChange={(e) => handleItemChange(idx, "discount", parseInt(e.target.value) || 0)}
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

          {/* Payment terms & details */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
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

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-sm">
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

