"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Download, 
  Loader2,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  FileText,
  PenTool,
  Upload
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveContract, getContract, Contract, getSettings, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";

interface ClientContractSignerProps {
  id: string;
}

export default function ClientContractSigner({ id }: ClientContractSignerProps) {
  const router = useRouter();
  const { language } = useLanguage();

  const [contract, setContract] = useState<Contract | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signed, setSigned] = useState(false);

  const [signerName, setSignerName] = useState("");
  const [signDate, setSignDate] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [firstPartyStamp, setFirstPartyStamp] = useState("");

  const previewRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [contractData, settingsData] = await Promise.all([
          getContract(id),
          getSettings()
        ]);

        if (contractData) {
          setContract(contractData);
          setSignerName(contractData.firstPartySignName || contractData.firstPartyName || "");
          setFirstPartyStamp(contractData.firstPartyStamp || "");
          
          // Set signature date to today's date if not signed, else load signed date
          if (contractData.firstPartySignature) {
            setSigned(true);
            setSignDate(contractData.firstPartySignDate || "");
            setSignatureData(contractData.firstPartySignature);
          } else {
            const today = new Date();
            const formattedDate = today.toLocaleDateString("en-GB"); // DD/MM/YYYY
            setSignDate(formattedDate);
          }
        }
        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (err) {
        console.error("Error loading contract details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (signed && signatureData && sigRef.current) {
      sigRef.current.fromDataURL(signatureData);
      sigRef.current.off(); // Disable drawing
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
      setFirstPartyStamp(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearStamp = () => {
    setFirstPartyStamp("");
  };

  const handleClearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setSignatureData("");
    }
  };

  const handleSignContract = async () => {
    if (!contract) return;
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
      const updatedContract: Contract = {
        ...contract,
        firstPartySignName: signerName,
        firstPartySignDate: signDate,
        firstPartySignature: signatureData,
        firstPartyStamp: firstPartyStamp || undefined,
        updatedAt: now
      };

      await saveContract(updatedContract);
      setContract(updatedContract);
      setSigned(true);
      
      // Disable the signature canvas drawing ability
      if (sigRef.current) {
        sigRef.current.off();
      }

      alert(language === "ar" ? "تم توقيع واعتماد العقد بنجاح!" : "Contract signed and approved successfully!");
    } catch (error) {
      console.error("Signing failed:", error);
      alert(language === "ar" ? "فشل حفظ التوقيع، يرجى المحاولة لاحقاً" : "Failed to save signature, please try again later");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current || !contract) return;
    setExporting(true);

    try {
      const cNo = contract.contractNo || "Contract";
      const filename = `Contract_${cNo}`;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.print();
        setExporting(false);
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
          // Skip cross-origin styles
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
            <title>Contract</title>
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
                zoom: 0.9 !important;
              }
              body, #contract-preview-wrapper, .font-arabic, [dir="rtl"], [dir="rtl"] * {
                font-family: 'Cairo', 'Inter', sans-serif !important;
                letter-spacing: 0 !important;
                word-spacing: normal !important;
              }
              #contract-preview-wrapper,
              #contract-preview-wrapper .pdf-page {
                zoom: 0.9 !important;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-zinc-400 mt-2 text-sm">{language === "ar" ? "جاري تحميل العقد..." : "Loading contract..."}</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <FileText className="w-16 h-16 text-zinc-600 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">{language === "ar" ? "العقد غير موجود" : "Contract Not Found"}</h1>
        <p className="text-zinc-500 text-sm max-w-md">
          {language === "ar" 
            ? "الرابط الذي تحاول الوصول إليه غير صحيح أو تم حذف العقد." 
            : "The link you are trying to access is incorrect or the contract has been deleted."}
        </p>
      </div>
    );
  }

  const page1Clauses = (contract.clauses || []).slice(0, 3);
  const page2Clauses = (contract.clauses || []).slice(3);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col" dir="rtl">
      {/* Client Sign Portal Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 py-4 px-6 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600/10 rounded-lg border border-emerald-500/20 text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">
              {language === "ar" ? "بوابة التوقيع الإلكتروني الآمن" : "Secure E-Signature Portal"}
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono">ID: {contract.id}</p>
          </div>
        </div>

        <div>
          {signed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === "ar" ? "تم توقيع العقد" : "Contract Signed"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <PenTool className="w-3.5 h-3.5 animate-pulse" />
              {language === "ar" ? "بانتظار توقيعك" : "Awaiting Signature"}
            </span>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Right Pane: A4 Preview Container */}
        <div className="flex-1 overflow-y-auto bg-zinc-900 p-4 md:p-8 flex justify-center print-area">
          <div className="w-[210mm] max-w-full flex flex-col gap-6 print:gap-0">
            <div 
              ref={previewRef}
              id="contract-preview-wrapper"
              className="flex flex-col gap-6 print:gap-0"
            >
              {/* Page 1 */}
              <div 
                id="contract-preview-page-1"
                dir="rtl"
                className="pdf-page w-[210mm] h-[296mm] bg-white text-zinc-900 pt-[10mm] pb-[8mm] px-[12mm] shadow-2xl relative flex flex-col font-arabic pdf-preview-container print-area"
                style={{ boxSizing: "border-box" }}
              >


                {/* Legal Contract Header */}
                <div className="flex items-start justify-between border-b border-zinc-200 pb-4 mb-4">
                  <div>
                    <h1 className="text-lg font-bold text-emerald-800 leading-tight">
                      {contract.title || "عقد توريد وتركيب"}
                    </h1>
                    <div className="flex flex-col gap-1 mt-1 text-[11px] text-zinc-500">
                      <div>رقم العقد: <span className="font-mono text-zinc-800 font-semibold">{contract.contractNo}</span></div>
                      <div>التاريخ: <span className="text-zinc-800 font-semibold">{contract.date}</span></div>
                    </div>
                  </div>
                  <div className="text-left">
                    {settings?.logoBase64 ? (
                      <div className="w-24 h-14 flex items-center justify-start">
                        <img 
                          src={settings.logoBase64} 
                          alt="Company Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="font-bold text-base tracking-wider text-emerald-800">
                        {contract.secondPartyName?.toUpperCase() || "SMART NEXUS"}
                      </div>
                    )}
                    <p className="text-[9px] text-zinc-400 mt-0.5">
                      {language === "ar" ? "التصميم الداخلي والخدمات الفنية" : "Interior Design & Technical Services"}
                    </p>
                  </div>
                </div>

                {/* Parties Section */}
                <div className="mb-4 space-y-1 bg-zinc-50 p-3 border border-zinc-200 rounded-lg">
                  <p className="text-xs font-semibold mb-2 border-b border-zinc-200 pb-1 text-emerald-800">أطراف الاتفاقية:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                    {/* الطرف الأول */}
                    <div className="space-y-1 leading-relaxed border-l border-zinc-200 pl-3">
                      <p className="font-bold text-zinc-800">الطرف الأول (العميل):</p>
                      <p><span className="text-zinc-500">الاسم:</span> <span className="font-semibold">{contract.firstPartyName}</span></p>
                      <p><span className="text-zinc-500">الهاتف:</span> <span className="font-mono">{contract.firstPartyPhone}</span></p>
                      <p><span className="text-zinc-500">العنوان:</span> <span>{contract.firstPartyAddress}</span></p>
                    </div>
                    {/* الطرف الثاني */}
                    <div className="space-y-1 leading-relaxed pr-3">
                      <p className="font-bold text-zinc-800">الطرف الثاني (الشركة):</p>
                      <p><span className="text-zinc-500">الاسم:</span> <span className="font-semibold">{contract.secondPartyName}</span></p>
                      <p><span className="text-zinc-500">الهاتف:</span> <span className="font-mono">{contract.secondPartyPhone}</span></p>
                      <p><span className="text-zinc-500">العنوان:</span> <span>{contract.secondPartyAddress}</span></p>
                    </div>
                  </div>
                </div>

                {/* Clauses Section */}
                <div className="flex-1 space-y-2 text-[10px] text-zinc-700 leading-normal text-justify">
                  {page1Clauses.map((clause, index) => (
                    <div key={index} className="space-y-0.5">
                      <h3 className="font-bold text-emerald-800 border-r-2 border-emerald-600 pr-2 py-0.5 text-[11px]">
                        {clause.title}
                      </h3>
                      <div className="whitespace-pre-line text-[9px] leading-normal text-zinc-600 pr-3 font-sans">
                        {clause.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page 2 */}
              <div 
                id="contract-preview-page-2"
                dir="rtl"
                className="pdf-page w-[210mm] h-[296mm] bg-white text-zinc-900 pt-[10mm] pb-[8mm] px-[12mm] shadow-2xl relative flex flex-col font-arabic pdf-preview-container print-area"
                style={{ boxSizing: "border-box" }}
              >


                {/* Clauses Section */}
                <div className="flex-1 space-y-2 text-[10px] text-zinc-700 leading-normal text-justify mb-2">
                  {page2Clauses.map((clause, index) => (
                    <div key={index} className="space-y-0.5">
                      <h3 className="font-bold text-emerald-800 border-r-2 border-emerald-600 pr-2 py-0.5 text-[11px]">
                        {clause.title}
                      </h3>
                      <div className="whitespace-pre-line text-[9px] leading-normal text-zinc-650 pr-3 font-sans">
                        {clause.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Signatures Footer */}
                <div className="border-t border-zinc-200 pt-4 mt-auto">
                  <div className="grid grid-cols-2 gap-12 text-xs">
                    {/* الطرف الأول */}
                    <div className="space-y-2">
                      <p className="font-bold text-emerald-800 border-b border-zinc-100 pb-1 text-center">الطرف الأول (العميل)</p>
                      <p className="text-[11px]"><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{signerName}</span></p>
                      <p className="text-[11px]"><span className="text-zinc-400">التاريخ:</span> <span className="font-semibold">{signDate}</span></p>
                      <div className="h-16 bg-zinc-50 border border-zinc-100 rounded flex items-center justify-center overflow-hidden p-1 relative">
                        {signatureData ? (
                          <img 
                            src={signatureData} 
                            alt="First Party Signature" 
                            className="h-full object-contain z-10"
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-400 z-10">بانتظار التوقيع</span>
                        )}
                        {firstPartyStamp && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 select-none">
                            <img 
                              src={firstPartyStamp} 
                              alt="Client Stamp" 
                              className="h-16 w-16 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* الطرف الثاني */}
                    <div className="space-y-2">
                      <p className="font-bold text-emerald-800 border-b border-zinc-100 pb-1 text-center">الطرف الثاني (الشركة)</p>
                      <p className="text-[11px]"><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{contract.secondPartySignName}</span></p>
                      <p className="text-[11px]"><span className="text-zinc-400">التاريخ:</span> <span className="font-semibold">{contract.secondPartySignDate}</span></p>
                      <div className="h-16 bg-zinc-50 border border-zinc-100 rounded flex items-center justify-center overflow-hidden p-1 relative">
                        {contract.secondPartySignature ? (
                          <img 
                            src={contract.secondPartySignature} 
                            alt="Second Party Signature" 
                            className="h-full object-contain z-10"
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-400 z-10">بانتظار التوقيع</span>
                        )}
                        {settings?.stampBase64 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 select-none">
                            <img 
                              src={settings.stampBase64} 
                              alt="Company Stamp" 
                              className="h-16 w-16 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Pane: Interactive E-Signature Pad Sidebar */}
        <div className="w-full lg:w-[400px] bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-850 p-6 flex flex-col justify-between overflow-y-auto no-print">
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-500" />
                {language === "ar" ? "اعتماد وتوقيع الاتفاقية" : "Sign Agreement"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {language === "ar" 
                  ? "يرجى مراجعة تفاصيل بنود العقد جيداً على اليمين، ثم أدخل اسمك الكامل وارسم توقيعك في الصندوق المخصص لحفظ العقد رسمياً." 
                  : "Please review the contract clauses on the right, write your full name, and draw your signature below to execute the contract."}
              </p>
            </div>

            {/* Input Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400">
                {language === "ar" ? "اسم الموقّع (الطرف الأول):" : "Signatory Full Name (Client):"}
              </label>
              <input 
                type="text" 
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                disabled={signed}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-600 transition-colors disabled:opacity-50"
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 outline-none select-none opacity-60"
              />
            </div>

            {/* Signature Draw Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-400">
                  {language === "ar" ? "شاشة رسم التوقيع:" : "Draw Signature:"}
                </label>
                {!signed && signatureData && (
                  <button 
                    type="button" 
                    onClick={handleClearSignature}
                    className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {language === "ar" ? "مسح التوقيع" : "Clear"}
                  </button>
                )}
              </div>
              <div className="bg-white rounded-lg overflow-hidden border border-zinc-800 p-0.5">
                <SignatureCanvas 
                  ref={sigRef}
                  onEnd={handleSignatureEnd}
                  canvasProps={{ className: "w-full h-36" }}
                />
              </div>
            </div>

            {/* Stamp / Logo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400">
                {language === "ar" ? "ختم أو شعار العميل (اختياري):" : "Client Stamp/Logo (Optional):"}
              </label>
              {!signed ? (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-zinc-800 border-dashed rounded-lg cursor-pointer hover:bg-zinc-900/40 hover:border-zinc-700 transition-colors relative overflow-hidden">
                    {firstPartyStamp ? (
                      <>
                        <img 
                          src={firstPartyStamp} 
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
                          className="absolute top-1 left-1 bg-red-650/85 hover:bg-red-600 text-white rounded p-1 text-[10px] z-20 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-5 h-5 text-zinc-500 mb-1" />
                        <p className="text-xs text-zinc-500">
                          {language === "ar" ? "اضغط لرفع الختم/الشعار" : "Click to upload stamp/logo"}
                        </p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">PNG, JPG (Max 2MB)</p>
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
                firstPartyStamp ? (
                  <div className="h-20 bg-zinc-900/60 border border-zinc-850 rounded-lg flex items-center justify-center p-2">
                    <img 
                      src={firstPartyStamp} 
                      alt="Uploaded Client Stamp" 
                      className="h-full object-contain opacity-70"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-650 italic">
                    {language === "ar" ? "لم يتم إرفاق ختم للعميل" : "No client stamp uploaded"}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {!signed ? (
              <button
                onClick={handleSignContract}
                disabled={saving || !signerName.trim() || !signatureData}
                className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === "ar" ? "جاري حفظ التوقيع..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4" />
                    {language === "ar" ? "توقيع واعتماد العقد" : "Approve & Sign Contract"}
                  </>
                )}
              </button>
            ) : (
              <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-400">
                  {language === "ar" ? "تم توقيع العقد بنجاح!" : "Contract Signed Successfully!"}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {language === "ar" 
                    ? "يمكنك الآن تحميل نسختك الرسمية بصيغة PDF." 
                    : "You can now download your official PDF version."}
                </p>
              </div>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="w-full py-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === "ar" ? "جاري تصدير PDF..." : "Exporting..."}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {language === "ar" ? "تحميل نسخة العقد PDF" : "Download PDF Copy"}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
