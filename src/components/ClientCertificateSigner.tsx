"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Download, 
  Loader2,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Award,
  PenTool,
  Upload,
  AlertCircle,
  Check
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveCertificate, getCertificate, Certificate, getSettings, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";

interface ClientCertificateSignerProps {
  id: string;
}

export default function ClientCertificateSigner({ id }: ClientCertificateSignerProps) {
  const { language, t } = useLanguage();

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signed, setSigned] = useState(false);

  const [signerName, setSignerName] = useState("");
  const [signDate, setSignDate] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [clientStamp, setClientStamp] = useState("");

  const previewRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [certData, settingsData] = await Promise.all([
          getCertificate(id),
          getSettings()
        ]);

        if (certData) {
          setCertificate(certData);
          setSignerName(certData.clientName || "");
          setClientStamp(certData.clientStamp || "");
          
          if (certData.clientSignature) {
            setSigned(true);
            setSignDate(certData.clientDate || "");
            setSignatureData(certData.clientSignature);
          } else {
            const today = new Date();
            const formattedDate = today.toLocaleDateString("en-GB");
            setSignDate(formattedDate);
          }
        }
        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (err) {
        console.error("Error loading certificate:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (signed && signatureData && sigRef.current) {
      const timer = setTimeout(() => {
        if (sigRef.current) {
          sigRef.current.fromDataURL(signatureData);
          sigRef.current.off();
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [signed, signatureData]);

  const handleSignatureEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setSignatureData(sigRef.current.toDataURL("image/png"));
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(language === "ar" ? "حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت." : "Image size is too large. Please select an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setClientStamp(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearStamp = () => {
    setClientStamp("");
  };

  const handleClearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setSignatureData("");
    }
  };

  const handleSignCertificate = async () => {
    if (!certificate) return;
    if (!signerName.trim()) {
      alert(language === "ar" ? "يرجى كتابة الاسم الكامل للموقّع" : "Please enter the signatory's full name");
      return;
    }
    if (!signatureData) {
      alert(language === "ar" ? "يرجى رسم التوقيع أولاً" : "Please draw your signature first");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const todayFormatted = new Date().toLocaleDateString("en-GB");
      const updatedCert: Certificate = {
        ...certificate,
        clientName: signerName,
        clientDate: todayFormatted,
        clientSignature: signatureData,
        clientStamp: clientStamp || undefined,
        updatedAt: now
      };

      await saveCertificate(updatedCert);
      setCertificate(updatedCert);
      setSignDate(todayFormatted);
      setSigned(true);
      
      if (sigRef.current) {
        sigRef.current.off();
      }

      alert(language === "ar" ? "تم توقيع واعتماد شهادة إنجاز العمل بنجاح! 🎉" : "Certificate signed and approved successfully!");
    } catch (error) {
      console.error("Signing failed:", error);
      alert(language === "ar" ? "فشل حفظ التوقيع، يرجى المحاولة لاحقاً" : "Failed to save signature, please try again later");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current || !certificate) return;
    setExporting(true);

    try {
      const proj = certificate.project || "Certificate";
      const filename = `Work_Completion_Certificate_${proj.replace(/[^a-zA-Z0-9]/g, "_")}`;

      let cssStyles = "";
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          for (let j = 0; j < sheet.cssRules.length; j++) {
            cssStyles += sheet.cssRules[j].cssText + "\n";
          }
        } catch { /* skip */ }
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
            <title>Work Completion Certificate</title>
            ${fontLinks}
            <style>
              ${cssStyles}
              :root { 
                --font-cairo: 'Cairo', sans-serif !important; 
                --font-inter: 'Inter', sans-serif !important;
              }
              body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              body, * { font-family: 'Cairo', 'Inter', sans-serif !important; letter-spacing: 0 !important; }
              .no-print, header { display: none !important; }
              #certificate-preview-page { width: 210mm !important; min-width: 210mm !important; transform: none !important; box-shadow: none !important; border: none !important; }
            </style>
          </head>
          <body>
            <div style="width:210mm;margin:0 auto;">${previewRef.current.outerHTML}</div>
          </body>
        </html>
      `;

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: fullHtml, filename }),
      });

      if (!response.ok) throw new Error('PDF API failed');

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
      console.error("PDF download failed, falling back to print:", error);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-zinc-400 text-sm font-medium">{language === "ar" ? "جاري تحميل الشهادة..." : "Loading certificate..."}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="p-4 bg-red-950/30 border border-red-900 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-white">{language === "ar" ? "خطأ في التحميل" : "Loading Error"}</h1>
        <p className="text-zinc-400 text-sm max-w-md">
          {language === "ar" ? "حدث خطأ أثناء تحميل بيانات الشهادة. يرجى التحقق من الاتصال." : "An error occurred while loading the certificate. Please check your connection."}
        </p>
        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors">
          {language === "ar" ? "إعادة المحاولة" : "Try Again"}
        </button>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-full">
          <Award className="w-12 h-12 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-white">{language === "ar" ? "الشهادة غير موجودة" : "Certificate Not Found"}</h1>
        <p className="text-zinc-400 text-sm max-w-md">
          {language === "ar" 
            ? "الرابط الذي تحاول الوصول إليه غير صحيح أو تم حذف الشهادة." 
            : "The link you are trying to access is incorrect or the certificate has been deleted."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-150 flex flex-col" dir="rtl">
      {/* Sticky Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 py-3 px-4 sm:px-6 flex items-center justify-between no-print shadow-md sticky top-0 z-20" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-950/40 rounded-lg border border-purple-900 text-purple-400 flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-white">
              {language === "ar" ? "بوابة توقيع شهادة إنجاز العمل" : "Work Completion Certificate Signing Portal"}
            </h1>
            <p className="text-xs text-zinc-500 hidden sm:block truncate max-w-xs">
              {certificate.project}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {signed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === "ar" ? "تم التوقيع والاعتماد" : "Signed"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-400 border border-amber-900">
              <PenTool className="w-3.5 h-3.5 animate-pulse" />
              {language === "ar" ? "بانتظار توقيعك" : "Awaiting Signature"}
            </span>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Right Pane: A4 Preview Container */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-2 sm:p-6 md:p-8 flex justify-center print-area printable-area">
          <div className="w-full max-w-[210mm] sm:w-[210mm] flex flex-col gap-6 print:gap-0">
            <div 
              ref={previewRef}
              id="certificate-preview-wrapper"
              className="flex flex-col gap-6 print:gap-0"
            >
              {/* Certificate Page */}
              <div 
                id="certificate-preview-page"
                dir="ltr"
                className="w-full max-w-[210mm] sm:w-[210mm] bg-white text-zinc-900 p-6 sm:p-10 md:p-[15mm] shadow-md rounded-lg sm:rounded-none relative flex flex-col justify-start gap-4 text-xs text-left print-area printable-area print:h-[297mm]"
                style={{ boxSizing: "border-box", direction: "ltr" }}
              >
                {/* Logo Top Center */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="w-24 h-24 flex items-center justify-center bg-white">
                    <img 
                      src={settings?.logoBase64 || "/logo.jpg"} 
                      alt="Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <h1 className="text-lg font-extrabold tracking-widest text-[#0F4C81] uppercase mt-3 mb-1">
                    Work Completion Certificate
                  </h1>
                  <div className="h-0.5 w-12 rounded bg-[#0F4C81]/80" />
                </div>

                {/* Project & Tech Block */}
                <div className="mt-4 space-y-2 text-zinc-800 leading-normal font-medium text-[11px]">
                  <div>
                    <span className="font-bold text-zinc-500 inline-block w-20">Project:</span>
                    <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                      {certificate.project}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 inline-block w-20">System:</span>
                    <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                      {certificate.systemType}
                    </span>
                  </div>
                  
                  <p className="mt-4 text-zinc-700 leading-relaxed text-justify text-[10.5px]">
                    {certificate.statement}
                  </p>
                </div>

                {/* Table of Handover Systems */}
                <div className="mt-4">
                  <p className="font-bold text-zinc-800 mb-2 text-[9.5px]">
                    The EXTRA LOW POWER systems are handed over as follows:
                  </p>
                  
                  <table className="w-full border border-zinc-300 text-[9.5px] text-left border-collapse rounded overflow-hidden" style={{ tableLayout: "fixed" }}>
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-300 font-bold text-zinc-700 text-[8.5px] uppercase tracking-wider">
                        <th className="p-2.5 border-r border-zinc-300" style={{ width: "35%" }}>System</th>
                        <th className="p-2.5 border-r border-zinc-300" style={{ width: "50%" }}>Remarks</th>
                        <th className="p-2.5 text-center" style={{ width: "15%" }}>Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(certificate.checklist || []).map((item) => (
                        <tr key={item.id} className="border-b border-zinc-200">
                          <td className="p-2 border-r border-zinc-200 font-bold text-[#0F4C81] break-words" style={{ width: "35%" }}>{item.system}</td>
                          <td className="p-2 border-r border-zinc-200 font-medium text-zinc-650 break-words" style={{ width: "50%" }}>{item.remarks || "-"}</td>
                          <td className="p-2 text-center font-bold text-green-600 text-xs" style={{ width: "15%" }}>
                            {item.done ? (
                              <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-green-50 text-green-600 border border-green-200">✓</span>
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
                <p className="mt-4 font-bold text-zinc-900 border-l-2 border-[#0F4C81] pl-2 py-0.5 text-[10px]">
                  {certificate.warrantyText}
                </p>

                {/* Bottom Signature Blocks & Footer */}
                <div className="mt-auto pt-6">
                  <div className="flex justify-between gap-8 text-[9px] relative">
                    
                    {/* Left signature: client */}
                    <div className="w-[45%] border-t border-zinc-200 pt-2.5 relative">
                      <span className="font-bold text-zinc-400 block uppercase text-[7.5px] tracking-wider mb-1.5">Company / Client Acceptance</span>
                      
                      <div className="flex gap-2 items-center justify-center mt-1">
                        {/* Signature Box */}
                        <div className="flex-1 h-12 border border-zinc-150 rounded-md flex items-center justify-center bg-zinc-50/50 overflow-hidden">
                          {signatureData ? (
                            <img src={signatureData} alt="Client Signature" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-[8px] text-zinc-300 italic">Pending Signature</span>
                          )}
                        </div>
                        {/* Stamp Box */}
                        {clientStamp && (
                          <div className="w-14 h-12 border border-dashed border-zinc-150 rounded-md flex items-center justify-center bg-white overflow-hidden p-0.5">
                            <img src={clientStamp} alt="Client Stamp" className="h-full object-contain opacity-75" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-zinc-700 space-y-0.5 text-[9px]">
                        <div><span className="font-semibold text-zinc-500">Name:</span> {signerName || "_________________"}</div>
                        <div><span className="font-semibold text-zinc-500">Date:</span> {signDate || "_________________"}</div>
                      </div>
                    </div>

                    {/* Right signature: integrator */}
                    <div className="w-[45%] border-t border-zinc-200 pt-2.5 relative">
                      <span className="font-bold text-zinc-400 block uppercase text-[7.5px] tracking-wider mb-1.5">System Integrator</span>
                      
                      <div className="flex gap-2 items-center justify-center mt-1">
                        {/* Signature Box */}
                        <div className="flex-1 h-12 border border-zinc-150 rounded-md flex items-center justify-center bg-zinc-50/50 overflow-hidden">
                          {certificate.integratorSignature ? (
                            <img src={certificate.integratorSignature} alt="Integrator Signature" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-[8px] text-zinc-300 italic">Pending Signature</span>
                          )}
                        </div>
                        {/* Stamp Box */}
                        {settings?.stampBase64 && (
                          <div className="w-14 h-12 border border-dashed border-zinc-150 rounded-md flex items-center justify-center bg-white overflow-hidden p-0.5">
                            <img src={settings.stampBase64} alt="Company Stamp" className="h-full object-contain opacity-75" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-zinc-700 space-y-0.5 text-[9px]">
                        <div><span className="font-semibold text-zinc-500">Name:</span> {certificate.integratorName || "_________________"}</div>
                        <div><span className="font-semibold text-zinc-500">Date:</span> {certificate.integratorDate || "_________________"}</div>
                      </div>
                    </div>

                  </div>

                  {/* Bottom footer with details */}
                  <div className="border-t border-zinc-200 mt-8 pt-2 flex items-center justify-between text-[7px] text-zinc-400 uppercase tracking-wider font-semibold">
                    <div>
                      <span className="text-zinc-300 block">Address</span>
                      <span className="text-zinc-600">{certificate.address}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-zinc-300 block">Website</span>
                      <span className="text-blue-500 lowecase font-bold font-sans">{certificate.website}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-300 block">Phone</span>
                      <span className="text-zinc-600">{certificate.phone}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ── Signature Sidebar ── */}
        <div className="w-full lg:w-[380px] bg-zinc-900 border-t lg:border-t-0 lg:border-r border-zinc-800 flex flex-col no-print shadow-xl">
          {/* Sidebar Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-850 bg-zinc-900/50 flex-shrink-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PenTool className="w-4 h-4 text-purple-400" />
              {language === "ar" ? "اعتماد وتوقيع شهادة الإنجاز" : "Sign Completion Certificate"}
            </h2>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {language === "ar" 
                ? "راجع تفاصيل البنود والأنظمة، ثم أدخل اسمك وارسم توقيعك لإتمام الاعتماد."
                : "Review the checklist items and systems, then enter your name and draw your signature."}
            </p>
          </div>
          {/* Sidebar Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Already Signed Banner */}
            {signed && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">{language === "ar" ? "تم التوقيع بنجاح!" : "Certificate Signed!"}</p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">{language === "ar" ? `تاريخ التوقيع: ${signDate}` : `Signed on: ${signDate}`}</p>
                </div>
              </div>
            )}

            {/* Input Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400">
                {language === "ar" ? "اسم الموقّع (العميل):" : "Signatory Full Name (Client):"}
              </label>
              <input 
                type="text" 
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                disabled={signed}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                placeholder={language === "ar" ? "اكتب اسمك الكامل هنا" : "Enter your full name"}
              />
            </div>

            {/* Input Date */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400">
                {language === "ar" ? "تاريخ التوقيع:" : "Signature Date:"}
              </label>
              <input 
                type="text" 
                value={signDate}
                disabled
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 outline-none select-none opacity-80"
              />
            </div>

            {/* Signature Canvas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-400">
                  {language === "ar" ? "التوقيع:" : "Signature:"}
                  {!signed && <span className="text-red-500 mr-1">*</span>}
                </label>
                {!signed && signatureData && (
                  <button 
                    type="button" 
                    onClick={handleClearSignature}
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {language === "ar" ? "مسح" : "Clear"}
                  </button>
                )}
              </div>
              <div className={`rounded-xl overflow-hidden border-2 transition-colors ${signed ? "border-emerald-900 bg-emerald-950/20" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"}`}>
                <SignatureCanvas 
                  ref={sigRef}
                  onEnd={handleSignatureEnd}
                  canvasProps={{
                    className: "w-full",
                    style: { height: "140px", touchAction: "none" }
                  }}
                  backgroundColor="rgba(0,0,0,0)"
                />
              </div>
              {!signed && !signatureData && (
                <p className="text-[9.5px] text-zinc-500 text-center">
                  {language === "ar" ? "ارسم توقيعك هنا بالإصبع أو الماوس" : "Draw your signature with finger or mouse"}
                </p>
              )}
            </div>

            {/* Stamp / Logo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400">
                {language === "ar" ? "ختم أو شعار العميل (اختياري):" : "Client Stamp/Logo (Optional):"}
              </label>
              {!signed ? (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-zinc-800 border-dashed rounded-lg cursor-pointer hover:bg-zinc-900/50 hover:border-zinc-700 transition-colors relative overflow-hidden">
                    {clientStamp ? (
                      <>
                        <img 
                          src={clientStamp} 
                          alt="Stamp Preview" 
                          className="h-full object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            clearStamp();
                          }}
                          className="absolute top-1 left-1 bg-red-655 hover:bg-red-700 text-white rounded p-1 text-[10px] z-20 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-5 h-5 text-zinc-500 mb-1" />
                        <p className="text-xs text-zinc-400">
                          {language === "ar" ? "اضغط لرفع الختم/الشعار" : "Click to upload stamp/logo"}
                        </p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">PNG, JPG (Max 2MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleStampUpload}
                      className="hidden" 
                    />
                  </label>
                </div>
              ) : (
                clientStamp ? (
                  <div className="h-16 bg-zinc-905 border border-zinc-800 rounded-xl flex items-center justify-center p-2">
                    <img src={clientStamp} alt="Uploaded Client Stamp" className="h-full object-contain opacity-80" />
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-555 italic">
                    {language === "ar" ? "لم يتم إرفاق ختم للعميل" : "No client stamp uploaded"}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Fixed Action Buttons */}
          <div className="p-4 sm:p-5 border-t border-zinc-850 space-y-3 bg-zinc-900 flex-shrink-0">
            {!signed ? (
              <button
                onClick={handleSignCertificate}
                disabled={saving || !signerName.trim() || !signatureData}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === "ar" ? "جاري الحفظ..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4" />
                    {language === "ar" ? "توقيع واعتماد الشهادة" : "Sign & Approve Certificate"}
                  </>
                )}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-emerald-300">
                  {language === "ar" ? "تم الاعتماد بنجاح" : "Signed & Approved"}
                </p>
              </div>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="w-full py-3 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-zinc-850 shadow-sm disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === "ar" ? "جاري التصدير..." : "Exporting..."}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {language === "ar" ? "تحميل نسخة PDF" : "Download PDF"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
