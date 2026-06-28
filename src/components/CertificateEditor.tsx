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
  Award,
  Check,
  RotateCcw
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveCertificate, getCertificate, Certificate, CertificateItem } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CertificateEditorProps {
  id?: string;
}

const DEFAULT_CERTIFICATE_VALUES = {
  project: "Mr. Mohamed Villa 1 Al Aweer - Sharjah",
  systemType: "Extra Low Voltage & Wireless Home Automation & Network",
  statement: "This is to certify that M/S Ruaad Smart has completed the ELV system's supply, installation, testing, and commissioning for the project mentioned above and handed it over within the stipulated period, and also maintained the quality of work.",
  checklist: [
    { id: "c-1", system: "Curtain System", remarks: "8 Curtain Motors", done: true },
    { id: "c-2", system: "Lighting Control System", remarks: "17 Lighting Switches", done: true },
    { id: "c-3", system: "Air Conditioning Control System", remarks: "6 AC Switches", done: true },
    { id: "c-4", system: "Smart Home Control System", remarks: "2 Smart Screens", done: true },
    { id: "c-5", system: "CCTV System", remarks: "All cameras which were supplied are Fixed and Programmed.", done: true },
    { id: "c-6", system: "Network / WiFi System", remarks: "3 Repeaters", done: true },
  ],
  warrantyText: "Warranty starts from date of this certificate.",
  clientName: "",
  clientSignature: "",
  clientDate: new Date().toLocaleDateString("en-GB"),
  integratorName: "Ruaad Smart",
  integratorSignature: "",
  integratorDate: new Date().toLocaleDateString("en-GB"),
  address: "Abraj Al Mamzar , Block A F 106 , Al Mamzar , United Arab Emirates",
  website: "support.ruaadalraqamia.com",
  phone: "00971551616298"
};

export default function CertificateEditor({ id }: CertificateEditorProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");

  const previewRef = useRef<HTMLDivElement>(null);
  const clientSigRef = useRef<SignatureCanvas>(null);
  const integratorSigRef = useRef<SignatureCanvas>(null);

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<Certificate>({
    defaultValues: DEFAULT_CERTIFICATE_VALUES
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "checklist"
  });

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      const docId = id;
      async function loadCertificate() {
        try {
          const data = await getCertificate(docId);
          if (data) {
            reset(data);
            
            // Load signatures into canvas after rendering
            setTimeout(() => {
              if (data.clientSignature && clientSigRef.current) {
                clientSigRef.current.fromDataURL(data.clientSignature);
              }
              if (data.integratorSignature && integratorSigRef.current) {
                integratorSigRef.current.fromDataURL(data.integratorSignature);
              }
            }, 200);

          } else {
            alert("Certificate not found");
            router.push("/");
          }
        } catch (error) {
          console.error("Error loading certificate:", error);
        } finally {
          setLoading(false);
        }
      }
      loadCertificate();
    } else {
      setLoading(false);
    }
  }, [id, reset, router]);

  const onSignatureEnd = (type: "client" | "integrator") => {
    if (type === "client" && clientSigRef.current) {
      if (!clientSigRef.current.isEmpty()) {
        setValue("clientSignature", clientSigRef.current.toDataURL("image/png"));
      }
    } else if (type === "integrator" && integratorSigRef.current) {
      if (!integratorSigRef.current.isEmpty()) {
        setValue("integratorSignature", integratorSigRef.current.toDataURL("image/png"));
      }
    }
  };

  const clearSignature = (type: "client" | "integrator") => {
    if (type === "client" && clientSigRef.current) {
      clientSigRef.current.clear();
      setValue("clientSignature", "");
    } else if (type === "integrator" && integratorSigRef.current) {
      integratorSigRef.current.clear();
      setValue("integratorSignature", "");
    }
  };

  const onSubmit = async (data: Certificate) => {
    setSaving(true);
    try {
      const documentId = id || `cert-${Date.now()}`;
      const now = new Date().toISOString();
      const updatedDoc: Certificate = {
        ...data,
        id: documentId,
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      await saveCertificate(updatedDoc);
      alert(language === "ar" ? "تم حفظ شهادة إتمام العمل بنجاح!" : "Work Completion Certificate saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving certificate:", error);
      alert(language === "ar" ? "فشل حفظ شهادة إتمام العمل." : "Failed to save certificate.");
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

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      const proj = watch("project") || "Certificate";
      pdf.save(`Work_Completion_Certificate_${proj.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
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
      const proj = watch("project") || "Certificate";
      const blob = pdf.output("blob");
      const file = new File([blob], `Work_Completion_Certificate_${proj.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`, { type: "application/pdf" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Work Completion Certificate`,
          text: `Please find attached the completion certificate for project ${proj}.`
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

  if (loading || !isMounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-zinc-400 mt-2 text-sm">Loading certificate editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
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
                <Award className="w-5 h-5 text-purple-500" />
                {id ? t("editTitle") : t("newCertificate")}
              </h1>
              <p className="text-xs text-zinc-500 font-mono">Project: {formValues.project || "Unnamed"}</p>
            </div>
          </div>
          
          {/* Action buttons on very small mobile screens (hidden on md) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button 
              type="submit" 
              form="certificate-form"
              disabled={saving}
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-medium transition-all"
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
              className={`flex-1 md:flex-initial px-4.5 py-1.5 text-xs font-semibold rounded text-center transition-all ${previewTab === "edit" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {t("formTab")}
            </button>
            <button 
              type="button"
              onClick={() => setPreviewTab("preview")}
              className={`flex-1 md:flex-initial px-4.5 py-1.5 text-xs font-semibold rounded text-center transition-all ${previewTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {t("previewTab")}
            </button>
          </div>

          {/* Desktop/Tablet Action Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              type="submit" 
              form="certificate-form"
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-medium text-xs transition-all hover:scale-[1.02]"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 no-print bg-zinc-950 ${previewTab === "preview" ? "hidden sm:block" : "block"}`}>
          <form id="certificate-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            
            {/* Project Details Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("clientInfo")}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("projectVilla")}</label>
                  <input 
                    type="text" 
                    {...register("project", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("systemTechScope")}</label>
                  <input 
                    type="text" 
                    {...register("systemType", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("officialStatement")}</label>
                  <textarea 
                    rows={4}
                    {...register("statement", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Handover Systems Checklist Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">{t("handoverChecklist")}</h2>
                <button
                  type="button"
                  onClick={() => append({
                    id: `c-${Date.now()}-${Math.random()}`,
                    system: "",
                    remarks: "",
                    done: true
                  })}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("addSystemRow")}
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
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t("systemName")}</label>
                      <input 
                        type="text" 
                        {...register(`checklist.${index}.system` as const, { required: true })} 
                        placeholder="e.g. Curtain System"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t("remarks")}</label>
                      <input 
                        type="text" 
                        {...register(`checklist.${index}.remarks` as const)} 
                        placeholder="e.g. 8 Curtain Motors"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`chk-${field.id}`}
                      {...register(`checklist.${index}.done` as const)} 
                      className="w-4 h-4 rounded text-purple-600 bg-zinc-900 border-zinc-800 focus:ring-purple-500 focus:ring-offset-zinc-950"
                    />
                    <label htmlFor={`chk-${field.id}`} className="text-xs text-zinc-400 font-semibold cursor-pointer">{t("markAsDone")}</label>
                  </div>
                </div>
              ))}
            </div>

            {/* Signature Pad Inputs Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("clientSignature")}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Signature Canvas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">{t("clientSignature")}</label>
                    <button 
                      type="button" 
                      onClick={() => clearSignature("client")}
                      className="text-zinc-500 hover:text-zinc-300 text-[10px] flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" /> {t("clearSig")}
                    </button>
                  </div>
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-white">
                    <SignatureCanvas 
                      ref={clientSigRef}
                      canvasProps={{ className: "sigCanvas" }}
                      onEnd={() => onSignatureEnd("client")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">{t("clientSignName")}</label>
                      <input 
                        type="text" 
                        {...register("clientName")} 
                        placeholder="Print Name"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">{t("signDate")}</label>
                      <input 
                        type="text" 
                        {...register("clientDate")} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Integrator Signature Canvas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">{t("integratorSignature")}</label>
                    <button 
                      type="button" 
                      onClick={() => clearSignature("integrator")}
                      className="text-zinc-500 hover:text-zinc-300 text-[10px] flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" /> {t("clearSig")}
                    </button>
                  </div>
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-white">
                    <SignatureCanvas 
                      ref={integratorSigRef}
                      canvasProps={{ className: "sigCanvas" }}
                      onEnd={() => onSignatureEnd("integrator")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">{t("integratorSignName")}</label>
                      <input 
                        type="text" 
                        {...register("integratorName")} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">{t("signDate")}</label>
                      <input 
                        type="text" 
                        {...register("integratorDate")} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:border-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Contact Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("footerContact")}</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("address")}</label>
                  <input 
                    type="text" 
                    {...register("address")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("website")}</label>
                  <input 
                    type="text" 
                    {...register("website")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("phone")}</label>
                  <input 
                    type="text" 
                    {...register("phone")} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Right Side: A4 Live Preview Sheet */}
        <div className={`flex-1 bg-zinc-900 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-zinc-800/80 print-area ${previewTab === "edit" ? "hidden sm:flex" : "flex"}`}>
          
          <div 
            ref={previewRef}
            id="certificate-preview-page"
            dir="ltr"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[20mm] flex flex-col justify-between relative text-xs select-none text-left"
            style={{ boxSizing: "border-box" }}
          >
            <div>
              {/* Logo Top Center */}
              <div className="flex flex-col items-center justify-center pt-2">
                <div className="relative w-28 h-28 bg-white">
                  <Image 
                    src="/logo.jpg" 
                    alt="Ruaad Smart Logo" 
                    fill 
                    className="object-contain"
                  />
                </div>
                <h1 className="text-xl font-extrabold tracking-widest text-[#0F4C81] uppercase mt-4 mb-2">
                  Work Completion Certificate
                </h1>
                <div className="h-0.5 w-16 rounded" style={{ backgroundColor: "rgba(15, 76, 129, 0.8)" }} />
              </div>

              {/* Project & Tech Block */}
              <div className="mt-8 space-y-3.5 text-zinc-800 leading-relaxed font-medium">
                <div>
                  <span className="font-bold text-zinc-500 inline-block w-24">Project:</span>
                  <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                    {formValues.project || "Mr. Mohamed Villa 1 Al Aweer - Sharjah"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 inline-block w-24">System:</span>
                  <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                    {formValues.systemType || "Extra Low Voltage & Wireless Home Automation & Network"}
                  </span>
                </div>
                
                <p className="mt-6 text-zinc-700 leading-relaxed text-justify">
                  {formValues.statement}
                </p>
              </div>

              {/* Table of Handover Systems */}
              <div className="mt-8">
                <p className="font-bold text-zinc-800 mb-3 text-[10px]">
                  The EXTRA LOW POWER systems are handed over as follows:
                </p>
                
                <table className="w-full border border-zinc-300 text-[10px] text-left border-collapse rounded overflow-hidden" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-300 font-bold text-zinc-700 text-[9px] uppercase tracking-wider">
                      <th className="p-3 border-r border-zinc-300" style={{ width: "35%" }}>System</th>
                      <th className="p-3 border-r border-zinc-300" style={{ width: "50%" }}>Remarks</th>
                      <th className="p-3 text-center" style={{ width: "15%" }}>Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.checklist.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-200">
                        <td className="p-2.5 border-r border-zinc-200 font-bold text-[#0F4C81] break-words" style={{ width: "35%" }}>{item.system || "Unnamed System"}</td>
                        <td className="p-2.5 border-r border-zinc-200 font-medium text-zinc-600 break-words" style={{ width: "50%" }}>{item.remarks || "-"}</td>
                        <td className="p-2.5 text-center font-bold text-green-600 text-sm" style={{ width: "15%" }}>
                          {item.done ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50 text-green-600 border border-green-200">✓</span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warranty text */}
              <p className="mt-6 font-bold text-zinc-900 border-l-2 border-[#0F4C81] pl-2 py-0.5">
                {formValues.warrantyText || "Warranty starts from date of this certificate."}
              </p>
            </div>

            {/* Bottom Signature Blocks & Footer */}
            <div>
              <div className="flex justify-between mt-8 gap-12 text-[10px] relative">
                
                {/* Left signature: client */}
                <div className="w-[45%] border-t border-zinc-200 pt-3 relative">
                  <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wider mb-2">Company / Client Acceptance</span>
                  
                  <div className="h-16 relative w-full border border-zinc-100 rounded flex items-center justify-center overflow-hidden" style={{ backgroundColor: "rgba(250, 250, 250, 0.3)" }}>
                    {formValues.clientSignature ? (
                      <Image 
                        src={formValues.clientSignature} 
                        alt="Client Signature" 
                        fill 
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-zinc-300 italic text-[9px] pointer-events-none">Pending signature...</span>
                    )}
                  </div>

                  <div className="mt-2 text-zinc-700 space-y-0.5">
                    <div><span className="font-semibold text-zinc-500">Name:</span> {formValues.clientName || "_________________"}</div>
                    <div><span className="font-semibold text-zinc-500">Date:</span> {formValues.clientDate || "_________________"}</div>
                  </div>
                </div>

                {/* Right signature: integrator */}
                <div className="w-[45%] border-t border-zinc-200 pt-3 relative">
                  <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wider mb-2">System Integrator: Ruaad Smart</span>
                  
                  <div className="h-16 relative w-full border border-zinc-100 rounded flex items-center justify-center overflow-hidden z-10" style={{ backgroundColor: "rgba(250, 250, 250, 0.3)" }}>
                    {formValues.integratorSignature ? (
                      <Image 
                        src={formValues.integratorSignature} 
                        alt="Integrator Signature" 
                        fill 
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-zinc-300 italic text-[9px] pointer-events-none">Pending signature...</span>
                    )}
                  </div>
                  
                  {/* Official Stamp overlay */}
                  <div className="absolute top-2 right-12 w-24 h-24 opacity-85 mix-blend-multiply pointer-events-none z-20">
                    <Image 
                      src="/stamp.png" 
                      alt="Ruaad Smart Stamp" 
                      fill 
                      className="object-contain"
                    />
                  </div>

                  <div className="mt-2 text-zinc-700 space-y-0.5 relative z-10">
                    <div><span className="font-semibold text-zinc-500">Name:</span> {formValues.integratorName || "Ruaad Smart"}</div>
                    <div><span className="font-semibold text-zinc-500">Date:</span> {formValues.integratorDate || "_________________"}</div>
                  </div>
                </div>

              </div>

              {/* Bottom footer with details */}
              <div className="border-t border-zinc-200 mt-12 pt-4 flex items-center justify-between text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">
                <div>
                  <span className="text-zinc-400 block">Address</span>
                  <span className="text-zinc-700">{formValues.address}</span>
                </div>
                <div className="text-center">
                  <span className="text-zinc-400 block">Website</span>
                  <a href={`https://${formValues.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 lowecase font-bold font-sans">
                    {formValues.website}
                  </a>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 block">Phone</span>
                  <span className="text-zinc-700">{formValues.phone}</span>
                </div>
              </div>
              
              <div className="flex justify-center mt-3 opacity-20">
                <div className="relative w-8 h-8">
                  <Image 
                    src="/logo.jpg" 
                    alt="Ruaad Smart Logo Dec" 
                    fill 
                    className="object-contain"
                  />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
