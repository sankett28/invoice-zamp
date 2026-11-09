"use client";

import React, { useEffect, useState } from "react";
import {
  Buildings,
  ShoppingCart,
  ArrowsClockwise,
  CheckCircle,
  Prohibit,
} from "@phosphor-icons/react";
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
    <div className="space-y-8 max-w-7xl w-full mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
            Master Procurement Directory
          </h1>
          <p className="text-foreground/70 text-sm sm:text-base mt-1.5 leading-relaxed">
            Seeded ERP vendor records, approved tax profiles, and active purchase order budgets.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition shadow-xs cursor-pointer self-start sm:self-auto"
          title="Refresh Directory"
        >
          <ArrowsClockwise size={16} weight="bold" className={loading ? "animate-spin text-primary" : ""} />
        </button>
      </div>

      {/* Vendors Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border flex items-center gap-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Buildings size={18} weight="bold" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold leading-tight text-foreground">
              Vendor Master Directory ({vendors.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registered business entities, legal names, and GST / PAN tax credentials
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase text-[10px] tracking-wide">
              <tr>
                <th className="py-3 px-5">Vendor Code</th>
                <th className="py-3 px-5">Legal Business Name</th>
                <th className="py-3 px-5">GST / Tax ID</th>
                <th className="py-3 px-5">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition">
                  <td className="py-3.5 px-5 font-mono font-semibold text-foreground">
                    {v.vendor_code}
                  </td>
                  <td className="py-3.5 px-5 text-foreground font-medium">
                    {v.legal_name}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-muted-foreground">
                    {v.tax_id || "—"}
                  </td>
                  <td className="py-3.5 px-5">
                    {v.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <CheckCircle size={13} weight="fill" />
                        <span>Approved</span>
                      </span>
                    ) : v.status === "INACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                        Inactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                        <Prohibit size={13} weight="bold" />
                        <span>Unapproved</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Orders Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border flex items-center gap-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-secondary/30 flex items-center justify-center text-secondary-foreground">
            <ShoppingCart size={18} weight="bold" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold leading-tight text-foreground">
              Purchase Orders & Budgets ({pos.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contract commitments, remaining balances, and line item allotments
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase text-[10px] tracking-wide">
              <tr>
                <th className="py-3 px-5">PO Number</th>
                <th className="py-3 px-5">Vendor</th>
                <th className="py-3 px-5">Issue Date</th>
                <th className="py-3 px-5">Total Value</th>
                <th className="py-3 px-5">Remaining Available</th>
                <th className="py-3 px-5">Lifecycle Status</th>
                <th className="py-3 px-5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pos.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition">
                  <td className="py-3.5 px-5 font-mono font-semibold text-foreground">
                    {p.po_number}
                  </td>
                  <td className="py-3.5 px-5 text-foreground truncate max-w-xs font-medium">
                    {p.vendor?.legal_name || "—"}
                  </td>
                  <td className="py-3.5 px-5 text-muted-foreground">
                    {formatDate(p.po_date)}
                  </td>
                  <td className="py-3.5 px-5 font-mono font-semibold text-foreground tabular-nums">
                    {formatCurrency(p.po_total)}
                  </td>
                  <td className="py-3.5 px-5 font-mono font-bold text-primary tabular-nums">
                    {formatCurrency(p.remaining_balance || p.po_total)}
                  </td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        p.status === "OPEN"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : p.status === "CANCELLED"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-muted-foreground truncate max-w-sm">
                    {p.description || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
