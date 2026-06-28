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
import { saveReceipt, getReceipt, Receipt } from "@/lib/db";
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
  receivedBy: "Ruaad Smart",
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

  const previewRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<Receipt>({
    defaultValues: DEFAULT_RECEIPT_VALUES
  });

  const formValues = watch();

  useEffect(() => {
    setIsMounted(true);
    if (id) {
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
      const documentId = id || `receipt-${Date.now()}`;
      const now = new Date().toISOString();
      const updatedDoc: Receipt = {
        ...data,
        amount: Number(data.amount) || 0,
        id: documentId,
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      await saveReceipt(updatedDoc);
      alert(language === "ar" ? "تم حفظ سند القبض بنجاح!" : "Receipt saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving receipt:", error);
      alert(language === "ar" ? "فشل حفظ السند." : "Failed to save receipt.");
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!previewRef.current) return null;
    setExporting(true);
    document.body.classList.add("pdf-generating");
    try {
      const options = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      };
      const canvas = await html2canvas(previewRef.current, options);
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

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.save(`Receipt_Voucher_${formValues.receiptNo}_${formValues.clientName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Editor Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 py-4 px-6 flex items-center justify-between no-print sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              {id ? (language === "ar" ? "تعديل سند القبض" : "Edit Receipt") : t("newReceipt")}
            </h1>
            <p className="text-xs text-zinc-500 font-mono">No: {formValues.receiptNo}</p>
          </div>
        </div>

        {/* Tab Selector & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setPreviewTab("edit")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                previewTab === "edit" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {language === "ar" ? "البيانات" : "Form"}
            </button>
            <button
              onClick={() => setPreviewTab("preview")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                previewTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {language === "ar" ? "المعاينة الطباعية A4" : "A4 Preview"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-all"
              title="Print / طباعة"
            >
              <Printer className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 disabled:opacity-50 transition-all"
              title="Download PDF / تنزيل PDF"
            >
              {exporting ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Download className="w-4.5 h-4.5" />
              )}
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg disabled:opacity-50 transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t("saveBtn")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        
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
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[12mm] flex flex-col justify-between relative text-xs select-none text-left"
            style={{ boxSizing: "border-box" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-[#0F4C81] pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-white">
                    <Image 
                      src="/logo.jpg" 
                      alt="Ruaad Smart Logo" 
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0F4C81] font-arabic m-0 leading-tight">رواد سمارت للأجهزة الذكية</h2>
                    <p className="text-[9px] text-zinc-500 m-0 tracking-wider">RUAAD SMART SMART MACHINE TRADING LLC</p>
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
              <div className="grid grid-cols-4 border border-zinc-200 mt-4 text-[10px]">
                <div className="bg-zinc-50 p-2.5 font-bold border-r border-b border-zinc-200 text-[#0F4C81] flex justify-between">
                  <span>Receipt No.</span>
                  <span className="font-arabic">رقم السند</span>
                </div>
                <div className="p-2.5 border-r border-b border-zinc-200 font-mono font-bold text-zinc-800">{formValues.receiptNo}</div>
                <div className="bg-zinc-50 p-2.5 font-bold border-r border-b border-zinc-200 text-[#0F4C81] flex justify-between">
                  <span>Date</span>
                  <span className="font-arabic">التاريخ</span>
                </div>
                <div className="p-2.5 border-b border-zinc-200 text-zinc-700 font-semibold">{formValues.date}</div>

                <div className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81] flex justify-between">
                  <span>Amount</span>
                  <span className="font-arabic">المبلغ</span>
                </div>
                <div className="p-2.5 border-r border-zinc-200 text-[#0F4C81] font-bold font-mono text-sm" style={{ backgroundColor: "rgba(239, 246, 255, 0.2)" }}>
                  {formValues.amount ? Number(formValues.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"} AED
                </div>
                <div className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#0F4C81] flex justify-between">
                  <span>Method</span>
                  <span className="font-arabic">طريقة الدفع</span>
                </div>
                <div className="p-2.5 text-zinc-700 capitalize font-bold">
                  {formValues.paymentMethod === "cash" && (language === "ar" ? "نقداً" : "Cash")}
                  {formValues.paymentMethod === "bank" && (language === "ar" ? "تحويل بنكي" : `Bank: ${formValues.bankName || ""}`)}
                  {formValues.paymentMethod === "cheque" && (language === "ar" ? `شيك: ${formValues.chequeNo || ""}` : `Cheque: ${formValues.chequeNo || ""}`)}
                </div>
              </div>

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
              <div className="grid grid-cols-2 gap-4 border border-zinc-200 rounded-lg p-3.5" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                <div className="text-center flex flex-col justify-between min-h-[90px]">
                  <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider">
                    Client Signature / Seal <br/>
                    <span className="font-arabic text-zinc-400">توقيع / ختم العميل</span>
                  </p>
                  <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4" />
                </div>
                
                <div className="text-center flex flex-col justify-between min-h-[90px] relative">
                  <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider relative z-10">
                    Authorized Receiver Signature <br/>
                    <span className="font-arabic text-zinc-400">توقيع / ختم المستلم المصرح له</span>
                  </p>
                  
                  {/* Official Stamp Overlay */}
                  <div className="absolute bottom-2 right-12 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none z-0">
                    <Image 
                      src="/stamp.png" 
                      alt="Ruaad Smart Stamp" 
                      fill 
                      className="object-contain"
                    />
                  </div>

                  {formValues.integratorSignature ? (
                    <div className="relative w-36 h-12 mx-auto mt-2 z-10">
                      <Image 
                        src={formValues.integratorSignature} 
                        alt="Receiver Signature" 
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4 z-10" />
                  )}
                  <p className="text-[9px] text-[#0F4C81] font-bold mt-1 relative z-10">{formValues.receivedBy || "Ruaad Smart"}</p>
                </div>
              </div>

              {/* Receipt Footer Contact */}
              <div className="mt-4 border-t border-zinc-200 pt-3 text-center text-zinc-500 text-[8px] flex justify-between leading-normal">
                <div>
                  <span className="font-bold">Address:</span> Abraj Al Mamzar, Block A F 106, Dubai, UAE
                </div>
                <div>
                  <span className="font-bold">Website:</span> support.ruaadalraqamia.com
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
