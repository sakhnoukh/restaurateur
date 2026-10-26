"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Receipt,
  Plus,
  Trash2,
  Banknote,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  api,
  type MenuItem,
  type AccountingSummary,
  type Reservation,
  type PaymentMethod,
  type OrderItem,
} from "@/lib/api";

export default function POSAndAccountingPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [accounting, setAccounting] = useState<AccountingSummary | null>(null);
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Order terminal state
  const [selectedReservationId, setSelectedReservationId] = useState("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [tipAmount, setTipAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // New Menu Item state
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("Mains");
  const [itemPrice, setItemPrice] = useState("");
  const [itemStock, setItemStock] = useState("30");

  // New Expense state
  const [expCategory, setExpCategory] = useState("Ingredients & Produce");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expMethod, setExpMethod] = useState<PaymentMethod>("cash");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [m, a, r] = await Promise.all([
        api.getMenuItems(),
        api.getAccountingSummary(),
        api.getReservations({ date: today }),
      ]);
      setMenuItems(m);
      setAccounting(a);
      const openRes = r.filter((res) => res.status === "seated" || res.status === "expected");
      setActiveReservations(openRes);
      if (!selectedReservationId && openRes.length > 0) {
        setSelectedReservationId(openRes[0].id);
      }
    } catch (err) {
      console.error("Failed to load POS & accounting:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedReservationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 },
      ];
    });
  };

  const removeFromCart = (name: string) => {
    setCart((prev) => prev.filter((i) => i.name !== name));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleChargeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReservationId || cartTotal <= 0) return;
    setSubmittingOrder(true);
    try {
      await api.createTransaction(selectedReservationId, {
        amount: cartTotal,
        tip_amount: parseFloat(tipAmount) || 0,
        payment_method: paymentMethod,
        pos_receipt_id: `POS-${Math.floor(1000 + Math.random() * 9000)}`,
        items_json: cart,
        mark_completed: true,
      });
      setCart([]);
      setTipAmount("0");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to charge POS order");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || isNaN(price) || price <= 0) return;
    try {
      await api.createMenuItem({
        name: itemName.trim(),
        category: itemCategory,
        price,
        stock_quantity: parseInt(itemStock, 10) || 30,
      });
      setItemName("");
      setItemPrice("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add menu item");
    }
  };

  const handleToggle86 = async (item: MenuItem) => {
    try {
      await api.updateMenuItem(item.id, { is_available: !item.is_available });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (!expDesc.trim() || isNaN(amt) || amt <= 0) return;
    try {
      await api.createExpense({
        date: new Date().toISOString().split("T")[0],
        category: expCategory,
        description: expDesc.trim(),
        amount: amt,
        payment_method: expMethod,
      });
      setExpDesc("");
      setExpAmount("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record expense");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Point of Sale (POS) & Built-in Accounting
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Itemized table ordering, menu 86-status control, expense ledger, and Z-Report P&L summary
        </p>
      </div>

      {/* Accounting Summary Cards */}
      {accounting && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Gross POS Revenue
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {accounting.gross_revenue.toLocaleString()} EGP
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {accounting.transactions_count} closed checks
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Banknote className="w-4 h-4 text-blue-600" />
              Staff Tips Collected
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {accounting.total_tips.toLocaleString()} EGP
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Operating Expenses
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {accounting.total_expenses.toLocaleString()} EGP
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Net Operating Profit
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${
                accounting.net_profit >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {accounting.net_profit.toLocaleString()} EGP
            </p>
          </div>
        </div>
      )}

      {/* POS Terminal & Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Catalog */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand-500" />
              Menu Catalog (Click to Add to Check)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                  item.is_available
                    ? "bg-white border-gray-200 hover:border-brand-400"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-brand-600 uppercase">
                      {item.category}
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                        item.stock_quantity <= item.low_stock_threshold
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.stock_quantity} left
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-1">{item.name}</p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">
                    {item.price.toLocaleString()} EGP
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                  <button
                    disabled={!item.is_available}
                    onClick={() => addToCart(item)}
                    className="flex-1 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-semibold disabled:opacity-40"
                  >
                    + Add to Check
                  </button>
                  <button
                    onClick={() => handleToggle86(item)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    {item.is_available ? "86 Item" : "Restore"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Menu Dish Form */}
          <form
            onSubmit={handleAddMenuItem}
            className="pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-5 gap-2"
          >
            <input
              type="text"
              placeholder="New Dish Name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs"
            >
              <option value="Starters">Starters</option>
              <option value="Mains">Mains</option>
              <option value="Desserts">Desserts</option>
              <option value="Beverages">Beverages</option>
            </select>
            <input
              type="number"
              placeholder="Price (EGP)"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Dish
            </button>
          </form>
        </div>

        {/* Active Check / POS Register */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 h-fit">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Table Check Register
          </h2>

          <form onSubmit={handleChargeOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Assign to Today&apos;s Reservation
              </label>
              <select
                value={selectedReservationId}
                onChange={(e) => setSelectedReservationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select Table / Guest...</option>
                {activeReservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.table_number ? `Table ${r.table_number}` : "Walk-in"} —{" "}
                    {r.customer?.name ?? "Guest"} ({r.time.slice(0, 5)})
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  Click menu items on the left to build an itemized check
                </p>
              ) : (
                cart.map((c) => (
                  <div
                    key={c.name}
                    className="p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {c.quantity}x {c.name}
                      </span>
                      <span className="text-gray-400 ml-1">
                        ({c.price} EGP)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {(c.price * c.quantity).toLocaleString()} EGP
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(c.name)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tip (EGP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="instapay">InstaPay</option>
                  <option value="wallet">Mobile Wallet</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Total Check</span>
              <span className="text-lg font-bold text-emerald-700">
                {cartTotal.toLocaleString()} EGP
              </span>
            </div>

            <button
              type="submit"
              disabled={submittingOrder || !selectedReservationId || cartTotal <= 0}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Close Check & Update Loyalty
            </button>
          </form>
        </div>
      </div>

      {/* Built-in Accounting: Expense Ledger & Payment Breakdown */}
      {accounting && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">
              Expense & Supplier Payout Ledger
            </h2>

            <form
              onSubmit={handleAddExpense}
              className="grid grid-cols-1 sm:grid-cols-5 gap-2"
            >
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Ingredients & Produce">Ingredients & Produce</option>
                <option value="Utilities & Maintenance">Utilities & Maintenance</option>
                <option value="Payroll & Wages">Payroll & Wages</option>
                <option value="Marketing">Marketing</option>
              </select>
              <input
                type="text"
                placeholder="Description (e.g. Seafood supplier)"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <input
                type="number"
                placeholder="Amount (EGP)"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600"
              >
                Log Expense
              </button>
            </form>

            <div className="divide-y divide-gray-100">
              {accounting.recent_expenses.map((e) => (
                <div
                  key={e.id}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900">{e.description}</p>
                    <p className="text-xs text-gray-500">
                      {e.category} · {e.date} · Paid via {e.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <span className="font-semibold text-red-600">
                    -{e.amount.toLocaleString()} EGP
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Z-Report Tender Breakdown</h2>
            <div className="space-y-2">
              {Object.entries(accounting.by_payment_method).map(([method, amt]) => (
                <div
                  key={method}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <span className="uppercase font-medium text-gray-600">{method}</span>
                  <span className="font-bold text-gray-900">
                    {amt.toLocaleString()} EGP
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
