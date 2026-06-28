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
  discount: 0,
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
  const [previewTab, setPreviewTab] = useState<"edit" | "client-preview" | "company-preview">("edit");
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
  
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const companyPageRef = useRef<HTMLDivElement>(null);

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
  const watchedDiscount = Number(watch("discount")) || 0;
  const subtotal = watchedItems.reduce((acc, item) => acc + (item.qty || 0) * (item.unitPrice || 0), 0);
  const discountAmount = subtotal * (watchedDiscount / 100);
  const total = Math.max(0, subtotal - discountAmount);

  // Calculate internal cost and margins
  const totalCost = watchedItems.reduce((acc, item) => acc + ((item.cost || 0) * (item.qty || 0)), 0);
  const totalRevenue = total;
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

      const discountVal = Number(data.discount) || 0;
      const discountAmount = calculatedSubtotal * (discountVal / 100);
      const calculatedTotal = Math.max(0, calculatedSubtotal - discountAmount);

      const updatedDoc: Quotation = {
        ...data,
        items: processedItems,
        id: documentId,
        subtotal: calculatedSubtotal,
        discount: discountVal,
        total: calculatedTotal,
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

  const captureElementAsCanvas = async (element: HTMLDivElement): Promise<HTMLCanvasElement> => {
    const clone = element.cloneNode(true) as HTMLDivElement;
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "-9999px";
    clone.style.width = "210mm";
    clone.style.height = "297mm";
    clone.style.minWidth = "210mm";
    clone.style.minHeight = "297mm";
    clone.style.zoom = "1";
    clone.style.transform = "none";
    document.body.appendChild(clone);
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const options = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      };
      return await html2canvas(clone, options);
    } finally {
      document.body.removeChild(clone);
    }
  };

  // Generate PDF from DOM
  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!page1Ref.current || !page2Ref.current) return null;
    
    setExporting(true);
    document.body.classList.add("pdf-generating");
    try {
      const canvas1 = await captureElementAsCanvas(page1Ref.current);
      const imgData1 = canvas1.toDataURL("image/jpeg", 0.98);

      const canvas2 = await captureElementAsCanvas(page2Ref.current);
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
      document.body.classList.remove("pdf-generating");
      setExporting(false);
    }
  };

  const generateCompanyPDF = async (): Promise<jsPDF | null> => {
    if (!companyPageRef.current) return null;
    setExporting(true);
    document.body.classList.add("pdf-generating");
    try {
      const canvas = await captureElementAsCanvas(companyPageRef.current);
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      return pdf;
    } catch (error) {
      console.error("Company PDF generation failed:", error);
      return null;
    } finally {
      document.body.classList.remove("pdf-generating");
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

  const handleDownloadCompanyPDF = async () => {
    const pdf = await generateCompanyPDF();
    if (pdf) {
      const qNo = watch("quotationNo") || "Quotation";
      pdf.save(`Ruaad_Smart_Company_Costing_${qNo}.pdf`);
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
                {id ? t("editTitle") : t("newQuotation")}
              </h1>
              <p className="text-xs text-zinc-500 font-mono">No: {formValues.quotationNo}</p>
            </div>
          </div>
          
          {/* Action buttons on very small mobile screens (hidden on md) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button 
              type="submit" 
              form="quotation-form"
              disabled={saving}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium transition-all"
              title={t("saveBtn")}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
            <button 
              onClick={previewTab === "company-preview" ? handleDownloadCompanyPDF : handleDownloadPDF}
              disabled={exporting}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-900 text-zinc-200 font-medium transition-all"
              title={t("downloadPdf")}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleShare}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-medium transition-all"
              title={t("share")}
            >
              <Share2 className="w-4 h-4" />
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
              className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-semibold rounded text-center ${previewTab === "edit" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {t("formTab")}
            </button>
            <button 
              type="button"
              onClick={() => setPreviewTab("client-preview")}
              className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-semibold rounded text-center ${previewTab === "client-preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {t("clientTab")}
            </button>
            <button 
              type="button"
              onClick={() => setPreviewTab("company-preview")}
              className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-semibold rounded text-center ${previewTab === "company-preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {t("companyTab")}
            </button>
          </div>

          {/* Desktop/Tablet Action Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
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
              onClick={previewTab === "company-preview" ? handleDownloadCompanyPDF : handleDownloadPDF}
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
            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              {t("share")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor Form */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 no-print bg-zinc-950 ${previewTab !== "edit" ? "hidden" : "block"}`}>
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

            {/* Totals & Discount Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">
                {language === "ar" ? "تفاصيل التكلفة والخصم" : "Pricing Summary & Discount"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("subtotal")}</label>
                  <div className="w-full bg-zinc-950/80 border border-zinc-850 rounded-lg px-3 py-2 text-sm text-zinc-400 font-mono">
                    {subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("discount")}</label>
                  <input 
                    type="number" 
                    step="any"
                    {...register("discount", { valueAsNumber: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("total")}</label>
                  <div className="w-full bg-zinc-950/80 border border-blue-900/30 rounded-lg px-3 py-2 text-sm text-blue-400 font-bold font-mono">
                    {total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                  </div>
                </div>
              </div>
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

        {/* Right Side: A4 Live Preview Sheets (Client) */}
        <div className={`bg-zinc-900 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-zinc-800/80 print-area ${
          previewTab === "edit" 
            ? "hidden lg:flex lg:w-[48%] xl:w-[45%]" 
            : previewTab === "client-preview" 
              ? "flex-1 flex" 
              : "hidden"
        } ${previewTab === "company-preview" ? "no-print" : ""}`}>
          
          {/* PAGE 1 SHOWN AS A4 PAPER */}
          <div 
            ref={page1Ref}
            id="quotation-page-1"
            dir="ltr"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col justify-between relative text-xs select-none text-left"
            style={{ boxSizing: "border-box", direction: "ltr" }}
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
              <table className="w-full border border-zinc-200 mt-2.5 text-[10px] border-collapse" style={{ tableLayout: "fixed" }}>
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Quotation No.</td>
                    <td className="p-2 border-r border-zinc-200 font-mono font-bold text-zinc-700" style={{ width: "25%" }}>{formValues.quotationNo}</td>
                    <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Date</td>
                    <td className="p-2 text-zinc-700" style={{ width: "25%" }}>{formValues.date}</td>
                  </tr>
                  <tr>
                    <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Valid Until</td>
                    <td className="p-2 border-r border-zinc-200 text-zinc-700" style={{ width: "25%" }}>{formValues.validUntil}</td>
                    <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Prepared By</td>
                    <td className="p-2 text-zinc-700" style={{ width: "25%" }}>{formValues.preparedBy}</td>
                  </tr>
                </tbody>
              </table>

              {/* Client Info Grid Table */}
              <div className="mt-2.5">
                <div className="text-[#0F4C81] font-bold px-3 py-1 text-[10px] tracking-wider rounded-t border-t border-l border-r border-zinc-200" style={{ backgroundColor: "rgba(15, 76, 129, 0.1)" }}>
                  CLIENT INFORMATION
                </div>
                <table className="w-full border border-zinc-200 text-[10px] border-collapse" style={{ tableLayout: "fixed" }}>
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Client Name</td>
                      <td colSpan={3} className="p-2 font-semibold text-zinc-800" style={{ width: "75%" }}>{formValues.clientName || "-"}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Email</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700" style={{ width: "25%" }}>{formValues.email || "-"}</td>
                      <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Contact No.</td>
                      <td className="p-2 text-zinc-700" style={{ width: "25%" }}>{formValues.contactNo || "-"}</td>
                    </tr>
                    <tr>
                      <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Project Reference</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700 break-words" style={{ width: "25%" }}>{formValues.projectReference || "-"}</td>
                      <td className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]" style={{ width: "25%" }}>Location / Area</td>
                      <td className="p-2 text-zinc-700 break-words" style={{ width: "25%" }}>{formValues.locationArea || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items Table */}
              <div className="mt-2.5">
                <table className="w-full border border-zinc-200 text-[8.5px] text-left border-collapse" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="bg-[#0F4C81] text-white font-bold text-[8.5px]">
                      <th className="p-1.5 text-center border-r border-[#0e4372]" style={{ width: "5%" }}>#</th>
                      <th className="p-1.5 border-r border-[#0e4372]" style={{ width: "55%" }}>Description / Scope of Work</th>
                      <th className="p-1.5 text-center border-r border-[#0e4372]" style={{ width: "10%" }}>Qty</th>
                      <th className="p-1.5 text-right border-r border-[#0e4372]" style={{ width: "15%" }}>Unit Price (AED)</th>
                      <th className="p-1.5 text-right" style={{ width: "15%" }}>Total (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items.slice(0, 5).map((item, idx) => (
                      <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50/40">
                        <td className="p-1.5 text-center border-r border-zinc-200 font-semibold text-zinc-500" style={{ width: "5%" }}>{idx + 1}</td>
                        <td className="p-1.5 border-r border-zinc-200 text-zinc-800 leading-normal whitespace-pre-line font-medium break-words" style={{ width: "55%" }}>
                          {item.description || "No description"}
                        </td>
                        <td className="p-1.5 text-center border-r border-zinc-200 text-zinc-700" style={{ width: "10%" }}>
                          {item.qty ? Number(item.qty).toFixed(2) : "0.00"} {item.unit || "Units"}
                        </td>
                        <td className="p-1.5 text-right border-r border-zinc-200 text-zinc-700 font-mono" style={{ width: "15%" }}>
                          {item.unitPrice ? Number(item.unitPrice).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"}
                        </td>
                        <td className="p-1.5 text-right text-zinc-900 font-bold font-mono" style={{ width: "15%" }}>
                          {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    ))}
                    
                    {formValues.items.slice(0, 5).length < 3 && Array.from({ length: 3 - formValues.items.slice(0, 5).length }).map((_, emptyIdx) => (
                      <tr key={`empty-${emptyIdx}`} className="border-b border-zinc-100 min-h-[25px] opacity-10">
                        <td className="p-1.5 text-center border-r border-zinc-100" style={{ width: "5%" }}>&nbsp;</td>
                        <td className="p-1.5 border-r border-zinc-100" style={{ width: "55%" }}>&nbsp;</td>
                        <td className="p-1.5 text-center border-r border-zinc-100" style={{ width: "10%" }}>&nbsp;</td>
                        <td className="p-1.5 text-right border-r border-zinc-100" style={{ width: "15%" }}>&nbsp;</td>
                        <td className="p-1.5 text-right" style={{ width: "15%" }}>&nbsp;</td>
                      </tr>
                    ))}

                    <tr className="font-bold text-zinc-700 border-t border-zinc-200" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                      <td colSpan={3} className="p-1 border-r border-zinc-200" style={{ width: "70%" }}>&nbsp;</td>
                      <td className="p-1 text-right border-r border-zinc-200 text-[#0F4C81]" style={{ width: "15%" }}>Subtotal:</td>
                      <td className="p-1 text-right font-mono font-bold text-zinc-800" style={{ width: "15%" }}>
                        {subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                      </td>
                    </tr>
                    {watchedDiscount > 0 && (
                      <tr className="font-bold text-zinc-650 border-t border-zinc-200" style={{ backgroundColor: "rgba(254, 242, 242, 0.5)" }}>
                        <td colSpan={3} className="p-1 border-r border-zinc-200">&nbsp;</td>
                        <td className="p-1 text-right border-r border-zinc-200 text-red-650">Discount ({watchedDiscount}%):</td>
                        <td className="p-1 text-right font-mono font-bold text-red-650">
                          -{(subtotal * (watchedDiscount / 100)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    )}
                    <tr className="font-bold text-zinc-900" style={{ backgroundColor: "rgba(15, 76, 129, 0.05)" }}>
                      <td colSpan={3} className="p-1 border-r border-zinc-200">&nbsp;</td>
                      <td className="p-1 text-right border-r border-zinc-200 text-[#0F4C81] text-[10px]">TOTAL:</td>
                      <td className="p-1 text-right font-mono text-[10px] text-[#0F4C81] font-bold">
                        {total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms and Conditions Section */}
              <div className="mt-2 border border-zinc-200 rounded">
                <div className="px-2 py-0.5 font-bold text-[9px] text-[#0F4C81] border-b border-zinc-200" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)" }}>
                  TERMS & CONDITIONS
                </div>
                <div className="flex justify-between p-2 text-[9px] gap-4">
                  <div className="w-[48%]">
                    <span className="font-bold text-zinc-500">Payment terms: </span>
                    <span className="text-zinc-800 font-semibold">{formValues.paymentTerms || "Immediate Payment"}</span>
                  </div>
                  <div className="w-[48%]">
                    <span className="font-bold text-zinc-500">Terms & Conditions: </span>
                    <a href={formValues.termsConditions} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline">
                      {formValues.termsConditions}
                    </a>
                  </div>
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="flex w-full mt-2.5 border border-zinc-200 text-[9px] relative">
                <div className="w-[50%] p-3 border-r border-zinc-200 min-h-[90px] relative flex flex-col justify-between">
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

                <div className="w-[50%] p-3 min-h-[90px] flex flex-col justify-between">
                  <div className="font-bold text-[#0F4C81] border-b border-zinc-100 pb-1 uppercase tracking-wider">
                    Client Acceptance
                  </div>
                  
                  <div className="border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-6 mb-2" />
                  
                  <div className="text-zinc-700 space-y-0.5">
                    <div><span className="font-bold text-zinc-400">Name: ______________________</span></div>
                    <div><span className="font-bold text-zinc-400">Date: ______________________</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Company Info Block 1 (Page 1) */}
            <div className="border border-zinc-200 mt-2.5 text-[9px]">
              <div className="text-[#0F4C81] font-bold px-3 py-1 border-b border-zinc-200" style={{ backgroundColor: "rgba(15, 76, 129, 0.1)" }}>
                COMPANY & BANK DETAILS
              </div>
              <div className="flex w-full">
                <div className="w-[50%] p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px]">Company Name</span>
                  <span className="text-zinc-800 font-semibold">{formValues.companyName || "RUAAD SMART SMART MACHINE TRADING LLC"}</span>
                </div>
                <div className="w-[50%] p-2">
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
            dir="ltr"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col justify-between relative text-xs select-none text-left"
            style={{ boxSizing: "border-box", direction: "ltr" }}
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

              {/* Quotation Table Continuation if items exceed 5 */}
              {formValues.items.length > 5 && (
                <div className="mt-4">
                  <div className="bg-zinc-100 text-[#0F4C81] font-bold px-3 py-1.5 text-[8.5px] mb-2 rounded border border-zinc-200">
                    ITEMS LIST CONTINUATION
                  </div>
                  <table className="w-full border border-zinc-200 text-[8.5px] text-left border-collapse" style={{ tableLayout: "fixed" }}>
                    <thead>
                      <tr className="bg-[#0F4C81] text-white font-bold text-[8.5px]">
                        <th className="p-1.5 text-center border-r border-[#0e4372]" style={{ width: "5%" }}>#</th>
                        <th className="p-1.5 border-r border-[#0e4372]" style={{ width: "55%" }}>Description / Scope of Work</th>
                        <th className="p-1.5 text-center border-r border-[#0e4372]" style={{ width: "10%" }}>Qty</th>
                        <th className="p-1.5 text-right border-r border-[#0e4372]" style={{ width: "15%" }}>Unit Price (AED)</th>
                        <th className="p-1.5 text-right" style={{ width: "15%" }}>Total (AED)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formValues.items.slice(5).map((item, idx) => (
                        <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50/40">
                          <td className="p-1.5 text-center border-r border-zinc-200 font-semibold text-zinc-500" style={{ width: "5%" }}>{idx + 6}</td>
                          <td className="p-1.5 border-r border-zinc-200 text-zinc-800 leading-normal whitespace-pre-line font-medium break-words" style={{ width: "55%" }}>
                            {item.description || "No description"}
                          </td>
                          <td className="p-1.5 text-center border-r border-zinc-200 text-zinc-700" style={{ width: "10%" }}>
                            {item.qty ? Number(item.qty).toFixed(2) : "0.00"} {item.unit || "Units"}
                          </td>
                          <td className="p-1.5 text-right border-r border-zinc-200 text-zinc-700 font-mono" style={{ width: "15%" }}>
                            {item.unitPrice ? Number(item.unitPrice).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"}
                          </td>
                          <td className="p-1.5 text-right text-zinc-900 font-bold font-mono" style={{ width: "15%" }}>
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
                <div className="text-[#0F4C81] font-bold px-3 py-1.5 border-b border-zinc-200 uppercase tracking-wider text-[8px]" style={{ backgroundColor: "rgba(15, 76, 129, 0.05)" }}>
                  Additional Details & Bank Information
                </div>
                <div className="flex w-full border-b border-zinc-200">
                  <div className="w-[50%] p-3 border-r border-zinc-200" style={{ backgroundColor: "rgba(250, 250, 250, 0.2)" }}>
                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-1">Company Address</span>
                    <span className="text-zinc-800 font-medium leading-relaxed">{formValues.companyAddress}</span>
                  </div>
                  <div className="w-[50%] p-3" style={{ backgroundColor: "rgba(250, 250, 250, 0.2)" }}>
                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-1">IBAN</span>
                    <span className="text-zinc-900 font-mono font-bold tracking-wider">{formValues.bankIban}</span>
                  </div>
                </div>
                <div className="flex w-full">
                  <div className="w-[50%] p-3 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-1">Email</span>
                    <a href={`mailto:${formValues.companyEmail}`} className="text-blue-600 font-semibold">{formValues.companyEmail}</a>
                  </div>
                  <div className="w-[50%] p-3" style={{ backgroundColor: "rgba(250, 250, 250, 0.1)" }}>
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

        {/* PAGE 3: COMPANY INTERNAL COSTING SHEET */}
        <div className={`bg-zinc-900 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-zinc-800/80 print-area ${
          previewTab === "company-preview" ? "flex-1 flex" : "hidden"
        } ${previewTab !== "company-preview" ? "no-print" : ""}`}>
          <div 
            ref={companyPageRef}
            id="company-costing-page"
            dir="ltr"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col justify-between relative text-xs select-none text-left"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-zinc-200 pb-4">
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
                    <p className="text-[9px] text-zinc-500 m-0 tracking-wider">INTERNAL COSTING & PROFIT SHEET</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-zinc-800 text-white px-4 py-1.5 rounded font-bold text-sm tracking-wider inline-block">
                    INTERNAL USE ONLY
                  </div>
                  <p className="text-[9px] text-red-500 font-bold mt-1 m-0">سند التكاليف والأرباح الداخلية للشركة</p>
                </div>
              </div>

              {/* Quotation Identity Info */}
              <div className="grid grid-cols-4 border border-zinc-200 mt-4 text-[10px]">
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#0F4C81]">Quotation No.</div>
                <div className="p-2 border-r border-b border-zinc-200 font-mono font-bold text-zinc-700">{formValues.quotationNo}</div>
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#0F4C81]">Date</div>
                <div className="p-2 border-b border-zinc-200 text-zinc-700">{formValues.date}</div>

                <div className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#0F4C81]">Client Name</div>
                <div className="p-2 border-r border-zinc-200 text-zinc-800 font-semibold col-span-3">{formValues.clientName || "-"}</div>
              </div>

              {/* Cost & Profit Margin Analysis Card */}
              <div className="mt-4 grid grid-cols-3 gap-4 border border-zinc-200 rounded-lg p-4" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                <div className="text-center p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Total Client Price (Revenue)</span>
                  <span className="text-zinc-900 font-extrabold text-sm font-mono">{totalRevenue.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED</span>
                  {watchedDiscount > 0 && (
                    <span className="block text-[7px] text-zinc-400 font-bold mt-0.5">(Discount: {watchedDiscount}% / -{(subtotal * (watchedDiscount / 100)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED)</span>
                  )}
                </div>
                <div className="text-center p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Total Cost Price</span>
                  <span className="text-zinc-900 font-extrabold text-sm font-mono">{totalCost.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED</span>
                </div>
                <div className="text-center p-2">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Expected Profit Margin</span>
                  <span className={`font-extrabold text-sm font-mono ${profitMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {profitMargin.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED <br/>
                    <span className="text-[10px] opacity-80">({marginPercentage.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Table */}
              <div className="mt-4">
                <p className="font-bold text-zinc-800 mb-2 text-[10px] uppercase tracking-wider">Cost breakdown per line item:</p>
                <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-800 text-white font-bold text-[9px]">
                      <th className="p-2 w-8 text-center border-r border-zinc-700 font-bold">#</th>
                      <th className="p-2 border-r border-zinc-700 font-bold">Description</th>
                      <th className="p-2 w-12 text-center border-r border-zinc-700 font-bold">Qty</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Unit Cost (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Total Cost (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Unit Price (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Total Price (AED)</th>
                      <th className="p-2 w-20 text-right font-bold">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items.map((item, idx) => {
                      const itemCost = (item.cost || 0) * (item.qty || 0);
                      const itemRevenue = (item.unitPrice || 0) * (item.qty || 0);
                      const itemProfit = itemRevenue - itemCost;
                      const itemProfitPercent = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;
                      
                      return (
                        <tr key={item.id || idx} className="border-b border-zinc-200 hover:bg-zinc-50/25">
                          <td className="p-2 text-center border-r border-zinc-200 font-semibold text-zinc-500">{idx + 1}</td>
                          <td className="p-2 border-r border-zinc-200 text-zinc-800 leading-normal truncate max-w-[150px]">
                            {item.description ? item.description.split("\n")[0] : "-"}
                          </td>
                          <td className="p-2 text-center border-r border-zinc-200 text-zinc-700">{item.qty || 0}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-600 font-mono">{(item.cost || 0).toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">{itemCost.toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-600 font-mono">{(item.unitPrice || 0).toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">{itemRevenue.toLocaleString()}</td>
                          <td className={`p-2 text-right font-bold font-mono ${itemProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {itemProfit.toLocaleString()} <span className="text-[8px] font-normal">({itemProfitPercent.toFixed(0)}%)</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Attached Invoices */}
              {watchedInvoices.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-zinc-800 mb-2 text-[10px] uppercase tracking-wider">Attached Purchase Invoices / فواتير الشراء المرفقة:</p>
                  <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-700 font-bold">
                        <th className="p-2 border-r border-zinc-200 font-bold">Invoice File Name</th>
                        <th className="p-2 border-r border-zinc-200 text-center font-bold">Type</th>
                        <th className="p-2 text-center font-bold font-bold">Uploaded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchedInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-zinc-200">
                          <td className="p-2 border-r border-zinc-200 font-medium text-zinc-800">{inv.name}</td>
                          <td className="p-2 border-r border-zinc-200 text-center text-zinc-500">{inv.fileType.split("/")[1]?.toUpperCase() || "PDF"}</td>
                          <td className="p-2 text-center text-zinc-500">{inv.uploadedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Verification Footer Statement */}
            <div className="border-t border-zinc-200 pt-4 text-center">
              <p className="italic text-zinc-400 text-[8px] m-0">
                Confidential Document. For internal accounting and profit audit purposes only.
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
