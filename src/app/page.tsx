"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  FileText, 
  Award, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  TrendingUp, 
  DollarSign,
  Activity,
  ChevronRight,
  ExternalLink,
  Loader2,
  Paperclip,
  Languages,
  Globe,
  LogOut
} from "lucide-react";
import { 
  getAllQuotations, 
  getAllCertificates, 
  deleteQuotation, 
  deleteCertificate,
  Quotation,
  Certificate 
} from "@/lib/db";
import { useLanguage } from "@/lib/i18n";

export default function Dashboard() {
  const { t, language, setLanguage, isRtl } = useLanguage();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"quotations" | "certificates">("quotations");

  useEffect(() => {
    async function loadData() {
      try {
        const [quotes, certs] = await Promise.all([
          getAllQuotations(),
          getAllCertificates()
        ]);
        setQuotations(quotes);
        setCertificates(certs);
      } catch (error) {
        console.error("Failed to load documents from IndexedDB:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDeleteQuotation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف عرض السعر هذا؟" : "Are you sure you want to delete this quotation?")) {
      await deleteQuotation(id);
      setQuotations(quotations.filter((q) => q.id !== id));
    }
  };

  const handleDeleteCertificate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف شهادة إتمام العمل هذه؟" : "Are you sure you want to delete this work completion certificate?")) {
      await deleteCertificate(id);
      setCertificates(certificates.filter((c) => c.id !== id));
    }
  };

  // Calculate statistics
  const totalQuotationsVal = quotations.reduce((acc, q) => acc + q.total, 0);
  const totalCostVal = quotations.reduce((acc, q) => {
    const qCost = q.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.qty || 0)), 0);
    return acc + qCost;
  }, 0);
  const totalMarginVal = totalQuotationsVal - totalCostVal;

  const formattedTotalVal = new Intl.NumberFormat(language === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2
  }).format(totalQuotationsVal);

  const filteredQuotations = quotations.filter((q) => 
    q.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.quotationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.projectReference && q.projectReference.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCertificates = certificates.filter((c) => 
    c.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.systemType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-12">
      {/* Premium Header Grid */}
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-950/20 via-zinc-950 to-zinc-950 border-b border-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 p-1 flex items-center justify-center">
              <Image 
                src="/logo.jpg" 
                alt="Ruaad Smart Logo" 
                fill 
                className="object-contain rounded-lg"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white font-arabic">{t("dashboardTitle")}</h1>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">PWA</span>
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">RUAAD SMART SMART MACHINE TRADING LLC</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Language Switcher Button */}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-all duration-300"
            >
              <Globe className="w-4 h-4 text-blue-400" />
              <span>{language === "ar" ? "English" : "العربية"}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-950/15 border border-red-900/30 hover:bg-red-950/35 hover:border-red-900/60 text-red-400 font-semibold text-xs transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("logoutBtn")}</span>
            </button>

            <Link 
              href="/quotation/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-sm transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.2)]"
            >
              <Plus className="w-4.5 h-4.5" />
              {t("newQuotation")}
            </Link>
            <Link 
              href="/certificate/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 text-white font-medium text-sm transition-all duration-300 hover:scale-[1.02]"
            >
              <Plus className="w-4.5 h-4.5" />
              {t("newCertificate")}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-400">{t("totalQuotations")}</p>
            <p className="text-3xl font-bold mt-2 text-white">{quotations.length}</p>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-2 font-medium">
              <Activity className="w-3.5 h-3.5" />
              <span>{t("localDBSave")}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-400">{t("pipelineValue")}</p>
            <p className="text-3xl font-bold mt-2 text-white">{formattedTotalVal}</p>
            <div className="flex items-center gap-3 text-xs text-emerald-400 mt-2 font-medium">
              <span>{t("margin")}: {totalMarginVal.toLocaleString("en-AE", { maximumFractionDigits: 1 })} AED</span>
              <span className="opacity-40">|</span>
              <span>{t("cost")}: {totalCostVal.toLocaleString("en-AE", { maximumFractionDigits: 1 })} AED</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all duration-300 sm:col-span-2 lg:col-span-1">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-400">{t("completedCerts")}</p>
            <p className="text-3xl font-bold mt-2 text-white">{certificates.length}</p>
            <div className="flex items-center gap-1.5 text-xs text-purple-400 mt-2 font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>{t("signedHandover")}</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 bg-zinc-900/40 backdrop-blur border border-zinc-800/60 p-4 rounded-xl">
          <div className="flex items-center bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-lg flex-1 max-w-md focus-within:border-zinc-700 transition-colors">
            <Search className="w-4 h-4 text-zinc-400 mr-2" />
            <input 
              type="text" 
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm text-zinc-200 outline-none w-full placeholder-zinc-500"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("quotations")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "quotations" 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("quotationsTab")} ({filteredQuotations.length})
            </button>
            <button
              onClick={() => setActiveTab("certificates")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "certificates" 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("certificatesTab")} ({filteredCertificates.length})
            </button>
          </div>
        </div>

        {/* List Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 border border-zinc-900 rounded-2xl bg-zinc-900/20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-zinc-400 mt-2 text-sm">Loading documents...</p>
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl overflow-hidden">
            {activeTab === "quotations" ? (
              filteredQuotations.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-300">{t("noQuotesFound")}</h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
                    {searchQuery ? "No local quotations match your search query." : "Get started by creating your first professional smart home quotation."}
                  </p>
                  {!searchQuery && (
                    <Link 
                      href="/quotation/new" 
                      className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t("newQuotation")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-xs text-zinc-400 font-semibold tracking-wider">
                        <th className="py-4 px-6">{t("quoteNo")}</th>
                        <th className="py-4 px-6">{t("clientName")}</th>
                        <th className="py-4 px-6">{t("date")}</th>
                        <th className="py-4 px-6 text-right">{t("total")}</th>
                        <th className="py-4 px-6 text-right">{t("cost")}</th>
                        <th className="py-4 px-6 text-right">{t("margin")}</th>
                        <th className="py-4 px-6 text-center">{t("invoicesAttached")}</th>
                        <th className="py-4 px-6 text-center">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-sm">
                      {filteredQuotations.map((quote) => {
                        const qCost = quote.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.qty || 0)), 0);
                        const qMargin = quote.total - qCost;
                        const qMarginPercent = quote.total > 0 ? (qMargin / quote.total) * 100 : 0;
                        const hasInvoices = (quote.purchaseInvoices?.length || 0) > 0;
                        
                        return (
                          <tr key={quote.id} className="hover:bg-zinc-900/30 transition-colors group">
                            <td className="py-4 px-6 font-mono font-medium text-white group-hover:text-blue-400 transition-colors">
                              {quote.quotationNo}
                            </td>
                            <td className="py-4 px-6 font-medium text-zinc-200">
                              {quote.clientName}
                            </td>
                            <td className="py-4 px-6 text-zinc-400">
                              {quote.date}
                            </td>
                            <td className="py-4 px-6 text-right font-semibold text-zinc-200">
                              {quote.total.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED
                            </td>
                            <td className="py-4 px-6 text-right font-mono text-zinc-400">
                              {qCost > 0 ? `${qCost.toLocaleString("en-AE", { maximumFractionDigits: 1 })} AED` : "-"}
                            </td>
                            <td className={`py-4 px-6 text-right font-semibold font-mono ${qMargin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {qCost > 0 ? (
                                <div>
                                  <div>{qMargin.toLocaleString("en-AE", { maximumFractionDigits: 1 })} AED</div>
                                  <div className="text-[10px] opacity-75">({qMarginPercent.toFixed(0)}%)</div>
                                </div>
                              ) : "-"}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {hasInvoices ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <Paperclip className="w-3 h-3" />
                                  {quote.purchaseInvoices?.length}
                                </span>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Link 
                                  href={`/quotation/${quote.id}`}
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                                  title={t("editTitle")}
                                >
                                  <Edit className="w-4 h-4" />
                                </Link>
                                <button 
                                  onClick={(e) => handleDeleteQuotation(quote.id, e)}
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-red-400/80 hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/10 transition-all"
                                  title={t("deleteTitle")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              filteredCertificates.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Award className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-300">{t("noCertsFound")}</h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
                    {searchQuery ? "No completion certificates match your search query." : "Document your handovers and get client approvals using work completion certificates."}
                  </p>
                  {!searchQuery && (
                    <Link 
                      href="/certificate/new" 
                      className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t("newCertificate")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-xs text-zinc-400 font-semibold tracking-wider">
                        <th className="py-4 px-6">{t("projectClient")}</th>
                        <th className="py-4 px-6">{t("systemTechnology")}</th>
                        <th className="py-4 px-6">{t("clientName")}</th>
                        <th className="py-4 px-6">{t("completionDate")}</th>
                        <th className="py-4 px-6 text-center">{t("status")}</th>
                        <th className="py-4 px-6 text-center">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-sm">
                      {filteredCertificates.map((cert) => (
                        <tr key={cert.id} className="hover:bg-zinc-900/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-white group-hover:text-purple-400 transition-colors">
                            {cert.project}
                          </td>
                          <td className="py-4 px-6 text-zinc-200">
                            {cert.systemType}
                          </td>
                          <td className="py-4 px-6 text-zinc-400">
                            {cert.clientName}
                          </td>
                          <td className="py-4 px-6 text-zinc-400">
                            {cert.integratorDate || cert.createdAt.split("T")[0]}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {t("handedOver")}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link 
                                href={`/certificate/${cert.id}`}
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                                title={t("editTitle")}
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={(e) => handleDeleteCertificate(cert.id, e)}
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-red-400/80 hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/10 transition-all"
                                title={t("deleteTitle")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 text-center text-xs text-zinc-600 mt-16 font-arabic">
        <p>رواد سمارت للأجهزة الذكية وكاميرات المراقبة © {new Date().getFullYear()}</p>
        <p className="mt-1 font-sans">Developed offline-first. All data is saved on this browser device.</p>
      </footer>
    </div>
  );
}
