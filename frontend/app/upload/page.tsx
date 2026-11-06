"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileUp, AlertCircle, FileCheck, Loader2, Sparkles, ExternalLink, CheckCircle } from "lucide-react";
import { api, UploadResponse } from "@/lib/api";

const PREPARED_SAMPLES = [
  { name: "invoice_happy_path.pdf", label: "Happy Path (Aster V-001, PO-1001)", tag: "Pass" },
  { name: "invoice_duplicate_reformatted.pdf", label: "EC-1: Business-Key Duplicate", tag: "Blocked" },
  { name: "invoice_split_1.pdf", label: "EC-2: Split PO Part 1 (INR 40k / 100k)", tag: "Pass" },
  { name: "invoice_split_2.pdf", label: "EC-2: Split PO Part 2 (INR 60k / 100k)", tag: "Pass" },
  { name: "invoice_split_3.pdf", label: "EC-2: Split PO Overbilling (INR 1k)", tag: "Review/Block" },
  { name: "invoice_missing_po.pdf", label: "EC-3: Missing PO (Candidate Search)", tag: "Review" },
  { name: "invoice_low_quality_scan.pdf", label: "EC-4: Scanned Image PDF (Vision)", tag: "Review" },
  { name: "invoice_vendor_po_mismatch.pdf", label: "Vendor PO Ownership Conflict", tag: "Blocked" },
  { name: "invoice_total_mismatch.pdf", label: "Arithmetic Discrepancy", tag: "Review" },
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<{ total: number; runs: UploadResponse[] } | null>(null);

  const validateAndSetFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const valid: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const name = f.name.toLowerCase();
      if (name.endsWith(".pdf") || name.endsWith(".zip")) {
        valid.push(f);
      }
    }
    if (valid.length === 0) {
      setError("Please select PDF invoices or a .ZIP archive containing PDFs.");
      return;
    }
    setSelectedFiles(valid);
    setError(null);
    setBatchResults(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSetFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    validateAndSetFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      if (selectedFiles.length === 1 && selectedFiles[0].name.toLowerCase().endsWith(".pdf")) {
        const response = await api.uploadInvoice(selectedFiles[0]);
        router.push(`/runs/${response.run_id}`);
      } else {
        const response = await api.uploadBatch(selectedFiles);
        setBatchResults({ total: response.successful_queued, runs: response.runs });
        setSelectedFiles([]);
        setIsUploading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to process invoice upload.");
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Vendor Invoices</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Submit single/batch invoice PDFs or a ZIP archive to execute the 13-stage deterministic AP verification pipeline.
        </p>
      </div>

      {batchResults && (
        <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">
              Batch Queued Successfully ({batchResults.total} invoice{batchResults.total > 1 ? "s" : ""})
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            All documents have been saved and background verification pipelines are now running.
          </p>
          <div className="divide-y divide-emerald-200/60 max-h-48 overflow-y-auto bg-white/70 rounded-lg p-2 text-xs">
            {batchResults.runs.map((r, i) => (
              <div key={r.run_id} className="py-1.5 px-2 flex items-center justify-between">
                <span className="font-mono text-slate-800">{r.original_filename || `Invoice ${i + 1}`}</span>
                <Link
                  href={`/runs/${r.run_id}`}
                  className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-900"
                >
                  <span>Track Run</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

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
              multiple
              accept=".pdf,.zip,application/pdf,application/zip"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <FileUp className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drag and drop invoice PDFs or ZIP archive
              </p>
              <p className="text-xs text-slate-400 mt-1">Multi-file selection supported • Max 10MB per PDF</p>
            </div>
          </div>

          {/* Selected File Card */}
          {selectedFiles.length > 0 && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{selectedFiles.length} file(s) selected for processing</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-slate-500 hover:text-rose-600 transition"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono truncate">{file.name}</span>
                    </div>
                    <span className="text-slate-400 shrink-0 font-mono text-[11px]">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={selectedFiles.length === 0 || isUploading}
            className="w-full py-3 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enqueuing Documents...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>
                  {selectedFiles.length > 1
                    ? `Process ${selectedFiles.length} Invoices in Batch`
                    : "Process Invoice Document"}
                </span>
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
            {"sample_data/invoices/"}
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
