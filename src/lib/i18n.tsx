"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ar";

interface TranslationDictionary {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: TranslationDictionary = {
  // Dashboard
  dashboardTitle: { en: "Ruaad Smart Systems", ar: "رواد سمارت للأجهزة الذكية" },
  newQuotation: { en: "New Quotation", ar: "عرض سعر جديد" },
  newCertificate: { en: "New Certificate", ar: "شهادة إنجاز جديدة" },
  totalQuotations: { en: "Total Quotations", ar: "إجمالي عروض الأسعار" },
  pipelineValue: { en: "Total Pipeline Value", ar: "القيمة الإجمالية للعروض" },
  completedCerts: { en: "Completed Certificates", ar: "الشهادات المكتملة" },
  searchPlaceholder: { en: "Search by client name, number, project...", ar: "ابحث عن اسم العميل، الرقم، المشروع..." },
  quotationsTab: { en: "Quotations", ar: "عروض الأسعار" },
  certificatesTab: { en: "Work Certificates", ar: "شهادات إنجاز العمل" },
  clientName: { en: "Client Name", ar: "اسم العميل" },
  quoteNo: { en: "Quotation No.", ar: "رقم العرض" },
  date: { en: "Date", ar: "التاريخ" },
  total: { en: "Total", ar: "الإجمالي" },
  actions: { en: "Actions", ar: "الإجراءات" },
  status: { en: "Status", ar: "الحالة" },
  handedOver: { en: "Handed Over", ar: "تم التسليم" },
  noQuotesFound: { en: "No Quotations Found", ar: "لم يتم العثور على عروض أسعار" },
  noCertsFound: { en: "No Certificates Found", ar: "لم يتم العثور على شهادات" },
  projectClient: { en: "Project / Client", ar: "المشروع / العميل" },
  systemTechnology: { en: "System / Technology", ar: "النظام / التكنولوجيا" },
  completionDate: { en: "Completion Date", ar: "تاريخ الإنجاز" },
  margin: { en: "Margin", ar: "الربح" },
  cost: { en: "Cost", ar: "التكلفة" },
  marginPercent: { en: "Margin %", ar: "نسبة الربح" },
  invoicesAttached: { en: "Invoices", ar: "الفواتير" },
  editTitle: { en: "Edit", ar: "تعديل" },
  deleteTitle: { en: "Delete", ar: "حذف" },
  localDBSave: { en: "Saved in local DB", ar: "محفوظ محلياً في المتصفح" },
  signedHandover: { en: "Signed & handover complete", ar: "موقعة وتم تسليم العمل" },

  // Quotation Editor
  docDetails: { en: "Document Details", ar: "تفاصيل المستند" },
  preparedBy: { en: "Prepared By", ar: "أعد بواسطة" },
  validUntil: { en: "Valid Until", ar: "صالح حتى" },
  clientInfo: { en: "Client Information", ar: "معلومات العميل" },
  contactNo: { en: "Contact No.", ar: "رقم الاتصال" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  locationArea: { en: "Location / Area", ar: "الموقع / المنطقة" },
  projectRef: { en: "Project Reference", ar: "مرجع المشروع" },
  lineItems: { en: "Line Items", ar: "بنود العرض" },
  addItem: { en: "Add Item", ar: "إضافة بند" },
  description: { en: "Description / Scope of Work", ar: "الوصف / مجال العمل" },
  qty: { en: "Qty", ar: "الكمية" },
  unit: { en: "Unit", ar: "الوحدة" },
  unitPrice: { en: "Unit Price (AED)", ar: "سعر الوحدة (درهم)" },
  itemTotal: { en: "Total (AED)", ar: "الإجمالي (درهم)" },
  termsConditions: { en: "Terms & Conditions", ar: "الشروط والأحكام" },
  paymentTerms: { en: "Payment Terms", ar: "شروط الدفع" },
  termsLink: { en: "Terms Link", ar: "رابط الشروط" },
  preparedByName: { en: "Prepared By Name", ar: "اسم المُعِد" },
  preparedByDate: { en: "Prepared By Date", ar: "تاريخ الإعداد" },
  companyBankDetails: { en: "Company & Bank Details", ar: "تفاصيل الشركة والبنك" },
  companyName: { en: "Company Name", ar: "اسم الشركة" },
  bankName: { en: "Bank Name", ar: "اسم البنك" },
  iban: { en: "IBAN", ar: "رقم الآيبان" },
  companyAddress: { en: "Company Address", ar: "عنوان الشركة" },
  companyEmail: { en: "Company Email", ar: "البريد الإلكتروني للشركة" },
  
  // Costing & Upload Invoices
  internalCosting: { en: "Internal Costing & Profit Margins", ar: "التكاليف الداخلية وهامش الربح" },
  costPerUnit: { en: "Cost Price (AED)", ar: "سعر التكلفة للوحدة (درهم)" },
  totalCost: { en: "Total Cost", ar: "إجمالي التكلفة" },
  profitMargin: { en: "Profit Margin", ar: "هامش الربح" },
  attachInvoices: { en: "Attach Purchase Invoices", ar: "إرفاق فواتير الشراء" },
  uploadInvoiceBtn: { en: "Upload Invoice (PDF/Image)", ar: "رفع فاتورة (PDF/صورة)" },
  viewFile: { en: "View", ar: "عرض" },
  deleteFile: { en: "Delete", ar: "حذف" },
  saveBtn: { en: "Save", ar: "حفظ" },
  downloadPdf: { en: "Download PDF", ar: "تنزيل PDF" },
  print: { en: "Print", ar: "طباعة" },
  share: { en: "Share", ar: "مشاركة" },
  formTab: { en: "Form", ar: "النموذج" },
  previewTab: { en: "A4 Preview", ar: "معاينة A4" },
  uploadedAt: { en: "Uploaded at", ar: "تاريخ الرفع" },

  // Certificate Editor
  projectVilla: { en: "Project / Customer Villa", ar: "المشروع / فيلا العميل" },
  systemTechScope: { en: "System Technology Scope", ar: "مجال تكنولوجيا الأنظمة" },
  officialStatement: { en: "Official Statement", ar: "البيان الرسمي" },
  handoverChecklist: { en: "Handover Systems Checklist", ar: "قائمة فحص استلام الأنظمة" },
  addSystemRow: { en: "Add System Row", ar: "إضافة نظام" },
  systemName: { en: "System / Technology", ar: "النظام / التكنولوجيا" },
  remarks: { en: "Remarks", ar: "ملاحظات" },
  markAsDone: { en: "Mark as Done (renders tick on sheet)", ar: "تحديد كمكتمل (يظهر علامة صح في المعاينة)" },
  clientSignature: { en: "Client Seal/Signature", ar: "توقيع/ختم العميل" },
  clientSignName: { en: "Client Name", ar: "اسم العميل" },
  signDate: { en: "Sign Date", ar: "تاريخ التوقيع" },
  integratorSignature: { en: "Integrator Seal/Signature", ar: "توقيع/ختم الشركة المنفذة" },
  integratorSignName: { en: "Integrator Name", ar: "اسم الشركة المنفذة" },
  footerContact: { en: "Footer Contact Details", ar: "تفاصيل الاتصال في التذييل" },
  address: { en: "Address", ar: "العنوان" },
  website: { en: "Website", ar: "الموقع الإلكتروني" },
  phone: { en: "Phone", ar: "الهاتف" },
  clearSig: { en: "Clear", ar: "مسح" },
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar"); // Default to Arabic as requested

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ruaad_smart_lang") as Language;
      if (stored === "en" || stored === "ar") {
        setLanguageState(stored);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("ruaad_smart_lang", lang);
    }
  };

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry["en"] || key;
  };

  const isRtl = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      <div dir={isRtl ? "rtl" : "ltr"} className={isRtl ? "font-arabic" : "font-sans"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
