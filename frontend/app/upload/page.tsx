"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, AlertCircle, FileCheck, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

const PREPARED_SAMPLES = [
  { name: "invoice_happy_path.pdf", label: "Happy Path (Aster V-001, PO-1001)", tag: "Pass" },
  { name: "invoice_duplicate_reformatted.pdf", label: "EC-1: Business-Key Duplicate", tag: "Blocked" },
  { name: "invoice_split_1.pdf", label: "EC-2: Split PO Part 1 (₹40k / ₹100k)", tag: "Pass" },
  { name: "invoice_split_2.pdf", label: "EC-2: Split PO Part 2 (₹60k / ₹100k)", tag: "Pass" },
  { name: "invoice_split_3.pdf", label: "EC-2: Split PO Overbilling (₹1k)", tag: "Review/Block" },
  { name: "invoice_missing_po.pdf", label: "EC-3: Missing PO (Candidate Search)", tag: "Review" },
  { name: "invoice_low_quality_scan.pdf", label: "EC-4: Scanned Image PDF (Vision)", tag: "Review" },
  { name: "invoice_vendor_po_mismatch.pdf", label: "Vendor PO Ownership Conflict", tag: "Blocked" },
  { name: "invoice_total_mismatch.pdf", label: "Arithmetic Discrepancy", tag: "Review" },
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    try {
      const response = await api.uploadInvoice(selectedFile);
      router.push(`/runs/${response.run_id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to process invoice upload.");
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Vendor Invoice</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Submit an invoice PDF to execute the 13-stage deterministic AP verification pipeline.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs space-y-6">
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-10 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition flex flex-col items-center justify-center space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <FileUp className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drag and drop invoice PDF
              </p>
              <p className="text-xs text-slate-400 mt-1">Single PDF files up to 10MB • Max 20 pages</p>
            </div>
          </div>

          {/* Selected File Card */}
          {selectedFile && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="font-medium text-sm text-slate-900 block">{selectedFile.name}</span>
                  <span className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-xs text-slate-500 hover:text-rose-600 transition"
              >
                Remove
              </button>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full py-3 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing Pipeline...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Process Invoice Document</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Demo Fixtures Reference Helper */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Case Study Prepared Scenarios</span>
        </div>
        <p className="text-xs text-slate-500">
          You can test these synthetic fixture PDFs located in{" "}
          <code className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
            sample_data/invoices/
          </code>
          :
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
          {PREPARED_SAMPLES.map((s) => (
            <div
              key={s.name}
              className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between"
            >
              <div>
                <span className="font-mono font-medium text-slate-800 block">{s.name}</span>
                <span className="text-[11px] text-slate-400">{s.label}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                {s.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
