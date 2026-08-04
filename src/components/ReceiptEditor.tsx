"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Printer, 
  Share2, 
  Plus, 
  Loader2,
  FileText,
  RotateCcw
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveReceipt, getReceipt, Receipt, getSettings, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ReceiptEditorProps {
  id?: string;
}

const DEFAULT_RECEIPT_VALUES = {
  receiptNo: "R0015",
  date: new Date().toLocaleDateString("en-GB"),
  clientName: "",
  amount: 0,
  amountInWords: "",
  paymentMethod: "cash" as const,
  chequeNo: "",
  chequeDate: "",
  bankName: "",
  receivedFor: "Advance payment for smart home supply & installation",
  receivedBy: "Smart Nexus",
  integratorSignature: "",
};

export default function ReceiptEditor({ id }: ReceiptEditorProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [settings, setSettings] = useState<Settings | null>(null);

  const isPrintMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('print') === 'true';

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    if (isMounted && !loading) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const downloadParam = new URLSearchParams(search).get("download");
      if (downloadParam === "true") {
        setTimeout(() => {
          handleDownloadPDF();
        }, 1200);
      }
    }
  }, [isMounted, loading]);

  const previewRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<Receipt>({
    defaultValues: DEFAULT_RECEIPT_VALUES
  });

  const formValues = watch();

  useEffect(() => {
    setIsMounted(true);
    if (id && id !== "new") {
      async function loadReceipt() {
        try {
          const data = await getReceipt(id!);
          if (data) {
            reset(data);
            setTimeout(() => {
              if (data.integratorSignature && sigRef.current) {
                sigRef.current.fromDataURL(data.integratorSignature);
              }
            }, 200);
          } else {
            alert("Receipt not found");
            router.push("/");
          }
        } catch (error) {
          console.error("Error loading receipt:", error);
        } finally {
          setLoading(false);
        }
      }
      loadReceipt();
    } else {
      const randomNo = "R" + String(Math.floor(Math.random() * 90000) + 10000);
      setValue("receiptNo", randomNo);
      setLoading(false);
    }
  }, [id, reset, router, setValue]);

  const onSignatureEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setValue("integratorSignature", sigRef.current.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setValue("integratorSignature", "");
    }
  };

  const onSubmit = async (data: Receipt) => {
    setSaving(true);
    try {
      const documentId = (id && id !== "new") ? id : `receipt-${Date.now()}`;
      const now = new Date().toISOString();
      const updatedDoc: Receipt = {
        ...data,
        amount: Number(data.amount) || 0,
        id: documentId,
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      await saveReceipt(updatedDoc);
      router.refresh();
      alert(language === "ar" ? "تم حفظ سند القبض بنجاح!" : "Receipt saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving receipt:", error);
      alert(language === "ar" ? "فشل حفظ السند." : "Failed to save receipt.");
    } finally {
      setSaving(false);
    }
  };

  const makeColorConverter = (doc: Document) => {
    const tmpCanvas = doc.createElement("canvas");
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    const ctx = tmpCanvas.getContext("2d");
    return (color: string): string => {
      if (!ctx) return "#000000";
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        if (a === 0) return "rgba(0,0,0,0)";
        return `rgb(${r},${g},${b})`;
      } catch {
        return "#000000";
      }
    };
  };

  const patchDocumentColors = (doc: Document) => {
    const toRgb = makeColorConverter(doc);
    doc.querySelectorAll("style").forEach((styleEl) => {
      if (!styleEl.textContent) return;
      if (
        styleEl.textContent.includes("oklch") ||
        styleEl.textContent.includes("oklab") ||
        styleEl.textContent.includes("lab(")
      ) {
        styleEl.textContent = styleEl.textContent
          .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
          .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
          .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
      }
    });
    // Remove external link stylesheets so html2canvas never encounters un-parsed oklab/oklch rules
    doc.querySelectorAll("link[rel='stylesheet'], link[as='style']").forEach((l) => l.remove());
  };

  const bakeElementStyles = (origElement: HTMLElement, cloneElement: HTMLElement) => {
    const toRgb = makeColorConverter(document);
    const propsToCopy = [
      "display", "position", "top", "right", "bottom", "left", "float", "clear",
      "width", "height", "min-width", "min-height", "max-width", "max-height",
      "margin-top", "margin-right", "margin-bottom", "margin-left",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "box-sizing", "overflow", "overflow-x", "overflow-y", "z-index",
      "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
      "justify-content", "align-items", "align-content", "gap", "row-gap", "column-gap",
      "grid-template-columns", "grid-template-rows", "grid-column", "grid-row", "grid-auto-flow",
      "font-family", "font-size", "font-weight", "font-style", "line-height",
      "text-align", "text-decoration", "direction",
      "color", "background-color", "background-image", "background-position", "background-size", "background-repeat",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
      "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
      "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius",
      "box-shadow", "opacity", "object-fit"
    ];

    const origEls = [origElement, ...Array.from(origElement.querySelectorAll("*"))];
    const cloneEls = [cloneElement, ...Array.from(cloneElement.querySelectorAll("*"))];

    origEls.forEach((orig, i) => {
      const cloneEl = cloneEls[i];
      if (!(orig instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(orig);

      propsToCopy.forEach((prop) => {
        let val = computed.getPropertyValue(prop);
        if (!val) return;

        // Convert any oklch / oklab / lab colors to rgb
        if (val.includes("oklch") || val.includes("oklab") || val.includes("lab(")) {
          val = val
            .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
            .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
            .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
        }
        cloneEl.style.setProperty(prop, val, "important");
      });
    });
  };

  const captureElementAsCanvas = async (element: HTMLDivElement): Promise<HTMLCanvasElement> => {
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    const clone = element.cloneNode(true) as HTMLDivElement;
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "-9999px";
    clone.style.setProperty("width", "210mm", "important");
    clone.style.setProperty("min-width", "210mm", "important");
    clone.style.setProperty("height", "297mm", "important");
    clone.style.setProperty("min-height", "297mm", "important");
    clone.style.setProperty("zoom", "1", "important");
    clone.style.setProperty("transform", "none", "important");
    document.body.appendChild(clone);

    // Save original styles and force desktop print size temporarily
    const originalCssText = element.style.cssText;
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty("z-index", "99999", "important");
    element.style.setProperty("top", "0", "important");
    element.style.setProperty("left", "0", "important");
    element.style.setProperty("width", "210mm", "important");
    element.style.setProperty("min-width", "210mm", "important");
    element.style.setProperty("transform", "none", "important");
    element.style.setProperty("zoom", "1", "important");

    // Force layout reflow
    const _reflow = element.offsetHeight;

    bakeElementStyles(element, clone);

    // Restore original styles
    element.style.cssText = originalCssText;

    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const options = {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          patchDocumentColors(clonedDoc);
        },
      };
      return await html2canvas(clone, options);
    } finally {
      document.body.removeChild(clone);
    }
  };

  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!previewRef.current) return null;
    setExporting(true);
    document.body.classList.add("pdf-generating");
    try {
      const canvas = await captureElementAsCanvas(previewRef.current);
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      return pdf;
    } catch (error) {
      console.error("PDF generation failed:", error);
      return null;
    } finally {
      document.body.classList.remove("pdf-generating");
      setExporting(false);
    }
  };

  const saveCurrentDocument = async (): Promise<string> => {
    const documentId = (id && id !== "new") ? id : `receipt-${Date.now()}`;
    const now = new Date().toISOString();
    const updatedDoc: Receipt = {
      ...formValues,
      amount: Number(formValues.amount) || 0,
      id: documentId,
      createdAt: formValues.createdAt || now,
      updatedAt: now
    };
    await saveReceipt(updatedDoc);
    return documentId;
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const docId = await saveCurrentDocument();
      if (id === "new") {
        router.push(`/receipt/${docId}`);
      }
      
      const filename = `Receipt_Voucher_${formValues.receiptNo || "Document"}_${(formValues.clientName || "Client").replace(/[^a-zA-Z0-9]/g, "_")}`;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.print();
        return;
      }

      if (!previewRef.current) {
        alert("Preview element not found");
        return;
      }

      // Gather active styles on the page
      let cssStyles = "";
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          for (let j = 0; j < sheet.cssRules.length; j++) {
            cssStyles += sheet.cssRules[j].cssText + "\n";
          }
        } catch (e) {
          // Skip cross-origin stylesheet errors
        }
      }

      const fontLinks = `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      `;

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>Receipt Voucher</title>
            ${fontLinks}
            <style>
              ${cssStyles}
              :root {
                --font-cairo: 'Cairo', sans-serif !important;
                --font-inter: 'Inter', sans-serif !important;
              }
              body {
                background-color: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body, #receipt-preview-page, .font-arabic, [dir="rtl"], [dir="rtl"] * {
                font-family: 'Cairo', 'Inter', sans-serif !important;
                letter-spacing: 0 !important;
                word-spacing: normal !important;
              }
              #receipt-preview-page {
                zoom: 1 !important;
                width: 210mm !important;
                min-width: 210mm !important;
                transform: none !important;
                box-shadow: none !important;
                border: none !important;
              }
            </style>
          </head>
          <body>
            <div style="width: 210mm; margin: 0 auto;">
              ${previewRef.current.outerHTML}
            </div>
          </body>
        </html>
      `;

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: fullHtml, filename }),
      });

      if (!response.ok) throw new Error('API PDF generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("PDF download failed, falling back to window.print():", error);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-zinc-400 mt-2 text-sm">{language === "ar" ? "جاري تحميل سند الاستلام..." : "Loading receipt editor..."}</p>
      </div>
    );
  }

  if (isPrintMode) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-start p-0 m-0 w-full" style={{ direction: "ltr" }}>
        <div 
          ref={previewRef}
          id="receipt-preview-page"
          dir="ltr"
          className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 p-[12mm] flex flex-col justify-start gap-4 relative text-xs select-none text-left"
          style={{ boxSizing: "border-box" }}
        >
          <div>
            {/* Document Header */}
            <div className="flex items-start justify-between border-b-[2px] border-[#0F4C81] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-white">
                  <img 
                    src={settings?.logoBase64 || "/logo.jpg"} 
                    alt="Smart Nexus Logo" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F4C81] font-sans m-0 leading-tight">SMART NEXUS</h2>
                  <p className="text-[9px] text-zinc-500 m-0 tracking-wider">Smart Nexus FZE LLC</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="bg-[#0F4C81] text-white px-4 py-1.5 rounded font-bold text-sm tracking-wider inline-block">
                  RECEIPT VOUCHER
                </div>
                <p className="text-[10px] text-[#0F4C81] font-bold mt-1 m-0">سند قبض استلام مبالغ</p>
              </div>
            </div>

            {/* Receipt Metadata */}
            <table className="w-full border border-zinc-200 mt-4 text-[10px] border-collapse" style={{ tableLayout: "fixed" }}>
              <tbody>
                <tr className="border-b border-zinc-200">
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Receipt No.</span>
                      <span className="font-arabic">رقم السند</span>
                    </div>
                  </td>
                  <td className="p-2.5 border-r border-zinc-200 font-mono font-bold text-zinc-800" style={{ width: "25%" }}>{formValues.receiptNo}</td>
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Date</span>
                      <span className="font-arabic">التاريخ</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-zinc-700 font-semibold" style={{ width: "25%" }}>{formValues.date}</td>
                </tr>
                <tr>
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span className="font-arabic">المبلغ</span>
                    </div>
                  </td>
                  <td className="p-2.5 border-r border-zinc-200 text-[#0F4C81] font-bold font-mono text-sm" style={{ backgroundColor: "rgba(239, 246, 255, 0.2)", width: "25%" }}>
                    {formValues.amount ? Number(formValues.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"} AED
                  </td>
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Method</span>
                      <span className="font-arabic">طريقة الدفع</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-zinc-700 capitalize font-bold" style={{ width: "25%" }}>
                    {formValues.paymentMethod === "cash" && (language === "ar" ? "نقداً" : "Cash")}
                    {formValues.paymentMethod === "bank" && (language === "ar" ? "تحويل بنكي" : `Bank: ${formValues.bankName || ""}`)}
                    {formValues.paymentMethod === "cheque" && (language === "ar" ? `شيك: ${formValues.chequeNo || ""}` : `Cheque: ${formValues.chequeNo || ""}`)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Core Receipt content (Legal text style) */}
            <div className="mt-4 border border-zinc-200 rounded-lg p-4 space-y-4 text-zinc-800 leading-relaxed text-justify text-[10px]">
              <div>
                <span className="font-bold text-[#0F4C81] inline-block w-36">
                  Received From:
                </span>
                <span className="text-zinc-900 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                  {formValues.clientName || "______________________________________"}
                </span>
                <span className="font-arabic font-bold text-zinc-500 float-right">استلمنا من</span>
              </div>

              <div>
                <span className="font-bold text-[#0F4C81] inline-block w-36">
                  The Sum of:
                </span>
                <span className="text-zinc-800 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                  {formValues.amountInWords || "______________________________________"}
                </span>
                <span className="font-arabic font-bold text-zinc-500 float-right">مبلغ وقدره</span>
              </div>

              {formValues.paymentMethod !== "cash" && (
                <div>
                  <span className="font-bold text-[#0F4C81] inline-block w-36">
                    {formValues.paymentMethod === "cheque" ? "Cheque No. & Bank:" : "Bank / Reference:"}
                  </span>
                  <span className="text-zinc-700 font-semibold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                    {formValues.paymentMethod === "cheque" ? (
                      `${formValues.chequeNo || ""} - ${formValues.bankName || ""} (${formValues.chequeDate || ""})`
                    ) : (
                      formValues.bankName || "________________________"
                    )}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">
                    {formValues.paymentMethod === "cheque" ? "شيك رقم / بنك" : "تحويل بنكي / بنك"}
                  </span>
                </div>
              )}

              <div>
                <span className="font-bold text-[#0F4C81] inline-block w-36">
                  Being Payment for:
                </span>
                <span className="text-zinc-700 font-medium border-b border-zinc-300 pb-0.5 inline-block min-w-[280px] whitespace-normal">
                  {formValues.receivedFor || "______________________________________"}
                </span>
                <span className="font-arabic font-bold text-zinc-500 float-right">وذلك عن قيمة</span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Signatures & Address info */}
          <div>
            {/* Signatures block */}
            <div className="flex w-full justify-between gap-4 border border-zinc-200 rounded-lg p-3.5" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
              <div className="w-[48%] text-center flex flex-col justify-between min-h-[90px]">
                <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider">
                  Client Signature / Seal <br/>
                  <span className="font-arabic text-zinc-400">توقيع / ختم العميل</span>
                </p>
                <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4" />
              </div>
              
              <div className="w-[48%] text-center flex flex-col justify-between min-h-[90px] relative">
                <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider relative z-10">
                  Authorized Receiver Signature <br/>
                  <span className="font-arabic text-zinc-400">توقيع / ختم المستلم المصرح له</span>
                </p>
                
                {/* Official Stamp Overlay */}
                <div className="absolute bottom-2 right-12 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none z-0 flex items-center justify-center">
                  <img 
                    src={settings?.stampBase64 || "/stamp.png"} 
                    alt="Smart Nexus Stamp" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {formValues.integratorSignature ? (
                  <div className="w-36 h-12 mx-auto mt-2 z-10 flex items-center justify-center">
                    <img 
                      src={formValues.integratorSignature} 
                      alt="Receiver Signature" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4 z-10" />
                )}
                <p className="text-[9px] text-[#0F4C81] font-bold mt-1 relative z-10">{formValues.receivedBy || "Smart Nexus"}</p>
              </div>
            </div>

            {/* Receipt Footer Contact */}
            <div className="mt-4 border-t border-zinc-200 pt-3 text-center text-zinc-500 text-[8px] flex justify-between leading-normal">
              <div>
                <span className="font-bold">Address:</span> Abraj Al Mamzar, Block A F 106, Dubai, UAE
              </div>
              <div>
                <span className="font-bold">Website:</span> smartnexus.ae
              </div>
              <div>
                <span className="font-bold">Phone:</span> 00971551616298
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col main-layout-container">
      {/* Editor Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 py-3 px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print sticky top-0 z-40">
        {/* Left side: Back & Title */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                {id ? (language === "ar" ? "تعديل سند القبض" : "Edit Receipt") : t("newReceipt")}
              </h1>
              <p className="text-xs text-zinc-500 font-mono">No: {formValues.receiptNo}</p>
            </div>
          </div>
          
          {/* Action buttons on very small mobile screens (hidden on md) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button 
              type="button" 
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium transition-all"
              title={t("saveBtn")}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-900 text-zinc-200 font-medium transition-all"
              title="Download PDF"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center/Right: Tabs & Desktop Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* View Toggle Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-full md:w-auto justify-around md:justify-start">
            <button
              type="button"
              onClick={() => setPreviewTab("edit")}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                previewTab === "edit" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {language === "ar" ? "البيانات" : "Form"}
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("preview")}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                previewTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {language === "ar" ? "المعاينة الطباعية A4" : "A4 Preview"}
            </button>
          </div>

          {/* Desktop/Tablet Action Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium text-xs transition-all hover:scale-[1.02]"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {t("saveBtn")}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-900 text-zinc-200 font-medium text-xs transition-all"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t("downloadPdf")}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              {t("print")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative workspace-split-pane">
        
        {/* Left Side: Form Editor Panel */}
        <div className={`flex-1 p-6 overflow-y-auto no-print ${previewTab === "preview" ? "hidden md:block" : "block"}`}>
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
            
            {/* Section: Receipt Identity */}
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-2">
                {t("receiptDetails")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("receiptNo")}</label>
                  <input 
                    type="text" 
                    {...register("receiptNo")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("date")}</label>
                  <input 
                    type="text" 
                    {...register("date")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: Client & Payment Details */}
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 border-b border-zinc-800 pb-2">
                {language === "ar" ? "تفاصيل الدفع والاستلام" : "Payment Information"}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("clientName")}</label>
                  <input 
                    type="text" 
                    required
                    {...register("clientName")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. Mohamed Ibrahim"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("amount")}</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      {...register("amount")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("amountInWords")}</label>
                    <input 
                      type="text" 
                      required
                      {...register("amountInWords")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                      placeholder={language === "ar" ? "مثال: فقط خمسة آلاف درهم لا غير" : "e.g. Only Five Thousand AED"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("paymentMethod")}</label>
                    <select
                      {...register("paymentMethod")}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-zinc-700 outline-none"
                    >
                      <option value="cash">{t("cash")}</option>
                      <option value="bank">{t("bankTransfer")}</option>
                      <option value="cheque">{t("cheque")}</option>
                    </select>
                  </div>
                  
                  {formValues.paymentMethod !== "cash" && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{language === "ar" ? "اسم البنك" : "Bank Name"}</label>
                      <input 
                        type="text" 
                        {...register("bankName")} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                        placeholder="e.g. ADCB"
                      />
                    </div>
                  )}
                </div>

                {formValues.paymentMethod === "cheque" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("chequeNo")}</label>
                      <input 
                        type="text" 
                        {...register("chequeNo")} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("chequeDate")}</label>
                      <input 
                        type="text" 
                        {...register("chequeDate")} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("receivedFor")}</label>
                  <textarea 
                    rows={2}
                    {...register("receivedFor")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: Received By & Signature */}
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 border-b border-zinc-800 pb-2">
                {language === "ar" ? "بيانات وتوقيع المستلم" : "Receiver Signature & Name"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("receivedBy")}</label>
                  <input 
                    type="text" 
                    {...register("receivedBy")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-zinc-400">{t("integratorSignatureSeal")}</label>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t("clearSig")}</span>
                    </button>
                  </div>
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-white">
                    <SignatureCanvas
                      ref={sigRef}
                      canvasProps={{ className: "sigCanvas" }}
                      onEnd={onSignatureEnd}
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Right Side: A4 Live Preview Sheet */}
        <div className={`flex-1 bg-zinc-900 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-zinc-800/80 print-area ${previewTab === "edit" ? "hidden md:flex" : "flex"}`}>
          
          <div 
            ref={previewRef}
            id="receipt-preview-page"
            dir="ltr"
            className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 shadow-2xl p-[12mm] flex flex-col justify-start gap-4 relative text-xs select-none text-left print-area"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-[#0F4C81] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-white">
                    <img 
                      src={settings?.logoBase64 || "/logo.jpg"} 
                      alt="Smart Nexus Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0F4C81] font-sans m-0 leading-tight">SMART NEXUS</h2>
                    <p className="text-[9px] text-zinc-500 m-0 tracking-wider">Smart Nexus FZE LLC</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-[#0F4C81] text-white px-4 py-1.5 rounded font-bold text-sm tracking-wider inline-block">
                    RECEIPT VOUCHER
                  </div>
                  <p className="text-[10px] text-[#0F4C81] font-bold mt-1 m-0">سند قبض استلام مبالغ</p>
                </div>
              </div>

              {/* Receipt Metadata */}
              <table className="w-full border border-zinc-200 mt-4 text-[10px] border-collapse" style={{ tableLayout: "fixed" }}>
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Receipt No.</span>
                        <span className="font-arabic">رقم السند</span>
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 font-mono font-bold text-zinc-800" style={{ width: "25%" }}>{formValues.receiptNo}</td>
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Date</span>
                        <span className="font-arabic">التاريخ</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-zinc-700 font-semibold" style={{ width: "25%" }}>{formValues.date}</td>
                  </tr>
                  <tr>
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Amount</span>
                        <span className="font-arabic">المبلغ</span>
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 text-[#0F4C81] font-bold font-mono text-sm" style={{ backgroundColor: "rgba(239, 246, 255, 0.2)", width: "25%" }}>
                      {formValues.amount ? Number(formValues.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"} AED
                    </td>
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Method</span>
                        <span className="font-arabic">طريقة الدفع</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-zinc-700 capitalize font-bold" style={{ width: "25%" }}>
                      {formValues.paymentMethod === "cash" && (language === "ar" ? "نقداً" : "Cash")}
                      {formValues.paymentMethod === "bank" && (language === "ar" ? "تحويل بنكي" : `Bank: ${formValues.bankName || ""}`)}
                      {formValues.paymentMethod === "cheque" && (language === "ar" ? `شيك: ${formValues.chequeNo || ""}` : `Cheque: ${formValues.chequeNo || ""}`)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Core Receipt content (Legal text style) */}
              <div className="mt-4 border border-zinc-200 rounded-lg p-4 space-y-4 text-zinc-800 leading-relaxed text-justify text-[10px]">
                <div>
                  <span className="font-bold text-[#0F4C81] inline-block w-36">
                    Received From:
                  </span>
                  <span className="text-zinc-900 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                    {formValues.clientName || "______________________________________"}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">استلمنا من</span>
                </div>

                <div>
                  <span className="font-bold text-[#0F4C81] inline-block w-36">
                    The Sum of:
                  </span>
                  <span className="text-zinc-800 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                    {formValues.amountInWords || "______________________________________"}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">مبلغ وقدره</span>
                </div>

                {formValues.paymentMethod !== "cash" && (
                  <div>
                    <span className="font-bold text-[#0F4C81] inline-block w-36">
                      {formValues.paymentMethod === "cheque" ? "Cheque No. & Bank:" : "Bank / Reference:"}
                    </span>
                    <span className="text-zinc-700 font-semibold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                      {formValues.paymentMethod === "cheque" ? (
                        `${formValues.chequeNo || ""} - ${formValues.bankName || ""} (${formValues.chequeDate || ""})`
                      ) : (
                        formValues.bankName || "________________________"
                      )}
                    </span>
                    <span className="font-arabic font-bold text-zinc-500 float-right">
                      {formValues.paymentMethod === "cheque" ? "شيك رقم / بنك" : "تحويل بنكي / بنك"}
                    </span>
                  </div>
                )}

                <div>
                  <span className="font-bold text-[#0F4C81] inline-block w-36">
                    Being Payment for:
                  </span>
                  <span className="text-zinc-700 font-medium border-b border-zinc-300 pb-0.5 inline-block min-w-[280px] whitespace-normal">
                    {formValues.receivedFor || "______________________________________"}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">وذلك عن قيمة</span>
                </div>
              </div>
            </div>

            {/* Bottom Section: Signatures & Address info */}
            <div>
              {/* Signatures block */}
              <div className="flex w-full justify-between gap-4 border border-zinc-200 rounded-lg p-3.5" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                <div className="w-[48%] text-center flex flex-col justify-between min-h-[90px]">
                  <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider">
                    Client Signature / Seal <br/>
                    <span className="font-arabic text-zinc-400">توقيع / ختم العميل</span>
                  </p>
                  <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4" />
                </div>
                
                <div className="w-[48%] text-center flex flex-col justify-between min-h-[90px] relative">
                  <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider relative z-10">
                    Authorized Receiver Signature <br/>
                    <span className="font-arabic text-zinc-400">توقيع / ختم المستلم المصرح له</span>
                  </p>
                  
                  {/* Official Stamp Overlay */}
                  <div className="absolute bottom-2 right-12 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none z-0 flex items-center justify-center">
                    <img 
                      src={settings?.stampBase64 || "/stamp.png"} 
                      alt="Smart Nexus Stamp" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {formValues.integratorSignature ? (
                    <div className="w-36 h-12 mx-auto mt-2 z-10 flex items-center justify-center">
                      <img 
                        src={formValues.integratorSignature} 
                        alt="Receiver Signature" 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4 z-10" />
                  )}
                  <p className="text-[9px] text-[#0F4C81] font-bold mt-1 relative z-10">{formValues.receivedBy || "Smart Nexus"}</p>
                </div>
              </div>

              {/* Receipt Footer Contact */}
              <div className="mt-4 border-t border-zinc-200 pt-3 text-center text-zinc-500 text-[8px] flex justify-between leading-normal">
                <div>
                  <span className="font-bold">Address:</span> Abraj Al Mamzar, Block A F 106, Dubai, UAE
                </div>
                <div>
                  <span className="font-bold">Website:</span> smartnexus.ae
                </div>
                <div>
                  <span className="font-bold">Phone:</span> 00971551616298
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
