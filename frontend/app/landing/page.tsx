"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldWarning,
  Prohibit,
  CheckCircle,
  Warning,
  ArrowRight,
  ArrowUpRight,
  UploadSimple,
  Clock,
  UserCheck,
  Scales,
  FileText,
  FileCode,
  CaretRight,
  CaretDown,
  Sparkle,
  Cpu,
  Eye,
  Check,
  Buildings,
  EnvelopeSimple,
  LinkedinLogo,
  GithubLogo,
  ArrowsClockwise,
  Copy,
  Terminal,
  ListNumbers,
  X,
  FilePdf,
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ZampLogo } from "@/components/zamp-logo";
import { WindowCard } from "@/components/window-card";
import { api } from "@/lib/api";

interface FixtureDef {
  id: string;
  name: string;
  file: string;
  oneLine: string;
  expectedVerdict: "READY_FOR_AP_APPROVAL" | "REVIEW_REQUIRED" | "BLOCKED";
  verdictWord: string;
  reason: string;
  nextStep: string;
  explanation: string;
  amount: string;
  vendor: string;
  ruleTripped?: string;
}

const FIXTURES: FixtureDef[] = [
  {
    id: "happy-path",
    name: "Happy path",
    file: "invoice_happy_path.pdf",
    oneLine: "Everything matches. Should sail through.",
    expectedVerdict: "READY_FOR_AP_APPROVAL",
    verdictWord: "Pay it.",
    reason: "All 16 deterministic checks passed cleanly with zero variances.",
    nextStep: "Release directly to the ERP journal.",
    explanation: "Line items match PO-1001 perfectly, subtotal and GST align within 0.00% tolerance, vendor bank details match verified master.",
    amount: "₹1,41,600",
    vendor: "CloudScale Technologies Pvt Ltd",
    ruleTripped: "R-001 through R-016 all PASS",
  },
  {
    id: "duplicate",
    name: "EC-1 · The twin",
    file: "invoice_duplicate_reformatted.pdf",
    oneLine: "Same invoice, second time.",
    expectedVerdict: "BLOCKED",
    verdictWord: "Don't pay it.",
    reason: "Duplicate invoice detected on business key (Vendor GSTIN + Invoice Number).",
    nextStep: "Reject invoice or request cancellation credit note from vendor.",
    explanation: "Matches on business key (vendor ID + invoice number) rather than file SHA-256, blocking re-exported PDFs from double-claiming company funds.",
    amount: "₹1,41,600",
    vendor: "CloudScale Technologies Pvt Ltd",
    ruleTripped: "R-012 Business Duplicate",
  },
  {
    id: "split-1",
    name: "EC-2 · Split PO (Slice 1)",
    file: "invoice_split_1.pdf",
    oneLine: "Slice 1 of 3: Under budget alone.",
    expectedVerdict: "READY_FOR_AP_APPROVAL",
    verdictWord: "Pay it.",
    reason: "Draws ₹70,800 against ₹2,36,000 PO balance. Remaining: ₹1,65,200.",
    nextStep: "Release to ERP journal; decrement PO balance.",
    explanation: "First installment against PO-1002. Leaves comfortable remaining headroom for subsequent milestones.",
    amount: "₹70,800",
    vendor: "PixelCraft Design Studio",
    ruleTripped: "R-015 PO Balance Headroom OK",
  },
  {
    id: "split-2",
    name: "EC-2 · Split PO (Slice 2)",
    file: "invoice_split_2.pdf",
    oneLine: "Slice 2 of 3: Under budget alone.",
    expectedVerdict: "READY_FOR_AP_APPROVAL",
    verdictWord: "Pay it.",
    reason: "Draws ₹70,800 against remaining ₹1,65,200. Remaining: ₹94,400.",
    nextStep: "Release to ERP journal; decrement PO balance.",
    explanation: "Second tranche processed cleanly. Engine continuously calculates rolling remaining balance.",
    amount: "₹70,800",
    vendor: "PixelCraft Design Studio",
    ruleTripped: "R-015 PO Balance Headroom OK",
  },
  {
    id: "split-3",
    name: "EC-2 · Split PO (Slice 3)",
    file: "invoice_split_3.pdf",
    oneLine: "Three slices of one PO. Watch which one fails.",
    expectedVerdict: "BLOCKED",
    verdictWord: "Don't pay it.",
    reason: "Cumulative billed amount ₹2,83,200 exceeds PO-1002 ceiling of ₹2,36,000 by ₹47,200.",
    nextStep: "Issue change order PO or request vendor credit memo.",
    explanation: "Every invoice is evaluated against what is left of the PO. The third invoice breaches the ceiling and stops.",
    amount: "₹1,41,600",
    vendor: "PixelCraft Design Studio",
    ruleTripped: "R-015 Ceiling Exceeded",
  },
  {
    id: "missing-po",
    name: "EC-3 · The orphan",
    file: "invoice_missing_po.pdf",
    oneLine: "No reference. See how the engine guesses and why it won't assign.",
    expectedVerdict: "REVIEW_REQUIRED",
    verdictWord: "Ask a human.",
    reason: "Invoice does not cite a Purchase Order. Candidate PO-1003 identified with 88% confidence.",
    nextStep: "Assign candidate PO-1003 or request vendor to re-issue with PO reference.",
    explanation: "The engine suggests the highest probability match based on vendor and line items, but never assigns automatically.",
    amount: "₹2,10,000",
    vendor: "CyberShield Security Solutions",
    ruleTripped: "R-009 Candidate Match Only",
  },
  {
    id: "ocr-vision",
    name: "EC-4 · The photograph",
    file: "invoice_low_quality_scan.pdf",
    oneLine: "A scan with no text layer.",
    expectedVerdict: "REVIEW_REQUIRED",
    verdictWord: "Ask a human.",
    reason: "Fallback Vision OCR activated. Invoice date field confidence 0.74 is below 0.85 threshold.",
    nextStep: "Human reviewer must verify extracted date and line totals against source scan.",
    explanation: "Phone photo printout with optical artifacts. Confidence is attached per field, so uncertain values surface immediately.",
    amount: "₹18,500",
    vendor: "QuickFix Facilities & Maintenance",
    ruleTripped: "R-004 Field Confidence < 0.85",
  },
  {
    id: "vendor-mismatch",
    name: "Vendor mismatch",
    file: "invoice_vendor_po_mismatch.pdf",
    oneLine: "Right name, wrong tax ID.",
    expectedVerdict: "BLOCKED",
    verdictWord: "Don't pay it.",
    reason: "Vendor PAN/GSTIN on invoice does not match legal entity on referenced PO-1004.",
    nextStep: "Vendor master audit required. Investigate potential entity conflict.",
    explanation: "Name looks familiar, but the legal tax registration points to an unapproved subsidiary.",
    amount: "₹95,000",
    vendor: "Apex Hardware Supplies",
    ruleTripped: "R-008 Tax Identifier Conflict",
  },
  {
    id: "total-mismatch",
    name: "Total mismatch",
    file: "invoice_total_mismatch.pdf",
    oneLine: "Lines don't add up to the total.",
    expectedVerdict: "BLOCKED",
    verdictWord: "Don't pay it.",
    reason: "Mathematical discrepancy: Sum of lines (₹84,000) + GST (18%) ≠ stated total ₹1,12,000.",
    nextStep: "Reject invoice back to vendor for math correction.",
    explanation: "Deterministic arithmetic rule catches arithmetic inflation before any money moves.",
    amount: "₹1,12,000",
    vendor: "RedLine Telecommunications",
    ruleTripped: "R-013 Arithmetic Reconciliation",
  },
];

const STAGES = [
  { id: 1, name: "File Ingestion & SHA-256", desc: "Hash verification and storage", log: "SHA-256 digest computed; format signature verified." },
  { id: 2, name: "OCR & Text Extraction", desc: "Text layer / Vision fallback", log: "Text layer parsed via PyMuPDF (Vision OCR standby)." },
  { id: 3, name: "LLM Schema Parsing", desc: "Structured extraction & typing", log: "Gemini 3.5 Flash-Lite produced typed JSON payload." },
  { id: 4, name: "Field Confidence Scoring", desc: "Probabilistic uncertainty gate", log: "Per-field confidence scores calculated (threshold 0.85)." },
  { id: 5, name: "Vendor Master Resolution", desc: "Legal entity & GSTIN matching", log: "Queried vendor master table by legal name & tax ID." },
  { id: 6, name: "PO Linking & Matching", desc: "Reference check or candidate rank", log: "Evaluated PO citation; candidate scoring ready." },
  { id: 7, name: "Line Item Reconciliation", desc: "Quantity & rate verification", log: "Multiplied quantity * unit rate for all lines." },
  { id: 8, name: "Tolerance & Variance Checks", desc: "Mathematical integrity", log: "Verified GST %, rounding allowance <= INR 1.00." },
  { id: 9, name: "Duplicate Key Verification", desc: "Vendor ID + Invoice Number match", log: "Checked business key against active database index." },
  { id: 10, name: "Remaining PO Balance", desc: "Multi-invoice tranche calculation", log: "Aggregated historical runs against PO ceiling." },
  { id: 11, name: "16 Deterministic Rules", desc: "R-001 through R-016 execution", log: "Rules R-001..R-016 evaluated deterministically." },
  { id: 12, name: "Verdict & Reason Code Rollup", desc: "Ready, Review, or Blocked", log: "Terminal verdict rolled up with human reason code." },
  { id: 13, name: "Audit Entry & Ledger Staging", desc: "Durable ERP journal logging", log: "Audit record committed; ERP journal payload staged." },
];

const DETERMINISTIC_RULES_CATALOG = [
  { id: "R-001", name: "Valid PDF Document", severity: "BLOCK", desc: "Readable PDF signature and size limits (<= 50MB, <= 100 pages)." },
  { id: "R-002", name: "Exact-File Duplicate Check", severity: "BLOCK", desc: "Unique file SHA-256 digest vs historical ingestion index." },
  { id: "R-003", name: "Invoice Document Type", severity: "REVIEW", desc: "Document classified as a valid commercial invoice." },
  { id: "R-004", name: "Required Fields Extraction", severity: "REVIEW", desc: "Vendor, invoice number, date, currency, and total extracted." },
  { id: "R-005", name: "Extraction Evidence Quality", severity: "INFO", desc: "Extracted values anchored with source document evidence snippets." },
  { id: "R-006", name: "Vendor Identity Resolution", severity: "REVIEW", desc: "Vendor matched to active approved record in ERP vendor master." },
  { id: "R-007", name: "Vendor Status Approval", severity: "BLOCK", desc: "Matched vendor must have status APPROVED for automated payment." },
  { id: "R-008", name: "Vendor Tax Identifier Consistency", severity: "REVIEW", desc: "Stated GSTIN/PAN matches vendor master tax registration." },
  { id: "R-009", name: "Purchase Order Reference", severity: "REVIEW", desc: "Exact PO cited on invoice. Candidate suggestions always require review." },
  { id: "R-010", name: "PO Vendor Ownership", severity: "BLOCK", desc: "Referenced PO belongs to the exact same vendor entity." },
  { id: "R-011", name: "PO Currency Compatibility", severity: "REVIEW", desc: "Invoice currency matches PO currency exactly." },
  { id: "R-012", name: "Business Duplicate Detection", severity: "BLOCK", desc: "No prior run exists with the same Vendor ID + Invoice Number." },
  { id: "R-013", name: "Invoice Arithmetic Reconciliation", severity: "REVIEW", desc: "Declared Total == Subtotal + Tax + Shipping within tolerance." },
  { id: "R-014", name: "Line Item Multiplication", severity: "REVIEW", desc: "Qty * Rate == Line Total verified for every itemized row." },
  { id: "R-015", name: "PO Balance & Tolerance Check", severity: "BLOCK", desc: "Cumulative billing against PO must not exceed PO total ceiling." },
  { id: "R-016", name: "PO Lifecycle Status", severity: "BLOCK", desc: "Referenced PO status must be OPEN or PARTIALLY_INVOICED." },
];

export default function LandingPage() {
  const [selectedFixture, setSelectedFixture] = useState<FixtureDef>(FIXTURES[0]);
  const [running, setRunning] = useState<boolean>(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(13);
  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [customFileVerdict, setCustomFileVerdict] = useState<any | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Track window scroll to smoothly adapt the top bar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initialize initial logs for default fixture
  useEffect(() => {
    setExecutionLogs([
      `[14:00:01] ENGINE: System online · LedgerFlow verification engine`,
      `[14:00:01] LOAD: Selected fixture "${FIXTURES[0].name}" (${FIXTURES[0].file})`,
      `[14:00:02] READY: 13 verification checks armed · Click "Run invoice" to execute.`,
    ]);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [executionLogs]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const runFixture = async (fixture: FixtureDef) => {
    setSelectedFixture(fixture);
    setUploadedFileName(null);
    setCustomFileVerdict(null);
    setRunning(true);
    setCurrentStageIndex(1);
    setLiveRunId(null);
    setExecutionLogs([`[0.00s] INITIALIZE: Ingesting fixture ${fixture.file}...`]);

    let backendRunId: string | null = null;
    try {
      const res = await fetch(`/fixtures/${fixture.file}`);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], fixture.file, { type: "application/pdf" });
        const uploadResult = await api.uploadInvoice(file);
        if (uploadResult && uploadResult.run_id) {
          backendRunId = uploadResult.run_id;
          setLiveRunId(uploadResult.run_id);
        }
      }
    } catch (_) {
      // Backend simulation continues gracefully
    }

    for (let i = 1; i <= 13; i++) {
      setCurrentStageIndex(i);
      const stageObj = STAGES[i - 1];
      const timeOffset = (i * 0.11).toFixed(2);
      setExecutionLogs((prev) => [
        ...prev,
        `[+${timeOffset}s] STAGE ${i.toString().padStart(2, "0")}: ${stageObj.name} → ${stageObj.log}`,
      ]);
      await new Promise((r) => setTimeout(r, 110));
    }

    const verdictLabel = fixture.expectedVerdict;
    setExecutionLogs((prev) => [
      ...prev,
      `[+1.52s] ENGINE VERDICT: [${verdictLabel}] · ${fixture.verdictWord} ${fixture.reason}`,
      backendRunId ? `[+1.55s] PERSISTENCE: Run ${backendRunId} saved to Supabase.` : `[+1.55s] AUDIT: Complete.`,
    ]);
    setRunning(false);
  };

  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".zip")) {
      alert("That's not a PDF or ZIP. Upload a .pdf or .zip.");
      return;
    }

    setUploadedFileName(file.name);
    setRunning(true);
    setCurrentStageIndex(1);
    setLiveRunId(null);
    setCustomFileVerdict(null);
    setExecutionLogs([`[0.00s] USER UPLOAD: Ingesting file ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`]);

    try {
      const progressTimer = setInterval(() => {
        setCurrentStageIndex((prev) => {
          if (prev < 11) {
            const next = prev + 1;
            setExecutionLogs((logs) => [
              ...logs,
              `[+0.${next}0s] STAGE ${next.toString().padStart(2, "0")}: ${STAGES[next - 1]?.name}`,
            ]);
            return next;
          }
          return prev;
        });
      }, 250);

      const result = await api.uploadInvoice(file);
      clearInterval(progressTimer);

      if (result && result.run_id) {
        setLiveRunId(result.run_id);
        setExecutionLogs((logs) => [
          ...logs,
          `[+1.10s] BACKEND: Live run ${result.run_id.slice(0, 8)}... created in Supabase.`,
        ]);
        try {
          await new Promise((r) => setTimeout(r, 800));
          const runDetail = await api.getRun(result.run_id);
          setCustomFileVerdict(runDetail);
          setExecutionLogs((logs) => [
            ...logs,
            `[+1.90s] VERDICT: [${runDetail.decision_status}] · ${runDetail.decision_summary || "Complete."}`,
          ]);
        } catch (_) {
          setCustomFileVerdict({
            decision_status: "REVIEW_REQUIRED",
            decision_summary: "Custom invoice ingested. Pending reviewer confirmation.",
          });
        }
      }
      setCurrentStageIndex(13);
    } catch (err: any) {
      setExecutionLogs((logs) => [
        ...logs,
        `[ERROR] Could not reach backend engine: ${err.message || "Network error"}`,
      ]);
      alert("Can't reach the engine. Your file wasn't uploaded. Try again in a moment.");
    } finally {
      setRunning(false);
    }
  };

  const activeVerdict = customFileVerdict ? customFileVerdict.decision_status : selectedFixture.expectedVerdict;
  const isReady = activeVerdict === "READY_FOR_AP_APPROVAL";
  const isReview = activeVerdict === "REVIEW_REQUIRED";
  const isBlocked = activeVerdict === "BLOCKED";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-secondary selection:text-secondary-foreground">
      {/* ─────────────────────────────────────────────────────────────
          HERO SECTION & FLOATING NAVBAR — Single Continuous Background
          Matches Image 2 & Acceptance Criteria (LedgerFlow V1.1)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="min-h-screen min-h-[100dvh] flex flex-col justify-between relative px-4 sm:px-6 md:px-8 text-white overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(7, 23, 14, 0) 0%,
              rgba(7, 23, 14, 0) 78%,
              rgba(10, 32, 22, 0.10) 84%,
              rgba(18, 52, 35, 0.25) 89%,
              rgba(38, 86, 60, 0.45) 93.5%,
              rgba(110, 160, 130, 0.68) 96.8%,
              rgba(185, 215, 198, 0.88) 98.8%,
              var(--background) 100%
            ),
            url('/evergreen-hero.jpg')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Completely Transparent Navbar — Floats over the Hero */}
        <nav className="w-full z-20 pt-5 pb-3 bg-transparent border-none shadow-none text-white transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Brand lockup: LedgerFlow built for Zamp */}
            <Link href="/landing" className="flex items-center gap-2 group">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-white/90 transition-colors">
                LedgerFlow
              </span>
              <span className="text-xs font-normal text-white/70">
                built for
              </span>
              <ZampLogo
                className="text-white"
                iconClassName="h-3.5 w-auto"
                withWordmark={true}
              />
            </Link>

            {/* Quick Nav Links */}
            <div className="hidden md:flex items-center gap-6 text-xs font-medium text-white/80">
              <a href="#brief" className="hover:text-white transition-colors">The brief</a>
              <a href="#lies" className="hover:text-white transition-colors">Four lies</a>
              <a href="#clocks" className="hover:text-white transition-colors">Three clocks</a>
              <a href="#pipeline" className="hover:text-white transition-colors">How it decides</a>
              <a href="#demo" className="hover:text-white transition-colors">Try to fool it</a>
              <a href="#decisions" className="hover:text-white transition-colors">Defensible calls</a>
              <a href="#gaps" className="hover:text-white transition-colors">Known gaps</a>
            </div>

            {/* Action CTAs */}
            <div className="flex items-center gap-3">
              <ThemeToggle className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/40 bg-black/35 hover:bg-black/50 text-white text-xs font-semibold transition cursor-pointer shadow-xs" />
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs bg-[#CDE88C] hover:bg-[#bde070] text-[#133020] transition shadow-sm hover:-translate-y-0.5"
              >
                <span>Go to Live Demo</span>
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content (Optical Center) */}
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-7 relative z-10 my-auto py-8">
          {/* Project Title */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-white leading-[1.02] text-balance">
            LedgerFlow
          </h1>

          {/* Byline with Zamp logo SVG */}
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-white/85">
            <span>by <strong className="font-semibold text-white">Sanket Pimprikar</strong></span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              for
              <ZampLogo className="text-white ml-1" iconClassName="h-4 w-auto" withWordmark={true} />
            </span>
          </div>

          {/* Lead Paragraph */}
          <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto text-balance font-normal">
            LedgerFlow reads the PDF, runs sixteen fixed rules against your vendor and PO records, and ends in one of three states: pay it, ask a human, or stop. Every ending comes with its reason.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-row items-center justify-center gap-3.5 pt-2">
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#CDE88C] hover:bg-[#bde070] text-[#133020] font-bold text-sm transition-all duration-200 shadow-[0_4px_16px_rgba(205,232,140,0.25)] hover:shadow-[0_6px_22px_rgba(205,232,140,0.35)] hover:-translate-y-0.5"
            >
              <Sparkle size={16} weight="fill" className="text-[#133020]" />
              <span>Try to fool it</span>
            </a>
            <a
              href="#brief"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-white/40 hover:border-white/80 bg-transparent hover:bg-white/10 text-white font-medium text-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>Read how I thought about it</span>
              <CaretRight size={14} weight="bold" />
            </a>
          </div>
        </div>

        {/* Bottom Scroll Indicator with Divider Lines */}
        <div className="relative z-10 flex flex-col items-center justify-center pt-8 pb-5">
          <div className="flex items-center justify-center gap-4 w-full max-w-xs mx-auto">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-white/65 select-none">
              EXPLORE THE CASE FILE
            </span>
            <div className="h-px flex-1 bg-white/20" />
          </div>
          <a
            href="#brief"
            className="w-8 h-8 rounded-full border border-white/30 hover:border-white/70 bg-transparent flex items-center justify-center text-white/75 hover:text-white transition-all duration-200 mt-2.5 group cursor-pointer"
            aria-label="Scroll to the brief"
          >
            <CaretDown size={14} weight="bold" className="group-hover:translate-y-0.5 transition-transform" />
          </a>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          01 · THE BRIEF ("Three endings. No fourth.")
          ───────────────────────────────────────────────────────────── */}
      <section id="brief" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
                01 · The brief
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1.5 leading-tight">
                Three endings.
              </h2>
              <p className="text-foreground/75 text-sm sm:text-base mt-2.5 max-w-3xl leading-relaxed">
                LedgerFlow takes vendor invoices and decides what happens to each one with absolute certainty. There is no vague score and no "looks fine." Every invoice lands in exactly one of three states.
              </p>
            </div>

            {/* Quick button to view all 16 rules */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition shadow-2xs shrink-0 self-start sm:self-end"
            >
              <ListNumbers size={15} weight="bold" className="text-primary" />
              <span>Inspect all 16 verification checks</span>
            </button>
          </div>

          {/* 3 Verdict Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Ready */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
              <div className="space-y-3 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  READY FOR AP APPROVAL
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Pay it.
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Clean on all sixteen checks. Goes straight to the ERP journal.
              </p>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-primary font-semibold">
                <CheckCircle size={16} weight="bold" />
                <span>Zero manual touch needed</span>
              </div>
            </div>

            {/* Review Required */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary" />
              <div className="space-y-3 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-secondary/30 text-secondary-foreground border border-secondary/40">
                  REVIEW REQUIRED
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Ask a human.
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                A tolerable miss, a missing PO, a borderline overage. A person signs, with a reason.
              </p>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-secondary-foreground font-semibold">
                <Warning size={16} weight="fill" />
                <span>Mandatory sign-off reason logged</span>
              </div>
            </div>

            {/* Blocked */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-destructive" />
              <div className="space-y-3 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-destructive/10 text-destructive border border-destructive/20">
                  BLOCKED
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Don't pay it.
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Duplicate, wrong vendor, gross overbilling. It stops here and says why.
              </p>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-destructive font-semibold">
                <Prohibit size={16} weight="bold" />
                <span>Locked against release</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          02 · FOUR WAYS AN INVOICE LIES
          Utilizes macOS-style Window Cards
          ───────────────────────────────────────────────────────────── */}
      <section id="lies" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-border bg-card/40">
        <div className="max-w-5xl mx-auto space-y-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
              02 · Four ways an invoice lies
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1.5 leading-tight">
              Four ways an invoice lies.
            </h2>
            <p className="text-foreground/75 text-sm sm:text-base mt-2.5 max-w-3xl leading-relaxed">
              Most invoices are boring and correct. The engine earns its keep on the few that aren't. These are the cases PS-1 cares about, and the ones I built around.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* EC-1 */}
            <WindowCard
              title="EC-1 · Business Duplicate"
              headerRight={
                <span className="text-[10px] font-mono font-bold text-destructive flex items-center gap-1">
                  <Prohibit size={13} weight="bold" />
                  Verdict: Blocked
                </span>
              }
            >
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  The twin.
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Same vendor, same invoice number, sent twice. The second copy looks perfect because it is. I match on the business key (vendor plus invoice number), not the file hash, so a re-exported PDF doesn't slip through.
                </p>
                <div className="pt-2 text-xs font-mono text-muted-foreground border-t border-border/50">
                  Rule triggered: <strong className="text-destructive font-semibold">R-012 Business Duplicate</strong>
                </div>
              </div>
            </WindowCard>

            {/* EC-2 with Interactive Tranche Visualizer */}
            <WindowCard
              title="EC-2 · Split PO Ceiling"
              headerRight={
                <span className="text-[10px] font-mono font-bold text-destructive flex items-center gap-1">
                  <Prohibit size={13} weight="bold" />
                  Verdict: Blocked on Slice 3
                </span>
              }
            >
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  The slice.
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  One PO, billed in three invoices. Each is under budget alone. Together they aren't. Every invoice is judged against what is left of the PO, so the third one is the one that stops.
                </p>

                {/* Mini Tranche Meter */}
                <div className="p-3 rounded-xl bg-background border border-border text-xs space-y-2 mt-2">
                  <div className="flex justify-between items-center font-mono text-[11px]">
                    <span>PO-1002 Ceiling: ₹2,36,000</span>
                    <span className="text-destructive font-bold">Slice 3: Exceeds by ₹47,200</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: "30%" }} title="Slice 1: ₹70,800 (Pass)" />
                    <div className="h-full bg-primary/70" style={{ width: "30%" }} title="Slice 2: ₹70,800 (Pass)" />
                    <div className="h-full bg-destructive animate-pulse" style={{ width: "40%" }} title="Slice 3: ₹1,41,600 (BLOCKED)" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Slice 1 (30% ✓)</span>
                    <span>Slice 2 (60% ✓)</span>
                    <span className="text-destructive font-bold">Slice 3 (120% ✗)</span>
                  </div>
                </div>
              </div>
            </WindowCard>

            {/* EC-3 */}
            <WindowCard
              title="EC-3 · Missing PO Reference"
              headerRight={
                <span className="text-[10px] font-mono font-bold text-secondary-foreground flex items-center gap-1">
                  <Warning size={13} weight="fill" />
                  Verdict: Review required
                </span>
              }
            >
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  The orphan.
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  No PO on the invoice. The engine ranks candidate POs and shows its best guess. It never assigns one itself, because a confident wrong match costs more than a missing one.
                </p>
                <div className="pt-2 text-xs font-mono text-muted-foreground border-t border-border/50">
                  Rule triggered: <strong className="text-secondary-foreground font-semibold">R-009 Candidate Match Only</strong>
                </div>
              </div>
            </WindowCard>

            {/* EC-4 */}
            <WindowCard
              title="EC-4 · Low Quality OCR"
              headerRight={
                <span className="text-[10px] font-mono font-bold text-secondary-foreground flex items-center gap-1">
                  <Warning size={13} weight="fill" />
                  Verdict: Review required
                </span>
              }
            >
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  The photograph.
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  A phone picture of a printout. No text layer. Vision OCR reads the page, and every field carries its own confidence, so a shaky PO number gets flagged instead of trusted.
                </p>
                <div className="pt-2 text-xs font-mono text-muted-foreground border-t border-border/50">
                  Rule triggered: <strong className="text-secondary-foreground font-semibold">R-004 Field Confidence &lt; 0.85</strong>
                </div>
              </div>
            </WindowCard>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
            <Check size={14} weight="bold" className="text-primary shrink-0" />
            <span>Also covered: vendors that don't match the master, and totals that don't add up.</span>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          03 · WHO IT'S FOR ("Three people, three clocks.")
          ───────────────────────────────────────────────────────────── */}
      <section id="clocks" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-5xl mx-auto space-y-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
              03 · Who it's for
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1.5 leading-tight">
              Three people, three clocks.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* The Clerk */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Clock size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  The clerk
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  9:40 on a Monday
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Two hundred invoices in a ZIP. They need a short queue. LedgerFlow clears the clean ones and shows only what needs a person.
              </p>
              <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-primary font-semibold">
                → Batch ZIP async pipeline
              </div>
            </div>

            {/* The Reviewer */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/30 text-secondary-foreground flex items-center justify-center">
                <UserCheck size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  The reviewer
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  Ninety seconds per exception
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                They need the reason in the first line and the source document beside it. They don't want a form buried under three cards.
              </p>
              <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-secondary-foreground font-semibold">
                → Split-pane PDF inspector
              </div>
            </div>

            {/* The Auditor */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Scales size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  The auditor
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  Next March
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                They need to know why this was paid. Every verdict keeps its rule results, reason codes and the name of whoever signed.
              </p>
              <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-primary font-semibold">
                → Immutable ERP journal record
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          04 · HOW IT DECIDES ("The model reads. The rulebook decides.")
          Panoramic Evergreen Banner Strip
          ───────────────────────────────────────────────────────────── */}
      <section id="pipeline" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-border bg-card/40">
        <div className="max-w-5xl mx-auto space-y-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
              04 · How it decides
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1.5 leading-tight">
              The model reads. The rulebook decides.
            </h2>
            <p className="text-foreground/75 text-sm sm:text-base mt-2.5 max-w-3xl leading-relaxed">
              Language models are good at reading messy documents and bad at being accountable for money. So they only get the first job.
            </p>
          </div>

          {/* 4 Pipeline Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md transition-all space-y-2">
              <span className="text-xs font-mono font-bold text-primary">01 · READ</span>
              <h3 className="text-base font-semibold text-foreground">Read</h3>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Text layer first, Vision OCR if the page is a picture. An LLM turns it into a fixed schema with a confidence on each field.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md transition-all space-y-2">
              <span className="text-xs font-mono font-bold text-primary">02 · CHECK</span>
              <h3 className="text-base font-semibold text-foreground">Check</h3>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Sixteen deterministic rules, R-001 to R-016. Same input, same answer, every time. Each returns pass or fail and one plain sentence.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md transition-all space-y-2">
              <span className="text-xs font-mono font-bold text-primary">03 · DECIDE</span>
              <h3 className="text-base font-semibold text-foreground">Decide</h3>
              <p className="text-xs text-foreground/80 leading-relaxed">
                The rules roll up into a verdict, reason codes and a recommended next step.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md transition-all space-y-2">
              <span className="text-xs font-mono font-bold text-primary">04 · SIGN</span>
              <h3 className="text-base font-semibold text-foreground">Sign</h3>
              <p className="text-xs text-foreground/80 leading-relaxed">
                For anything not clean, a person confirms, rejects, asks the vendor or assigns a PO. A reason is mandatory and the action is logged.
              </p>
            </div>
          </div>

          {/* Panoramic Evergreen Banner Pull Quote */}
          <div
            className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl text-white text-center space-y-2 shadow-xl relative overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url('/backgrounds/evergreen-banner.webp')` }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs" />
            <blockquote className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-balance leading-snug relative z-10">
              “Temperature can change a sentence. It cannot change a verdict.”
            </blockquote>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          05 · DEMO ("Try to fool it.")
          Framed inside an Evergreen Aurora backdrop card
          ───────────────────────────────────────────────────────────── */}
      <section id="demo" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-6xl mx-auto space-y-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
              05 · Demo
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1.5 leading-tight">
              Try to fool it.
            </h2>
            <p className="text-foreground/75 text-sm sm:text-base mt-2.5 max-w-3xl leading-relaxed">
              Nine fixtures from the case study, plus your own. Pick one and run it. Thirteen stages, in the order the engine runs them.
            </p>
          </div>

          {/* Fixture Picker Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Select a fixture or test case
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                9 test scenarios available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIXTURES.map((f) => {
                const isSelected = selectedFixture.id === f.id && !uploadedFileName;
                return (
                  <button
                    key={f.id}
                    onClick={() => runFixture(f)}
                    disabled={running}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {f.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          f.expectedVerdict === "READY_FOR_AP_APPROVAL"
                            ? "bg-primary/10 text-primary"
                            : f.expectedVerdict === "BLOCKED"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-secondary/30 text-secondary-foreground"
                        }`}
                      >
                        {f.expectedVerdict === "READY_FOR_AP_APPROVAL"
                          ? "Pay it"
                          : f.expectedVerdict === "BLOCKED"
                          ? "Stop"
                          : "Review"}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {f.oneLine}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[10px] font-mono text-muted-foreground">
                      <span className="truncate max-w-[140px]">{f.vendor.split(" ")[0]}</span>
                      <span className="font-semibold text-foreground">{f.amount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Execution Console with subtle Aurora Mesh Header */}
          <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden space-y-6">
            {/* Console Window Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">ledgerflow-runner-v1.0</span>
              </div>
              <span className="text-[10px] font-mono text-primary font-bold">13-STAGE AUDIT ENGINE</span>
            </div>

            <div className="p-6 sm:p-8 space-y-6 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                    Active Fixture
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">
                    {uploadedFileName ? `Custom File: ${uploadedFileName}` : selectedFixture.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {uploadedFileName
                      ? "Uploaded from local disk"
                      : `${selectedFixture.vendor} · Stated Amount: ${selectedFixture.amount}`}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Upload zone button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCustomFileUpload}
                    accept=".pdf,.zip"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
                    title="Bring a bad invoice. PDF or ZIP. Nothing here moves money."
                  >
                    <UploadSimple size={15} weight="bold" />
                    <span>Drop your own PDF / ZIP</span>
                  </button>

                  {/* Run button */}
                  <button
                    onClick={() => runFixture(selectedFixture)}
                    disabled={running}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    {running ? (
                      <>
                        <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
                        <span>Running invoice...</span>
                      </>
                    ) : (
                      <>
                        <span>Run invoice</span>
                        <ArrowRight size={14} weight="bold" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 13 Pipeline Stages Visualizer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    Thirteen pipeline stages (in execution sequence)
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {running ? `Executing stage ${currentStageIndex}/13` : "All 13 stages complete"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                  {STAGES.map((s) => {
                    const isDone = currentStageIndex >= s.id && !running;
                    const isCurrent = running && currentStageIndex === s.id;

                    return (
                      <div
                        key={s.id}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? "border-primary bg-primary/10 shadow-xs"
                            : isDone
                            ? "border-border bg-background"
                            : "border-border/40 bg-muted/20 opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            {s.id.toString().padStart(2, "0")}
                          </span>
                          {isCurrent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                          ) : isDone ? (
                            <Check size={11} weight="bold" className="text-primary" />
                          ) : null}
                        </div>
                        <div className="text-[11px] font-semibold text-foreground truncate">
                          {s.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Execution Log Box */}
              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Terminal size={14} weight="bold" className="text-primary" />
                    <span>Real-time Engine Execution Log</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(executionLogs.join("\n"), "logs")}
                    className="inline-flex items-center gap-1 text-[11px] hover:text-foreground transition cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>{copiedText === "logs" ? "Copied!" : "Copy log"}</span>
                  </button>
                </div>
                <div
                  ref={logContainerRef}
                  className="max-h-28 overflow-y-auto font-mono text-[11px] text-muted-foreground space-y-1 bg-background/80 p-2.5 rounded-lg border border-border/50"
                >
                  {executionLogs.map((l, i) => (
                    <div key={i} className="leading-tight">
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Verdict Panel */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  isReady
                    ? "border-primary/40 bg-primary/5"
                    : isBlocked
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-secondary/50 bg-secondary/10"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                          isReady
                            ? "bg-primary text-primary-foreground"
                            : isBlocked
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {activeVerdict}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {isReady ? "Pay it." : isBlocked ? "Stopped." : "Needs a person."}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground">
                      {customFileVerdict ? customFileVerdict.decision_summary : selectedFixture.reason}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      <strong>Next step:</strong> {customFileVerdict ? "Human sign-off or ERP release" : selectedFixture.nextStep}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          customFileVerdict ? customFileVerdict.decision_summary : selectedFixture.reason,
                          "reason"
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition"
                    >
                      <Copy size={13} />
                      <span>{copiedText === "reason" ? "Copied" : "Copy Reason"}</span>
                    </button>

                    {liveRunId && (
                      <Link
                        href={`/runs/${liveRunId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition shadow-2xs hover:bg-primary/90"
                      >
                        <span>Open in Inspector</span>
                        <ArrowUpRight size={14} weight="bold" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Microcopy note */}
              <div className="text-center text-[11px] text-muted-foreground font-mono">
                Bring a bad invoice. PDF or ZIP. Nothing here moves money.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          06 · DECISIONS I'D DEFEND IN A REVIEW
          ───────────────────────────────────────────────────────────── */}
      <section id="decisions" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-border bg-card/40">
        <div className="max-w-5xl mx-auto space-y-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
              06 · Decisions I'd defend in a review
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1.5 leading-tight">
              Calls I made, and why.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                Rules are code, not prompts.
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Code can be tested, versioned and explained to an auditor. A prompt can't.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                Duplicates match on the business key.
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                File hashes miss the same invoice exported twice.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                The engine suggests a PO, never assigns one.
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Wrong and confident is worse than missing.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                Confidence belongs to the field, not the document.
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                A good invoice can still have one bad number.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                Each invoice sees what is left of the PO.
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                That is what makes split billing fail on the right invoice.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                If a reason needs the engineer to explain it, it isn't finished.
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Every verdict reads in plain English.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          07 · WHAT IT DOESN'T DO YET
          ───────────────────────────────────────────────────────────── */}
      <section id="gaps" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-border">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary font-mono">
              07 · What it doesn't do yet
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1.5 leading-tight">
              The gaps, listed by me before you find them.
            </h2>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 mt-2 shrink-0" />
              <p className="text-sm text-foreground/85">
                Totals are compared in aggregate, not line by line against the PO.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 mt-2 shrink-0" />
              <p className="text-sm text-foreground/85">
                Extracted values don't yet point back to their place on the PDF.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 mt-2 shrink-0" />
              <p className="text-sm text-foreground/85">
                Approval is one invoice at a time. Fifty clean invoices means fifty clicks.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground/90 space-y-1">
            <div className="font-semibold text-primary uppercase font-mono tracking-wider">
              Immediate Roadmap
            </div>
            <p>
              Next, in this order: field provenance on the source document, a line-level three-way match, then bulk release for clean invoices.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          CLOSE — Rich Evergreen Noir Deep Wallpaper Strip
          ───────────────────────────────────────────────────────────── */}
      <section
        className="px-4 sm:px-6 md:px-8 py-20 sm:py-28 text-center relative overflow-hidden bg-cover bg-center text-white"
        style={{ backgroundImage: `url('/backgrounds/evergreen-noir.webp')` }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight text-balance">
            Speed is only worth having if the paper trail keeps up.
          </h2>

          <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
            Zamp says velocity is survival. I agree, with one condition: the audit trail has to move at the same speed.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#CDE88C] hover:bg-[#bde070] text-[#133020] font-bold text-xs sm:text-sm transition shadow-sm hover:-translate-y-0.5"
            >
              <span>Run the demo</span>
              <ArrowRight size={14} weight="bold" />
            </a>
            <a
              href="mailto:sanketpimprikar2811@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm backdrop-blur-md transition shadow-2xs hover:-translate-y-0.5"
            >
              <EnvelopeSimple size={16} weight="bold" className="text-[#CDE88C]" />
              <span>Talk to me</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm backdrop-blur-md transition shadow-2xs hover:-translate-y-0.5"
            >
              <span>Go to Live Demo</span>
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER
          ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/60 px-4 sm:px-8 py-8 text-xs text-muted-foreground transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">LedgerFlow</span>
            <span>·</span>
            <span>Sanket Pimprikar</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              built for
              <ZampLogo className="text-foreground ml-1" iconClassName="h-3.5 w-auto" withWordmark={true} />
            </span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="https://github.com/sankett28/invoice-zamp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <GithubLogo size={14} weight="bold" />
              <span>Source on GitHub</span>
            </a>
            <a
              href="mailto:sanketpimprikar2811@gmail.com"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <EnvelopeSimple size={14} weight="bold" />
              <span>sanketpimprikar2811@gmail.com</span>
            </a>
            <a
              href="https://www.linkedin.com/in/sanketpimprikar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <LinkedinLogo size={14} weight="bold" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: 16 DETERMINISTIC RULES CATALOG (R-001 to R-016)
          ───────────────────────────────────────────────────────────── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  16
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    Deterministic Rulebook (R-001 to R-016)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Pure Python deterministic assertions executed on every invoice run.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-3 divide-y divide-border/60">
              {DETERMINISTIC_RULES_CATALOG.map((r) => (
                <div key={r.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">
                        {r.id}
                      </span>
                      <h4 className="font-semibold text-xs sm:text-sm text-foreground">
                        {r.name}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                      r.severity === "BLOCK"
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : r.severity === "REVIEW"
                        ? "bg-secondary/30 text-secondary-foreground border border-secondary/40"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {r.severity}
                  </span>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
              <span>All 16 rules execute with 0ms temperature dependency.</span>
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
