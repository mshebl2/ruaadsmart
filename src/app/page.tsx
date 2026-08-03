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
  LogOut,
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
  PenTool,
  Download
} from "lucide-react";
import { 
  getAllQuotations, 
  getAllCertificates, 
  deleteQuotation, 
  deleteCertificate,
  Quotation,
  Certificate,
  getAllReceipts,
  deleteReceipt,
  Receipt,
  getSettings,
  Contract,
  getAllContracts,
  deleteContract,
  saveQuotation,
  saveContract
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
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"quotations" | "invoices" | "contracts" | "certificates" | "receipts">("quotations");
  const [settingsLogo, setSettingsLogo] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [quotes, certs, recs, contrs, settings] = await Promise.all([
          getAllQuotations(),
          getAllCertificates(),
          getAllReceipts(),
          getAllContracts(),
          getSettings()
        ]);
        setQuotations(quotes);
        setCertificates(certs);
        setReceipts(recs);
        setContracts(contrs);
        if (settings?.logoBase64) setSettingsLogo(settings.logoBase64);
      } catch (error) {
        console.error("Failed to load documents:", error);
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

  const handleDeleteReceipt = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف سند القبض هذا؟" : "Are you sure you want to delete this receipt voucher?")) {
      await deleteReceipt(id);
      setReceipts(receipts.filter((r) => r.id !== id));
    }
  };

  const handleDeleteContract = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا العقد؟" : "Are you sure you want to delete this contract?")) {
      await deleteContract(id);
      setContracts(contracts.filter((c) => c.id !== id));
    }
  };

  const handleStatusChange = async (quote: Quotation, newStatus: 'pending' | 'approved' | 'executed' | 'rejected' | 'cancelled') => {
    try {
      const updatedQuote = {
        ...quote,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      await saveQuotation(updatedQuote);

      // If approved, trigger auto contract generation
      if (newStatus === 'approved') {
        const existingContracts = await getAllContracts();
        const alreadyHasContract = existingContracts.some(c => c.quotationId === quote.id);
        
        if (!alreadyHasContract) {
          const randomNo = "C" + String(Math.floor(Math.random() * 90000) + 10000);
          const itemLines = quote.items.map(
            (item, i) => `${i + 1} - ${item.description.split('\n')[0]} (الكمية: ${item.qty} ${item.unit})`
          ).join('\n');

          const isCctvOnly = quote.items.every(item => 
            item.description.toLowerCase().includes('cctv') || 
            item.description.toLowerCase().includes('camera') || 
            item.description.includes('كاميرا')
          );
          const isSmartOnly = quote.items.every(item => 
            !item.description.toLowerCase().includes('cctv') && 
            !item.description.toLowerCase().includes('camera') && 
            !item.description.includes('كاميرا')
          );
          
          let generatedTitle = "عقد توريد وتركيب أنظمة كاميرات مراقبة والبيت الذكي";
          if (isCctvOnly) generatedTitle = "عقد توريد وتركيب أنظمة كاميرات مراقبة";
          else if (isSmartOnly) generatedTitle = "عقد توريد وتركيب أنظمة البيت الذكي (Smart Home)";

          const contractClauses = [
            {
              title: "البند الأول: نطاق العمل والخدمات",
              content: `1 - يتعهد الطرف الثاني بتوريد وتركيب وتشغيل نظام متكامل في موقع الطرف الأول وفقًا لعرض السعر رقم (${quote.quotationNo}) والبنود المذكورة أدناه:
${itemLines}
2 - يقوم الطرف الثاني بتدريب الطرف الأول أو من يرشحه على كيفية تشغيل النظام وإعداداته.
3 - يقوم الطرف الثانى بضبط زوايا الرؤية، إعدادات التشغيل، وكشف الحركة والبرمجة بما يتوافق مع متطلبات العميل.
4 - يقوم الطرف الثانى بتوصيل وتهيئة الأجهزة بالشبكة الداخلية أو الإنترنت وضمان التشغيل الكامل للنظام.`
            },
            {
              title: "البند الثاني: التكاليف وطريقة الدفع",
              content: `1. التكلفة الإجمالية:
تبلغ قيمة العقد الإجمالية (${quote.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} درهم إماراتي) شاملة توريد المعدات والتركيب والتشغيل.
2. جدول الدفع:
- 30% مقدّم عند توقيع العقد.
- 30% بعد توريد المعدات.
- 30% بعد إتمام التركيب.
- 10% عند تجربة النظام والتشغيل بنجاح.
3. الضرائب والرسوم:
يتحمل الطرف الأول أية ضرائب أو رسوم حكومية أو بلدية تتعلق بتنفيذ العقد.`
            },
            {
              title: "البند الثالث: الضمان والصيانة",
              content: `1. مدة الضمان:
يضمن الطرف الثاني المعدات لمدة 3 سنوات من تاريخ التسليم النهائي.
2. شروط الضمان:
يشمل الضمان إصلاح أو استبدال أي قطعة بها عيب مصنعي دون أي تكلفة إضافية.
3. خدمات ما بعد البيع:
يقدم الطرف الثاني خدمات الصيانة الدورية عند الطلب، مقابل رسوم يتم الاتفاق عليها لاحقًا (إن وجدت).`
            },
            {
              title: "البند الرابع: مدة العقد",
              content: `1. مدة التنفيذ:
مدة تنفيذ الأعمال هي 4 شهور تبدأ من تاريخ استلام الدفعة المقدمة أو أمر المباشرة بالعمل.
2. مدة الضمان:
تسري فترة الضمان بعد التسليم النهائي.
3. التجديد:
يجوز للطرفين تجديد العقد بناءً على اتفاق خطي بينهما.`
            },
            {
              title: "البند الخامس: التزامات الأطراف",
              content: `التزامات الشركة (الطرف الثاني):
- توريد معدات جديدة وأصلية مطابقة للمواصفات.
- تنفيذ التركيب من خلال فنيين مختصين.
- تسليم النظام بعد التشغيل الكامل والتأكد من كفاءة الأداء.
- تقديم التدريب والدعم الفني اللازم.

التزامات العميل (الطرف الأول):
- تهيئة موقع التركيب وتوفير مصادر الكهرباء والإنترنت.
- تسهيل دخول الفنيين إلى الموقع في أوقات العمل.
- الالتزام بسداد الدفعات في المواعيد المحددة.`
            },
            {
              title: "البند السادس: شروط الإنهاء",
              content: `1. يحق لأي طرف إنهاء العقد إذا أخل الطرف الآخر بأي من التزاماته بعد إشعاره خطيًا ومنحه مهلة (7) أيام لتصحيح الوضع.
2. في حال الإلغاء قبل بدء التنفيذ، يتم خصم التكاليف الفعلية التي تكبدها الطرف الثاني.
3. في حال الإنهاء بعد التنفيذ، لا يحق للطرف الأول استرداد المبالغ المدفوعة عن الأعمال المنجزة.`
            },
            {
              title: "البند السابع: المسؤولية وخصوصية البيانات",
              content: `1. حدود المسؤولية:
لا يتحمل الطرف الثاني أي مسؤولية عن سوء استخدام النظام من قبل العميل أو أطراف أخرى.
2. خصوصية البيانات:
يتعهد الطرف الثاني بالمحافظة على سرية جميع التسجيلات والبيانات، وعدم الاطلاع عليها أو نسخها أو مشاركتها إلا بإذن خطي من الطرف الأول.`
            },
            {
              title: "البند الثامن: القانون الواجب التطبيق وحل النزاعات",
              content: `يخضع هذا العقد لأحكام القوانين السارية في دولة الإمارات العربية المتحدة.
فى حال نشوء أي نزاع، يتم حله وديًا، وإذا تعذر ذلك، يُحال إلى الجهات القضائية المختصة في الدولة.`
            },
            {
              title: "البند التاسع: الموقع والتوقيع",
              content: `حرر هذا العقد في إمارة دبى بتاريخ ${new Date().toLocaleDateString("en-GB")} من نسعتين أصليتين، بيد كل طرف نسخة للعمل بموجبها.`
            }
          ];

          const newContract = {
            id: `contract-${Date.now()}`,
            contractNo: randomNo,
            date: new Date().toLocaleDateString("en-GB"),
            location: "دبى",
            title: generatedTitle,
            firstPartyName: quote.clientName,
            firstPartyPhone: quote.contactNo || "",
            firstPartyAddress: quote.locationArea || "",
            secondPartyName: quote.companyName || "كامشيلد م.م.ح",
            secondPartyAddress: quote.companyAddress || "37 شارع آل مكتوم, دبى",
            secondPartyPhone: "0563063601",
            totalCost: quote.total,
            totalCostWords: "",
            clauses: contractClauses,
            firstPartySignName: "",
            firstPartySignDate: new Date().toLocaleDateString("en-GB"),
            secondPartySignName: "",
            secondPartySignDate: new Date().toLocaleDateString("en-GB"),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            quotationId: quote.id
          };

          await saveContract(newContract);
          const contrs = await getAllContracts();
          setContracts(contrs);
        }
      }

      setQuotations(prev => prev.map(q => q.id === quote.id ? { ...q, status: newStatus } : q));
    } catch (err) {
      console.error("Failed to update status:", err);
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

  const totalReceiptsVal = receipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const formattedTotalReceipts = new Intl.NumberFormat(language === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2
  }).format(totalReceiptsVal);

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

  const filteredReceipts = receipts.filter((r) => 
    r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.receivedFor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContracts = contracts.filter((c) => 
    c.firstPartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contractNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
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
                src={settingsLogo || "/logo.jpg"} 
                alt="Smart Nexus Logo" 
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
              <p className="text-sm text-zinc-400 mt-0.5">Smart Nexus FZE LLC</p>
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

            <Link
              href="/settings"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-all duration-300"
            >
              <SettingsIcon className="w-4 h-4 text-zinc-400" />
              <span>{language === "ar" ? "الإعدادات" : "Settings"}</span>
            </Link>

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
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-xs transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.2)]"
            >
              <Plus className="w-4.5 h-4.5" />
              {t("newQuotation")}
            </Link>
            <Link 
              href="/contract/new"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 text-white font-medium text-xs transition-all duration-300 hover:scale-[1.02]"
            >
              <Plus className="w-4.5 h-4.5" />
              {t("newContract")}
            </Link>
            <Link 
              href="/certificate/new"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 text-white font-medium text-xs transition-all duration-300 hover:scale-[1.02]"
            >
              <Plus className="w-4.5 h-4.5" />
              {t("newCertificate")}
            </Link>
            <Link 
              href="/receipt/new"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 text-white font-medium text-xs transition-all duration-300 hover:scale-[1.02]"
            >
              <Plus className="w-4.5 h-4.5" />
              {t("newReceipt")}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
              <span>{t("margin")}: {totalMarginVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} AED</span>
              <span className="opacity-40">|</span>
              <span>{t("cost")}: {totalCostVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} AED</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
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

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-400">{t("totalReceiptsVal")}</p>
            <p className="text-3xl font-bold mt-2 text-white">{formattedTotalReceipts}</p>
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 mt-2 font-medium">
              <span>{receipts.length} {t("receiptsTab")}</span>
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
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 self-start sm:self-auto flex-wrap gap-1">
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
              onClick={() => setActiveTab("invoices")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "invoices" 
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("invoicesTab")} ({filteredQuotations.length})
            </button>
            <button
              onClick={() => setActiveTab("contracts")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "contracts" 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("contractsTab")} ({filteredContracts.length})
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
            <button
              onClick={() => setActiveTab("receipts")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "receipts" 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-455 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("receiptsTab")} ({filteredReceipts.length})
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
                  <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-xs text-zinc-400 font-semibold tracking-wider">
                        <th className="py-4 px-6">{t("quoteNo")}</th>
                        <th className="py-4 px-6">{t("clientName")}</th>
                        <th className="py-4 px-6">{t("date")}</th>
                        <th className="py-4 px-6 text-right">{t("total")}</th>
                        <th className="py-4 px-6 text-right">{t("cost")}</th>
                        <th className="py-4 px-6 text-right">{t("margin")}</th>
                        <th className="py-4 px-6 text-center">{t("status")}</th>
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
                              {(() => {
                                const status = quote.status || 'pending';
                                let textClass = "text-amber-400 border-amber-500/30 bg-amber-500/5";
                                if (status === 'approved') textClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
                                else if (status === 'executed') textClass = "text-blue-400 border-blue-500/30 bg-blue-500/5";
                                else if (status === 'rejected') textClass = "text-rose-400 border-rose-500/30 bg-rose-500/5";
                                else if (status === 'cancelled') textClass = "text-zinc-400 border-zinc-500/30 bg-zinc-500/5";

                                return (
                                  <select 
                                    value={status}
                                    onChange={(e) => handleStatusChange(quote, e.target.value as any)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border outline-none cursor-pointer transition-all ${textClass}`}
                                  >
                                    <option value="pending" className="bg-zinc-950 text-amber-400">{t("statusPending")}</option>
                                    <option value="approved" className="bg-zinc-950 text-emerald-400">{t("statusApproved")}</option>
                                    <option value="executed" className="bg-zinc-950 text-blue-400">{t("statusExecuted")}</option>
                                    <option value="rejected" className="bg-zinc-950 text-rose-400">{t("statusRejected")}</option>
                                    <option value="cancelled" className="bg-zinc-950 text-zinc-400">{t("statusCancelled")}</option>
                                  </select>
                                );
                              })()}
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
                                <a 
                                  href={`/quotation/${quote.id}?download=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 hover:text-blue-300 hover:border-blue-700/80 hover:bg-blue-950/20 transition-all"
                                  title={language === "ar" ? "تنزيل PDF" : "Download PDF"}
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <Link 
                                  href={`/contract/new?quoteId=${quote.id}`}
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-500 hover:text-amber-400 hover:border-amber-800/80 hover:bg-amber-950/20 transition-all"
                                  title={t("generateContract")}
                                >
                                  <PenTool className="w-4 h-4" />
                                </Link>
                                <Link 
                                  href={`/quotation/${quote.id}?view=invoice`}
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-450 hover:text-emerald-300 hover:border-emerald-800/80 hover:bg-emerald-950/20 transition-all"
                                  title={t("clientInvoice")}
                                >
                                  <ReceiptIcon className="w-4 h-4" />
                                </Link>
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
            ) : activeTab === "invoices" ? (
              filteredQuotations.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <ReceiptIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-300">{language === "ar" ? "لم يتم العثور على فواتير" : "No Invoices Found"}</h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
                    {searchQuery ? (language === "ar" ? "لا توجد فواتير تطابق بحثك." : "No invoices match your search.") : (language === "ar" ? "ابدأ بإنشاء فاتورة جديدة." : "Get started by creating your first invoice.")}
                  </p>
                  {!searchQuery && (
                    <Link 
                      href="/quotation/new?view=invoice" 
                      className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {language === "ar" ? "فاتورة جديدة" : "New Invoice"}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-xs text-zinc-400 font-semibold tracking-wider">
                        <th className="py-4 px-6">{t("invoiceNo")}</th>
                        <th className="py-4 px-6">{t("clientName")}</th>
                        <th className="py-4 px-6">{language === "ar" ? "تاريخ الفاتورة" : "Invoice Date"}</th>
                        <th className="py-4 px-6 text-right">{t("total")}</th>
                        <th className="py-4 px-6 text-right">{t("cost")}</th>
                        <th className="py-4 px-6 text-right">{t("margin")}</th>
                        <th className="py-4 px-6 text-center">{t("status")}</th>
                        <th className="py-4 px-6 text-center">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-sm">
                      {filteredQuotations.map((quote) => {
                        const qCost = quote.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.qty || 0)), 0);
                        const qMargin = quote.total - qCost;
                        const qMarginPercent = quote.total > 0 ? (qMargin / quote.total) * 100 : 0;
                        return (
                          <tr key={quote.id} className="hover:bg-zinc-900/30 transition-colors group">
                            <td className="py-4 px-6 font-mono font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {quote.quotationNo}
                            </td>
                            <td className="py-4 px-6 font-medium text-zinc-200">
                              {quote.clientName}
                            </td>
                            <td className="py-4 px-6 text-zinc-400">
                              {quote.date}
                            </td>
                            <td className="py-4 px-6 text-right font-semibold text-zinc-200">
                              {quote.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                            </td>
                            <td className="py-4 px-6 text-right text-zinc-400">
                              {qCost.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                            </td>
                            <td className={`py-4 px-6 text-right font-medium ${qMargin >= 0 ? "text-emerald-450" : "text-red-400"}`}>
                              {qMargin.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                              <span className="text-[10px] block text-zinc-500 font-normal">
                                {qMarginPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const status = quote.status || 'pending';
                                let textClass = "text-amber-400 border-amber-500/30 bg-amber-500/5";
                                if (status === 'approved') textClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
                                else if (status === 'executed') textClass = "text-blue-400 border-blue-500/30 bg-blue-500/5";
                                else if (status === 'rejected') textClass = "text-rose-400 border-rose-500/30 bg-rose-500/5";
                                else if (status === 'cancelled') textClass = "text-zinc-400 border-zinc-500/30 bg-zinc-500/5";

                                return (
                                  <select 
                                    value={status}
                                    onChange={(e) => handleStatusChange(quote, e.target.value as any)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border outline-none cursor-pointer transition-all ${textClass}`}
                                  >
                                    <option value="pending" className="bg-zinc-950 text-amber-400">{t("statusPending")}</option>
                                    <option value="approved" className="bg-zinc-950 text-emerald-400">{t("statusApproved")}</option>
                                    <option value="executed" className="bg-zinc-950 text-blue-400">{t("statusExecuted")}</option>
                                    <option value="rejected" className="bg-zinc-950 text-rose-400">{t("statusRejected")}</option>
                                    <option value="cancelled" className="bg-zinc-950 text-zinc-400">{t("statusCancelled")}</option>
                                  </select>
                                );
                              })()}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <a 
                                  href={`/quotation/${quote.id}?view=invoice&download=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 hover:text-blue-300 hover:border-blue-700/80 hover:bg-blue-950/20 transition-all"
                                  title={language === "ar" ? "تنزيل PDF" : "Download PDF"}
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <Link 
                                  href={`/quotation/${quote.id}?view=invoice`}
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
            ) : activeTab === "certificates" ? (
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
                  <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
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
                              <a 
                                href={`/certificate/${cert.id}?download=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 hover:text-blue-300 hover:border-blue-700/80 hover:bg-blue-950/20 transition-all"
                                title={language === "ar" ? "تنزيل PDF" : "Download PDF"}
                              >
                                <Download className="w-4 h-4" />
                              </a>
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
            ) : activeTab === "receipts" ? (
              filteredReceipts.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-300">{t("noReceiptsFound")}</h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
                    {searchQuery ? "No receipt vouchers match your search query." : "Generate a payment receipt to hand over to clients."}
                  </p>
                  {!searchQuery && (
                    <Link 
                      href="/receipt/new" 
                      className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t("newReceipt")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-xs text-zinc-400 font-semibold tracking-wider">
                        <th className="py-4 px-6">{t("receiptNo")}</th>
                        <th className="py-4 px-6">{t("clientName")}</th>
                        <th className="py-4 px-6">{t("date")}</th>
                        <th className="py-4 px-6 text-right">{t("amount")}</th>
                        <th className="py-4 px-6 text-center">{t("paymentMethod")}</th>
                        <th className="py-4 px-6 text-center">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-sm">
                      {filteredReceipts.map((rec) => (
                        <tr key={rec.id} className="hover:bg-zinc-900/30 transition-colors group">
                          <td className="py-4 px-6 font-mono font-medium text-white group-hover:text-blue-400 transition-colors">
                            {rec.receiptNo}
                          </td>
                          <td className="py-4 px-6 font-medium text-zinc-200">
                            {rec.clientName}
                          </td>
                          <td className="py-4 px-6 text-zinc-400">
                            {rec.date}
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-zinc-200">
                            {rec.amount.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                          </td>
                          <td className="py-4 px-6 text-center capitalize font-semibold text-zinc-300">
                            {rec.paymentMethod === "cash" && (language === "ar" ? "نقداً" : "Cash")}
                            {rec.paymentMethod === "bank" && (language === "ar" ? "تحويل بنكي" : "Bank Transfer")}
                            {rec.paymentMethod === "cheque" && (language === "ar" ? "شيك" : "Cheque")}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a 
                                href={`/receipt/${rec.id}?download=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 hover:text-blue-300 hover:border-blue-700/80 hover:bg-blue-950/20 transition-all"
                                title={language === "ar" ? "تنزيل PDF" : "Download PDF"}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <Link 
                                href={`/receipt/${rec.id}`}
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                                title={t("editTitle")}
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={(e) => handleDeleteReceipt(rec.id, e)}
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
            ) : (
              // Contracts Tab
              filteredContracts.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <PenTool className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-300">{t("noContractsFound")}</h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
                    {searchQuery ? "No contracts match your search query." : "Create professional client contracts and agreements."}
                  </p>
                  {!searchQuery && (
                    <Link 
                      href="/contract/new" 
                      className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t("newContract")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-xs text-zinc-400 font-semibold tracking-wider">
                        <th className="py-4 px-6">{t("contractNo")}</th>
                        <th className="py-4 px-6">{language === "ar" ? "العقد" : "Contract"}</th>
                        <th className="py-4 px-6">{t("clientName")}</th>
                        <th className="py-4 px-6">{t("date")}</th>
                        <th className="py-4 px-6 text-right">{t("contractCost")}</th>
                        <th className="py-4 px-6 text-center">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-sm">
                      {filteredContracts.map((contract) => (
                        <tr key={contract.id} className="hover:bg-zinc-900/30 transition-colors group">
                          <td className="py-4 px-6 font-mono font-medium text-white group-hover:text-blue-400 transition-colors">
                            {contract.contractNo}
                          </td>
                          <td className="py-4 px-6 text-zinc-200">
                            {contract.title}
                          </td>
                          <td className="py-4 px-6 text-zinc-300">
                            {contract.firstPartyName}
                          </td>
                          <td className="py-4 px-6 text-zinc-400">
                            {contract.date}
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-zinc-200">
                            {contract.totalCost.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a 
                                href={`/contract/${contract.id}?download=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-blue-400 hover:text-blue-300 hover:border-blue-700/80 hover:bg-blue-950/20 transition-all"
                                title={language === "ar" ? "تنزيل PDF" : "Download PDF"}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <Link 
                                href={`/contract/${contract.id}`}
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                                title={t("editTitle")}
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={(e) => handleDeleteContract(contract.id, e)}
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
        <p className="font-sans">Smart Nexus FZE LLC © {new Date().getFullYear()}</p>
        <p className="mt-1 font-sans">Developed offline-first. All data is saved on this browser device.</p>
      </footer>
    </div>
  );
}
