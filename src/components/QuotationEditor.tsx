"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Printer, 
  Share2, 
  Plus, 
  Trash2, 
  Loader2,
  FileText,
  DollarSign,
  Undo,
  Paperclip,
  Eye,
  Percent,
  TrendingUp,
  X
} from "lucide-react";
import { saveQuotation, getQuotation, Quotation, QuotationItem, PurchaseInvoice } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface QuotationEditorProps {
  id?: string;
}

const DEFAULT_QUOTATION_VALUES = {
  quotationNo: "S0015",
  date: new Date().toLocaleDateString("en-GB"),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB"),
  preparedBy: "mostafa",
  clientName: "",
  contactNo: "",
  email: "",
  locationArea: "",
  projectReference: "",
  items: [
    {
      id: "item-1",
      description: "[SMT-0015] Aqara SW-3G Smart Wall Switch 3-Gang\nWi-Fi smart switch compatible with Alexa, Google Home, and local automation hubs.",
      qty: 1,
      unit: "Units",
      unitPrice: 180,
      cost: 100,
      total: 180
    }
  ],
  subtotal: 180,
  total: 180,
  paymentTerms: "Immediate Payment",
  termsConditions: "https://support.ruaadalraqamia.com/terms",
  preparedByName: "mostafa",
  preparedByDate: new Date().toLocaleDateString("en-GB"),
  clientAcceptanceName: "",
  clientAcceptanceDate: "",
  companyName: "RUAAD SMART SMART MACHINE TRADING LLC",
  bankName: "Saudi National Bank",
  bankIban: "SA7210000001400033305105",
  companyAddress: "Abraj Al Mamzar , Block A F 106 , Al Mamzar , United Arab Emirates",
  companyEmail: "info@support.ruaadalraqamia.com",
  purchaseInvoices: []
};

export default function QuotationEditor({ id }: QuotationEditorProps) {
  const router = useRouter();
  const { t, language, isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
  
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<Quotation>({
    defaultValues: DEFAULT_QUOTATION_VALUES
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items") || [];
  const watchedInvoices = watch("purchaseInvoices") || [];
  
  useEffect(() => {
    if (id) {
      const docId = id;
      async function loadQuotation() {
        try {
          const data = await getQuotation(docId);
          if (data) {
            reset(data);
          } else {
            alert("Quotation not found");
            router.push("/");
          }
        } catch (error) {
          console.error("Error loading quotation:", error);
        } finally {
          setLoading(false);
        }
      }
      loadQuotation();
    } else {
      const randomNo = "S" + String(Math.floor(Math.random() * 90000) + 10000);
      setValue("quotationNo", randomNo);
      setLoading(false);
    }
  }, [id, reset, setValue, router]);

  // Calculate totals on the fly
  const subtotal = watchedItems.reduce((acc, item) => acc + (item.qty || 0) * (item.unitPrice || 0), 0);
  const total = subtotal;

  // Calculate internal cost and margins
  const totalCost = watchedItems.reduce((acc, item) => acc + ((item.cost || 0) * (item.qty || 0)), 0);
  const totalRevenue = subtotal;
  const profitMargin = totalRevenue - totalCost;
  const marginPercentage = totalRevenue > 0 ? (profitMargin / totalRevenue) * 100 : 0;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    const newInvoices: PurchaseInvoice[] = [];
    for (const file of filesArray) {
      try {
        const base64Data = await fileToBase64(file);
        newInvoices.push({
          id: `inv-${Date.now()}-${Math.random()}`,
          name: file.name,
          fileData: base64Data,
          fileType: file.type,
          uploadedAt: new Date().toLocaleDateString("en-GB")
        });
      } catch (err) {
        console.error("Error converting file to base64:", err);
      }
    }
    
    setValue("purchaseInvoices", [...watchedInvoices, ...newInvoices]);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setValue("purchaseInvoices", watchedInvoices.filter((inv) => inv.id !== invoiceId));
  };

  const onSubmit = async (data: Quotation) => {
    setSaving(true);
    try {
      const documentId = id || `quote-${Date.now()}`;
      const now = new Date().toISOString();
      
      const processedItems = data.items.map(item => ({
        ...item,
        total: (item.qty || 0) * (item.unitPrice || 0)
      }));
      const calculatedSubtotal = processedItems.reduce((acc, item) => acc + item.total, 0);

      const updatedDoc: Quotation = {
        ...data,
        items: processedItems,
        id: documentId,
        subtotal: calculatedSubtotal,
        total: calculatedSubtotal,
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      await saveQuotation(updatedDoc);
      alert(language === "ar" ? "تم حفظ عرض السعر بنجاح!" : "Quotation saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert(language === "ar" ? "فشل حفظ عرض السعر." : "Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  };

  // Generate PDF from DOM
  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!page1Ref.current || !page2Ref.current) return null;
    
    setExporting(true);
    try {
      const options = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      };

      const canvas1 = await html2canvas(page1Ref.current, options);
      const imgData1 = canvas1.toDataURL("image/jpeg", 0.98);

      const canvas2 = await html2canvas(page2Ref.current, options);
      const imgData2 = canvas2.toDataURL("image/jpeg", 0.98);

      const pdf = new jsPDF("p", "mm", "a4");
      
      // Page 1
      pdf.addImage(imgData1, "JPEG", 0, 0, 210, 297);
      
      // Page 2
      pdf.addPage();
      pdf.addImage(imgData2, "JPEG", 0, 0, 210, 297);
      
      return pdf;
    } catch (error) {
      console.error("PDF generation failed:", error);
      return null;
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      const qNo = watch("quotationNo") || "Quotation";
      pdf.save(`Ruaad_Smart_Quotation_${qNo}.pdf`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const pdf = await generatePDF();
    if (!pdf) {
      alert("Could not generate PDF for sharing.");
      return;
    }
    
    try {
      const qNo = watch("quotationNo") || "Quotation";
      const blob = pdf.output("blob");
      const file = new File([blob], `Ruaad_Smart_Quotation_${qNo}.pdf`, { type: "application/pdf" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ruaad Smart Quotation ${qNo}`,
          text: `Please find attached our quotation ${qNo} from Ruaad Smart.`
        });
      } else {
        handleDownloadPDF();
      }
    } catch (error) {
      console.error("Sharing failed:", error);
      handleDownloadPDF();
    }
  };

  const formValues = watch();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-zinc-400 mt-2 text-sm">Loading quotation editor...</p>
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
              {id ? t("editTitle") : t("newQuotation")}
            </h1>
            <p className="text-xs text-zinc-500 font-mono">No: {formValues.quotationNo}</p>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex sm:hidden bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button 
            type="button"
            onClick={() => setPreviewTab("edit")}
            className={`px-3 py-1 text-xs font-semibold rounded ${previewTab === "edit" ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
          >
            {t("formTab")}
          </button>
          <button 
            type="button"
            onClick={() => setPreviewTab("preview")}
            className={`px-3 py-1 text-xs font-semibold rounded ${previewTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
          >
            {t("previewTab")}
          </button>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button 
            type="submit" 
            form="quotation-form"
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium text-xs transition-all hover:scale-[1.02]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t("saveBtn")}
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-900 text-zinc-200 font-medium text-xs transition-all"
            title="Download PDF"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {t("downloadPdf")}
          </button>
          <button 
            onClick={handlePrint}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-all"
            title="Print"
          >
            <Printer className="w-3.5 h-3.5" />
            {t("print")}
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-all"
            title="Share document"
          >
            <Share2 className="w-3.5 h-3.5" />
            {t("share")}
          </button>
        </div>
      </header>

      {/* Main Workspace Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor Form */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 no-print bg-zinc-950 ${previewTab === "preview" ? "hidden sm:block" : "block"}`}>
          <form id="quotation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            
            {/* Quotation Metadata Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("docDetails")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("quoteNo")}</label>
                  <input 
                    type="text" 
                    {...register("quotationNo", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("preparedBy")}</label>
                  <input 
                    type="text" 
                    {...register("preparedBy", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("date")}</label>
                  <input 
                    type="text" 
                    {...register("date", { required: true })} 
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("validUntil")}</label>
                  <input 
                    type="text" 
                    {...register("validUntil", { required: true })} 
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Client Info Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("clientInfo")}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("clientName")}</label>
                  <input 
                    type="text" 
                    {...register("clientName", { required: true })} 
                    placeholder="e.g. Sway Engineering Consultancy"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("contactNo")}</label>
                    <input 
                      type="text" 
                      {...register("contactNo")} 
                      placeholder="e.g. +971 50..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("email")}</label>
                    <input 
                      type="text" 
                      {...register("email")} 
                      placeholder="e.g. info@client.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("locationArea")}</label>
                    <input 
                      type="text" 
                      {...register("locationArea")} 
                      placeholder="e.g. Dubai Marina"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("projectRef")}</label>
                    <input 
                      type="text" 
                      {...register("projectReference")} 
                      placeholder="e.g. Villa Automation"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">{t("lineItems")}</h2>
                <button
                  type="button"
                  onClick={() => append({
                    id: `item-${Date.now()}-${Math.random()}`,
                    description: "",
                    qty: 1,
                    unit: "Units",
                    unitPrice: 0,
                    cost: 0,
                    total: 0
                  })}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("addItem")}
                </button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-3 relative group">
                  <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t("description")}</label>
                    <textarea 
                      rows={2}
                      {...register(`items.${index}.description` as const, { required: true })} 
                      placeholder="Enter item description, catalog numbers..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-zinc-700 outline-none font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t("qty")}</label>
                      <input 
                        type="number" 
                        step="any"
                        {...register(`items.${index}.qty` as const, { required: true, valueAsNumber: true })} 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t("unit")}</label>
                      <input 
                        type="text" 
                        {...register(`items.${index}.unit` as const)} 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t("unitPrice")}</label>
                      <input 
                        type="number" 
                        step="any"
                        {...register(`items.${index}.unitPrice` as const, { required: true, valueAsNumber: true })} 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1 text-emerald-400">{t("costPerUnit")}</label>
                      <input 
                        type="number" 
                        step="any"
                        {...register(`items.${index}.cost` as const, { valueAsNumber: true })} 
                        className="w-full bg-zinc-900 border border-emerald-950 focus:border-emerald-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Internal Costing & Profit Margin Dashboard Summary */}
            <div className="bg-zinc-900/60 border border-emerald-900/40 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider border-b border-emerald-900/40 pb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t("internalCosting")}
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold mb-1">{t("total")}</span>
                  <span className="text-base font-bold text-white">{totalRevenue.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold mb-1">{t("totalCost")}</span>
                  <span className="text-base font-bold text-zinc-300">{totalCost.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold mb-1 text-emerald-400">{t("profitMargin")}</span>
                  <span className={`text-base font-bold ${profitMargin >= 0 ? "text-emerald-400" : "text-rose-450"}`}>
                    {profitMargin.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED
                    <span className="block text-xs font-medium text-emerald-500/80 mt-0.5">({marginPercentage.toFixed(0)}%)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase Invoice Attachment Section */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-400" />
                {t("attachInvoices")}
              </h2>
              
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="invoice-upload" className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-zinc-850 rounded-xl cursor-pointer hover:bg-zinc-900/40 hover:border-zinc-700 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Paperclip className="w-6 h-6 text-zinc-400 mb-1" />
                      <p className="text-xs text-zinc-400 font-bold">{t("uploadInvoiceBtn")}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">PDF, PNG, JPG up to 5MB</p>
                    </div>
                    <input 
                      type="file" 
                      id="invoice-upload" 
                      multiple 
                      accept="image/*,application/pdf" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                {/* Uploaded List */}
                {watchedInvoices.length > 0 && (
                  <div className="bg-zinc-950 rounded-xl border border-zinc-850 overflow-hidden divide-y divide-zinc-900">
                    {watchedInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="truncate pr-4">
                            <p className="font-semibold text-zinc-200 truncate">{inv.name}</p>
                            <p className="text-[10px] text-zinc-500">{t("uploadedAt")}: {inv.uploadedAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewInvoice(inv)}
                            className="p-1 px-2 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {t("viewFile")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1 px-2 rounded bg-zinc-900 hover:bg-red-950/20 text-red-400 border border-zinc-850 hover:border-red-900/30 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t("deleteFile")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Terms and Signatures Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("termsConditions")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("paymentTerms")}</label>
                  <input 
                    type="text" 
                    {...register("paymentTerms")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("termsLink")}</label>
                  <input 
                    type="text" 
                    {...register("termsConditions")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("preparedByName")}</label>
                  <input 
                    type="text" 
                    {...register("preparedByName")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("preparedByDate")}</label>
                  <input 
                    type="text" 
                    {...register("preparedByDate")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Company & Bank Details Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("companyBankDetails")}</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("companyName")}</label>
                    <input 
                      type="text" 
                      {...register("companyName")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("bankName")}</label>
                    <input 
                      type="text" 
                      {...register("bankName")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("iban")}</label>
                  <input 
                    type="text" 
                    {...register("bankIban")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("companyAddress")}</label>
                  <input 
                    type="text" 
                    {...register("companyAddress")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("companyEmail")}</label>
                  <input 
                    type="text" 
                    {...register("companyEmail")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Side: A4 Live Preview Sheets (White A4 Canvas) */}
        <div className={`flex-1 bg-zinc-900 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-zinc-800/80 print-area ${previewTab === "edit" ? "hidden sm:flex" : "flex"}`}>
          
          {/* PAGE 1 SHOWN AS A4 PAPER */}
          <div 
            ref={page1Ref}
            id="quotation-page-1"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col justify-between relative text-xs select-none"
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
                    QUOTATION
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-1 m-0">Smart Home & Automation Systems</p>
                </div>
              </div>

              {/* Metadata Grid Table */}
              <div className="grid grid-cols-4 border border-zinc-200 mt-4 text-[10px]">
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#0F4C81]">Quotation No.</div>
                <div className="p-2 border-r border-b border-zinc-200 font-mono font-bold text-zinc-700">{formValues.quotationNo}</div>
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#0F4C81]">Date</div>
                <div className="p-2 border-b border-zinc-200 text-zinc-700">{formValues.date}</div>

                <div className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]">Valid Until</div>
                <div className="p-2 border-r border-zinc-200 text-zinc-700">{formValues.validUntil}</div>
                <div className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]">Prepared By</div>
                <div className="p-2 text-zinc-700">{formValues.preparedBy}</div>
              </div>

              {/* Client Info Grid Table */}
              <div className="mt-4">
                <div className="bg-[#0F4C81]/10 text-[#0F4C81] font-bold px-3 py-1 text-[10px] tracking-wider rounded-t border-t border-l border-r border-zinc-200">
                  CLIENT INFORMATION
                </div>
                <div className="grid grid-cols-4 border border-zinc-200 text-[10px]">
                  <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#0F4C81]">Client Name</div>
                  <div className="p-2 border-r border-b border-zinc-200 font-semibold text-zinc-800 col-span-3">{formValues.clientName || "-"}</div>

                  <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#0F4C81]">Email</div>
                  <div className="p-2 border-r border-b border-zinc-200 text-zinc-700">{formValues.email || "-"}</div>
                  <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#0F4C81]">Contact No.</div>
                  <div className="p-2 border-b border-zinc-200 text-zinc-700">{formValues.contactNo || "-"}</div>

                  <div className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]">Project Reference</div>
                  <div className="p-2 border-r border-zinc-200 text-zinc-700">{formValues.projectReference || "-"}</div>
                  <div className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]">Location / Area</div>
                  <div className="p-2 text-zinc-700">{formValues.locationArea || "-"}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-4">
                <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F4C81] text-white font-bold text-[9px]">
                      <th className="p-2 w-8 text-center border-r border-[#0e4372]">#</th>
                      <th className="p-2 border-r border-[#0e4372]">Description / Scope of Work</th>
                      <th className="p-2 w-20 text-center border-r border-[#0e4372]">Qty</th>
                      <th className="p-2 w-24 text-right border-r border-[#0e4372]">Unit Price (AED)</th>
                      <th className="p-2 w-28 text-right">Total (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items.slice(0, 8).map((item, idx) => (
                      <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50/40">
                        <td className="p-2 text-center border-r border-zinc-200 font-semibold text-zinc-500">{idx + 1}</td>
                        <td className="p-2 border-r border-zinc-200 text-zinc-800 leading-normal whitespace-pre-line font-medium">
                          {item.description || "No description"}
                        </td>
                        <td className="p-2 text-center border-r border-zinc-200 text-zinc-700">
                          {item.qty ? Number(item.qty).toFixed(2) : "0.00"} {item.unit || "Units"}
                        </td>
                        <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">
                          {item.unitPrice ? Number(item.unitPrice).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"}
                        </td>
                        <td className="p-2 text-right text-zinc-900 font-bold font-mono">
                          {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    ))}
                    
                    {formValues.items.slice(0, 8).length < 5 && Array.from({ length: 5 - formValues.items.slice(0, 8).length }).map((_, emptyIdx) => (
                      <tr key={`empty-${emptyIdx}`} className="border-b border-zinc-100 min-h-[30px] opacity-10">
                        <td className="p-2 text-center border-r border-zinc-100">&nbsp;</td>
                        <td className="p-2 border-r border-zinc-100">&nbsp;</td>
                        <td className="p-2 text-center border-r border-zinc-100">&nbsp;</td>
                        <td className="p-2 text-right border-r border-zinc-100">&nbsp;</td>
                        <td className="p-2 text-right">&nbsp;</td>
                      </tr>
                    ))}

                    <tr className="bg-zinc-50/50 font-bold text-zinc-700 border-t border-zinc-200">
                      <td colSpan={3} className="p-2 border-r border-zinc-200">&nbsp;</td>
                      <td className="p-2 text-right border-r border-zinc-200 text-[#0F4C81]">Subtotal:</td>
                      <td className="p-2 text-right font-mono font-bold text-zinc-800">
                        {subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                      </td>
                    </tr>
                    <tr className="bg-[#0F4C81]/5 font-bold text-zinc-900">
                      <td colSpan={3} className="p-2 border-r border-zinc-200">&nbsp;</td>
                      <td className="p-2 text-right border-r border-zinc-200 text-[#0F4C81] text-[10px]">TOTAL:</td>
                      <td className="p-2 text-right font-mono text-[10px] text-[#0F4C81] font-bold">
                        {total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms and Conditions Section */}
              <div className="mt-4 border border-zinc-200 rounded">
                <div className="bg-zinc-50/80 px-3 py-1 font-bold text-[9px] text-[#0F4C81] border-b border-zinc-200">
                  TERMS & CONDITIONS
                </div>
                <div className="grid grid-cols-2 p-2.5 text-[9px] gap-4">
                  <div>
                    <span className="font-bold text-zinc-500">Payment terms: </span>
                    <span className="text-zinc-800 font-semibold">{formValues.paymentTerms || "Immediate Payment"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500">Terms & Conditions: </span>
                    <a href={formValues.termsConditions} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline">
                      {formValues.termsConditions}
                    </a>
                  </div>
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 mt-4 border border-zinc-200 text-[9px] relative">
                <div className="p-3 border-r border-zinc-200 min-h-[90px] relative flex flex-col justify-between">
                  <div className="font-bold text-[#0F4C81] border-b border-zinc-100 pb-1 uppercase tracking-wider">
                    Prepared & Approved By (Ruaad Smart)
                  </div>
                  
                  {/* Official Stamp Overlay */}
                  <div className="absolute bottom-1 right-8 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none">
                    <Image 
                      src="/stamp.png" 
                      alt="Ruaad Smart Stamp" 
                      fill 
                      className="object-contain"
                    />
                  </div>
                  
                  <div className="pt-8 text-zinc-700 space-y-0.5 relative z-10">
                    <div><span className="font-bold text-zinc-400">Name:</span> {formValues.preparedByName || "mostafa"}</div>
                    <div><span className="font-bold text-zinc-400">Date:</span> {formValues.preparedByDate}</div>
                  </div>
                </div>

                <div className="p-3 min-h-[90px] flex flex-col justify-between">
                  <div className="font-bold text-[#0F4C81] border-b border-zinc-100 pb-1 uppercase tracking-wider">
                    Client Acceptance
                  </div>
                  
                  <div className="border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-6 mb-2" />
                  
                  <div className="text-zinc-700 space-y-0.5">
                    <div><span className="font-bold text-zinc-400">Name:</span> ______________________</div>
                    <div><span className="font-bold text-zinc-400">Date:</span> ______________________</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Company Info Block 1 (Page 1) */}
            <div className="border border-zinc-200 mt-4 text-[9px]">
              <div className="bg-[#0F4C81]/10 text-[#0F4C81] font-bold px-3 py-1 border-b border-zinc-200">
                COMPANY & BANK DETAILS
              </div>
              <div className="grid grid-cols-2">
                <div className="p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px]">Company Name</span>
                  <span className="text-zinc-800 font-semibold">{formValues.companyName || "RUAAD SMART SMART MACHINE TRADING LLC"}</span>
                </div>
                <div className="p-2">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px]">Bank Name</span>
                  <span className="text-zinc-800 font-semibold">{formValues.bankName || "ABUDHABI COMML.BANK"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2 SHOWN AS A4 PAPER */}
          <div 
            ref={page2Ref}
            id="quotation-page-2"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col justify-between relative text-xs select-none"
            style={{ boxSizing: "border-box" }}
          >
            <div>
              {/* Document Header Page 2 */}
              <div className="flex items-start justify-between border-b-[2px] border-zinc-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 bg-white">
                    <Image 
                      src="/logo.jpg" 
                      alt="Ruaad Smart Logo" 
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#0F4C81] font-arabic m-0">رواد سمارت للأجهزة الذكية</h2>
                    <p className="text-[8px] text-zinc-500 m-0">RUAAD SMART SMART MACHINE TRADING LLC</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-zinc-400 font-bold text-xs tracking-wider">PAGE 2 / 2</span>
                </div>
              </div>

              {/* Quotation Table Continuation if items exceed 8 */}
              {formValues.items.length > 8 && (
                <div className="mt-4">
                  <div className="bg-zinc-100 text-[#0F4C81] font-bold px-3 py-1 text-[9px] mb-2 rounded border border-zinc-200">
                    ITEMS LIST CONTINUATION
                  </div>
                  <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0F4C81] text-white font-bold text-[9px]">
                        <th className="p-2 w-8 text-center border-r border-[#0e4372]">#</th>
                        <th className="p-2 border-r border-[#0e4372]">Description / Scope of Work</th>
                        <th className="p-2 w-20 text-center border-r border-[#0e4372]">Qty</th>
                        <th className="p-2 w-24 text-right border-r border-[#0e4372]">Unit Price (AED)</th>
                        <th className="p-2 w-28 text-right">Total (AED)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formValues.items.slice(8).map((item, idx) => (
                        <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50/40">
                          <td className="p-2 text-center border-r border-zinc-200 font-semibold text-zinc-500">{idx + 9}</td>
                          <td className="p-2 border-r border-zinc-200 text-zinc-800 leading-normal whitespace-pre-line font-medium">
                            {item.description || "No description"}
                          </td>
                          <td className="p-2 text-center border-r border-zinc-200 text-zinc-700">
                            {item.qty ? Number(item.qty).toFixed(2) : "0.00"} {item.unit || "Units"}
                          </td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">
                            {item.unitPrice ? Number(item.unitPrice).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"}
                          </td>
                          <td className="p-2 text-right text-zinc-900 font-bold font-mono">
                            {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Company Details Block 2 (Page 2) */}
              <div className="mt-4 border border-zinc-200 text-[9px] rounded overflow-hidden">
                <div className="bg-[#0F4C81]/5 text-[#0F4C81] font-bold px-3 py-1.5 border-b border-zinc-200 uppercase tracking-wider text-[8px]">
                  Additional Details & Bank Information
                </div>
                <div className="grid grid-cols-2 border-b border-zinc-200">
                  <div className="p-3 border-r border-zinc-200 bg-zinc-50/20">
                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-1">Company Address</span>
                    <span className="text-zinc-800 font-medium leading-relaxed">{formValues.companyAddress}</span>
                  </div>
                  <div className="p-3 bg-zinc-50/20">
                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-1">IBAN</span>
                    <span className="text-zinc-900 font-mono font-bold tracking-wider">{formValues.bankIban}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="p-3 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-1">Email</span>
                    <a href={`mailto:${formValues.companyEmail}`} className="text-blue-600 font-semibold">{formValues.companyEmail}</a>
                  </div>
                  <div className="p-3 bg-zinc-50/10">
                    &nbsp;
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Footer Statement */}
            <div className="border-t border-zinc-200 pt-4 text-center">
              <p className="italic text-zinc-400 text-[9px] m-0">
                This receipt is only valid when signed by an authorised Ruaad Smart representative.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Full Screen File View Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-semibold truncate max-w-md">{viewInvoice.name}</h3>
              </div>
              <button 
                onClick={() => setViewInvoice(null)}
                className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="flex-1 bg-zinc-950 flex items-center justify-center p-6 overflow-hidden">
              {viewInvoice.fileType.startsWith("image/") ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={viewInvoice.fileData} 
                    alt={viewInvoice.name} 
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              ) : (
                <iframe 
                  src={viewInvoice.fileData} 
                  title={viewInvoice.name}
                  className="w-full h-full border-0 rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
