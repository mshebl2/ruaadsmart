"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Image as ImageIcon, Loader2, Download, Database, RefreshCw } from "lucide-react";
import { getSettings, saveSettings, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import Image from "next/image";

export default function SettingsPage() {
  const { t, isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [stampBase64, setStampBase64] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSettings();
        if (settings.logoBase64) setLogoBase64(settings.logoBase64);
        if (settings.stampBase64) setStampBase64(settings.stampBase64);
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "stamp") => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        if (type === "logo") setLogoBase64(base64);
        if (type === "stamp") setStampBase64(base64);
      } catch (error) {
        console.error("Error reading file:", error);
        setMessage({ type: "error", text: isRtl ? "فشل قراءة الملف." : "Failed to read file." });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings({
        logoBase64,
        stampBase64,
      });
      setMessage({ type: "success", text: isRtl ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!" });
    } catch (e) {
      console.error("Failed to save:", e);
      setMessage({ type: "error", text: isRtl ? "فشل حفظ الإعدادات." : "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Failed to export backup");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-smart-nexus-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: isRtl ? "تم تحميل النسخة الاحتياطية بنجاح!" : "Backup downloaded successfully!" });
    } catch (e) {
      console.error("Export backup error:", e);
      setMessage({ type: "error", text: isRtl ? "فشل تصدير النسخة الاحتياطية." : "Failed to export backup." });
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!confirm(isRtl ? "هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم تحديث/دمج البيانات في قاعدة البيانات." : "Are you sure you want to restore this backup?")) {
      e.target.value = "";
      return;
    }

    setRestoring(true);
    setMessage(null);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData),
      });

      if (!res.ok) throw new Error("Restore failed");

      setMessage({ type: "success", text: isRtl ? "تمت استعادة النسخة الاحتياطية بنجاح! يرجى إعادة تحميل الصفحة." : "Backup restored successfully! Please refresh the page." });
      
      // Reload settings in UI if available in backup
      const updatedSettings = await getSettings();
      if (updatedSettings.logoBase64) setLogoBase64(updatedSettings.logoBase64);
      if (updatedSettings.stampBase64) setStampBase64(updatedSettings.stampBase64);
    } catch (e) {
      console.error("Restore error:", e);
      setMessage({ type: "error", text: isRtl ? "فشل استعادة النسخة الاحتياطية. يرجى التأكد من صحة الملف." : "Failed to restore backup. Invalid JSON file." });
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-50 p-6 sm:p-12 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className={`w-5 h-5 ${isRtl ? "ml-2 rotate-180" : "mr-2"}`} />
            {isRtl ? "العودة للوحة التحكم" : "Back to Dashboard"}
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? <Loader2 className={`w-5 h-5 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} /> : <Save className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />}
            {isRtl ? "حفظ الإعدادات" : "Save Settings"}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Logo and Stamp Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-6">{isRtl ? "إعدادات الهوية والبصمة" : "Company Identity"}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Settings */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center">
                <ImageIcon className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'} text-zinc-400`} />
                {isRtl ? "شعار الشركة (Logo)" : "Company Logo"}
              </h2>
              <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-zinc-950/50 hover:bg-zinc-900/80 transition-colors">
                {logoBase64 ? (
                  <div className="relative group w-48 h-32 mb-4">
                    <Image src={logoBase64} alt="Company Logo" fill className="object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <label className="cursor-pointer bg-zinc-800 text-white px-3 py-1.5 rounded text-sm hover:bg-zinc-700">
                        {isRtl ? "تغيير" : "Change"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "logo")} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-6 w-full h-full">
                    <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                    <span className="text-sm text-zinc-400">{isRtl ? "اضغط لرفع الشعار" : "Click to upload Logo"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "logo")} />
                  </label>
                )}
              </div>
              <p className="text-xs text-zinc-500">{isRtl ? "الحجم الموصى به: 400x200 بكسل (PNG, JPG)" : "Recommended size: 400x200px (PNG, JPG)"}</p>
            </div>

            {/* Stamp Settings */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center">
                <ImageIcon className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'} text-zinc-400`} />
                {isRtl ? "ختم الشركة (Stamp)" : "Company Stamp"}
              </h2>
              <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-zinc-950/50 hover:bg-zinc-900/80 transition-colors">
                {stampBase64 ? (
                  <div className="relative group w-32 h-32 mb-4">
                    <Image src={stampBase64} alt="Company Stamp" fill className="object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <label className="cursor-pointer bg-zinc-800 text-white px-3 py-1.5 rounded text-sm hover:bg-zinc-700">
                        {isRtl ? "تغيير" : "Change"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "stamp")} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-6 w-full h-full">
                    <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                    <span className="text-sm text-zinc-400">{isRtl ? "اضغط لرفع الختم" : "Click to upload Stamp"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "stamp")} />
                  </label>
                )}
              </div>
              <p className="text-xs text-zinc-500">{isRtl ? "الحجم الموصى به: 300x300 بكسل (PNG خلفية شفافة)" : "Recommended size: 300x300px (PNG transparent)"}</p>
            </div>
          </div>
        </div>

        {/* Database Backup & Restore Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-2 flex items-center">
            <Database className={`w-6 h-6 ${isRtl ? 'ml-2' : 'mr-2'} text-blue-400`} />
            {isRtl ? "النسخ الاحتياطي واستعادة البيانات" : "Database Backup & Restore"}
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {isRtl 
              ? "يمكنك تحميل نسخة احتياطية من جميع عروض الأسعار والشهادات والسندات والإعدادات للاحتفاظ بها بأمان، أو استعادتها في أي وقت."
              : "Download a full backup of all quotations, certificates, receipts, and settings, or restore them anytime."}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {/* Download Backup */}
            <button
              onClick={handleExportBackup}
              disabled={exporting}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors border border-zinc-700 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className={`w-5 h-5 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <Download className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'} text-blue-400`} />
              )}
              {isRtl ? "تحميل نسخة احتياطية (JSON)" : "Export Backup (JSON)"}
            </button>

            {/* Restore Backup */}
            <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors border border-zinc-700 cursor-pointer disabled:opacity-50">
              {restoring ? (
                <Loader2 className={`w-5 h-5 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <RefreshCw className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'} text-emerald-400`} />
              )}
              <span>{isRtl ? "استعادة نسخة احتياطية" : "Restore Backup"}</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreBackup}
                disabled={restoring}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
