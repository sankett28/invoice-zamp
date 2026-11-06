"use client";

import React, { useEffect, useState } from "react";
import { Building2, ShoppingCart, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { api, Vendor, PurchaseOrder } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vData, poData] = await Promise.all([
        api.listVendors(),
        api.listPurchaseOrders(),
      ]);
      setVendors(vData);
      setPOs(poData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Procurement Data</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Seeded ERP vendor directory and purchase order commitment records.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Vendors Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">Vendor Master Directory ({vendors.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Vendor Code</th>
                <th className="py-3 px-4">Legal Business Name</th>
                <th className="py-3 px-4">GST / Tax ID</th>
                <th className="py-3 px-4">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{v.vendor_code}</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{v.legal_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{v.tax_id || "—"}</td>
                  <td className="py-3 px-4">
                    {v.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    ) : v.status === "INACTIVE" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Inactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3" /> Unapproved
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">Purchase Orders & Budgets ({pos.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Remaining Available</th>
                <th className="py-3 px-4">Lifecycle Status</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{p.po_number}</td>
                  <td className="py-3 px-4 text-slate-700 truncate max-w-xs">{p.vendor?.legal_name || "—"}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(p.po_date)}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{formatCurrency(p.po_total)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                    {formatCurrency(p.remaining_balance || p.po_total)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        p.status === "OPEN"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : p.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 truncate max-w-sm">{p.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
