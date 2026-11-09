"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadSimple,
  CheckCircle,
  WarningCircle,
  FilePdf,
  Sparkle,
  ArrowSquareOut,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";
import { api, UploadResponse } from "@/lib/api";

const PREPARED_SAMPLES = [
  { name: "invoice_happy_path.pdf", label: "Happy Path (Aster V-001, PO-1001)", tag: "Pass", type: "success" },
  { name: "invoice_duplicate_reformatted.pdf", label: "EC-1: Business-Key Duplicate", tag: "Blocked", type: "destructive" },
  { name: "invoice_split_1.pdf", label: "EC-2: Split PO Part 1 (INR 40k / 100k)", tag: "Pass", type: "success" },
  { name: "invoice_split_2.pdf", label: "EC-2: Split PO Part 2 (INR 60k / 100k)", tag: "Pass", type: "success" },
  { name: "invoice_split_3.pdf", label: "EC-2: Split PO Overbilling (INR 1k)", tag: "Review/Block", type: "warning" },
  { name: "invoice_missing_po.pdf", label: "EC-3: Missing PO (Candidate Search)", tag: "Review", type: "warning" },
  { name: "invoice_low_quality_scan.pdf", label: "EC-4: Scanned Image PDF (Vision)", tag: "Review", type: "warning" },
  { name: "invoice_vendor_po_mismatch.pdf", label: "Vendor PO Ownership Conflict", tag: "Blocked", type: "destructive" },
  { name: "invoice_total_mismatch.pdf", label: "Arithmetic Discrepancy", tag: "Review", type: "warning" },
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
    <div className="max-w-4xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
          Upload Vendor Invoices
        </h1>
        <p className="text-foreground/70 text-sm sm:text-base mt-1.5 leading-relaxed">
          Submit invoice PDFs or a ZIP archive to execute the 13-stage deterministic AP verification pipeline.
        </p>
      </div>

      {batchResults && (
        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/25 text-foreground space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} weight="fill" className="text-primary" />
            <span className="font-semibold text-sm text-foreground">
              Batch Queued Successfully ({batchResults.total} invoice{batchResults.total > 1 ? "s" : ""})
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            All documents have been saved and background verification pipelines are now running.
          </p>
          <div className="divide-y divide-border max-h-48 overflow-y-auto bg-card rounded-xl p-2 text-xs border border-border">
            {batchResults.runs.map((r, i) => (
              <div key={r.run_id} className="py-2 px-3 flex items-center justify-between">
                <span className="font-mono text-foreground">
                  {r.original_filename || `Invoice ${i + 1}`}
                </span>
                <Link
                  href={`/runs/${r.run_id}`}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <span>Track Run</span>
                  <ArrowSquareOut size={13} weight="bold" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Upload Box */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-xs text-destructive flex items-start gap-2.5">
            <WarningCircle size={17} weight="fill" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-10 text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition flex flex-col items-center justify-center space-y-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.zip,application/pdf,application/zip"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-primary group-hover:scale-105 transition-transform shadow-xs">
              <UploadSimple size={22} weight="bold" />
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">
                Click to browse or drag and drop invoice PDFs or ZIP archive
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Multi-file selection supported • OCR & PDF Vision enabled • Max 10MB per PDF
              </p>
            </div>
          </div>

          {/* Selected File Card */}
          {selectedFiles.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>{selectedFiles.length} file(s) selected for processing</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-muted-foreground hover:text-destructive transition cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FilePdf size={16} weight="fill" className="text-primary shrink-0" />
                      <span className="font-mono truncate text-foreground">{file.name}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
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
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isUploading ? (
              <>
                <SpinnerGap size={17} weight="bold" className="animate-spin" />
                <span>Enqueuing Documents...</span>
              </>
            ) : (
              <>
                <UploadSimple size={17} weight="bold" />
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
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Sparkle size={15} weight="fill" className="text-primary" />
          <span>Case Study Prepared Test Scenarios</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Synthetic fixture test PDFs available in{" "}
          <code className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            sample_data/invoices/
          </code>
          :
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
          {PREPARED_SAMPLES.map((s) => (
            <div
              key={s.name}
              className="p-3 rounded-xl bg-background border border-border flex items-center justify-between"
            >
              <div>
                <span className="font-mono font-medium text-foreground block text-xs">
                  {s.name}
                </span>
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                  s.type === "success"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : s.type === "destructive"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-secondary/30 text-secondary-foreground border border-secondary/40"
                }`}
              >
                {s.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
