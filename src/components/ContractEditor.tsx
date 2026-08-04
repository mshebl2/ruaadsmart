"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Printer, 
  Share2, 
  Loader2,
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  PenTool,
  Link2
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveContract, getContract, Contract, ContractClause, getSettings, Settings, getQuotation } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ContractEditorProps {
  id?: string;
}

const DEFAULT_CLAUSES = [
  {
    title: "البند الأول: نطاق العمل والخدمات",
    content: `1 - يتعهد الطرف الثاني بتوريد وتركيب وتشغيل نظام كاميرات مراقبة متكامل في موقع الطرف الأول وفقًا لعرض السعر المرفق مع العقد.
2 - يقوم الطرف الثاني بتدريب الطرف الأول أو من يرشحه على كيفية تشغيل النظام واسترجاع التسجيلات.
3 - يقوم الطرف الثانى يضبط زوايا الرؤية، إعدادات التسجيل، وكشف الحركة بما يتوافق مع متطلبات العميل.
4 - يقوم الطرف الثانى بتوصيل جميع الكاميرات بأجهزة التسجيل (DVR/NVR) أو الشبكة الداخلية أو الإنترنت، وضمان التشغيل الكامل للنظام.`
  },
  {
    title: "البند الثاني: التكاليف وطريقة الدفع",
    content: `1. التكلفة الإجمالية:
تبلغ قيمة العقد الإجمالية (................ درهم إماراتي) شاملة توريد المعدات والتركيب والتشغيل.
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
    content: `حرر هذا العقد في إمارة دبى بتاريخ 7/11/2025 من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها.`
  }
];

const DEFAULT_CONTRACT_VALUES = {
  contractNo: "",
  date: new Date().toLocaleDateString("en-GB"),
  location: "دبى",
  title: "عقد توريد وتركيب أنظمة كاميرات مراقبة",
  firstPartyName: "",
  firstPartyPhone: "",
  firstPartyAddress: "",
  secondPartyName: "Smart Nexus FZE LLC",
  secondPartyPhone: "+971 555555555",
  secondPartyAddress: "Abraj Al Mamzar, Block A F 106, Al Mamzar, United Arab Emirates",
  totalCost: 0,
  totalCostWords: "",
  clauses: DEFAULT_CLAUSES,
  firstPartySignName: "",
  firstPartySignDate: new Date().toLocaleDateString("en-GB"),
  secondPartySignName: "",
  secondPartySignDate: new Date().toLocaleDateString("en-GB")
};

export default function ContractEditor({ id }: ContractEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, isRtl } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [settings, setSettings] = useState<Settings | null>(null);

  const isPrintMode = searchParams.get("print") === "true";

  const previewRef = useRef<HTMLDivElement>(null);
  const firstPartySigRef = useRef<SignatureCanvas>(null);
  const secondPartySigRef = useRef<SignatureCanvas>(null);

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<Contract>({
    defaultValues: DEFAULT_CONTRACT_VALUES
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "clauses"
  });

  const watchedClauses = watch("clauses") || [];

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loading) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const downloadParam = new URLSearchParams(search).get("download");
      if (downloadParam === "true") {
        const timer = setTimeout(() => {
          handleDownloadPDF();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, loading]);

  useEffect(() => {
    const quoteId = searchParams.get("quoteId");
    
    async function loadData() {
      try {
        if (id && id !== "new") {
          // Load existing contract
          const data = await getContract(id);
          if (data) {
            reset(data);
            setTimeout(() => {
              if (data.firstPartySignature && firstPartySigRef.current) {
                firstPartySigRef.current.fromDataURL(data.firstPartySignature);
              }
              if (data.secondPartySignature && secondPartySigRef.current) {
                secondPartySigRef.current.fromDataURL(data.secondPartySignature);
              }
            }, 300);
          } else {
            alert("Contract not found");
            router.push("/");
          }
        } else if (quoteId) {
          // Generate contract from quotation
          const quotation = await getQuotation(quoteId);
          if (quotation) {
            const randomNo = "C" + String(Math.floor(Math.random() * 90000) + 10000);
            
            // Prefill Clause 1 (Scope of Work) with quotation items
            const itemLines = quotation.items.map(
              (item, i) => `${i + 1} - ${item.description.split('\n')[0]} (الكمية: ${item.qty} ${item.unit})`
            ).join('\n');

            const isCctvOnly = quotation.items.every(item => item.description.toLowerCase().includes('cctv') || item.description.toLowerCase().includes('camera') || item.description.includes('كاميرا'));
            const isSmartOnly = quotation.items.every(item => !item.description.toLowerCase().includes('cctv') && !item.description.toLowerCase().includes('camera') && !item.description.includes('كاميرا'));
            
            let generatedTitle = "عقد توريد وتركيب أنظمة كاميرات مراقبة والبيت الذكي";
            if (isCctvOnly) generatedTitle = "عقد توريد وتركيب أنظمة كاميرات مراقبة";
            else if (isSmartOnly) generatedTitle = "عقد توريد وتركيب أنظمة البيت الذكي (Smart Home)";

            const contractClauses = [...DEFAULT_CLAUSES];
            
            contractClauses[0] = {
              title: "البند الأول: نطاق العمل والخدمات",
              content: `1 - يتعهد الطرف الثاني بتوريد وتركيب وتشغيل نظام متكامل في موقع الطرف الأول وفقًا لعرض السعر رقم (${quotation.quotationNo}) والبنود المذكورة أدناه:
${itemLines}
2 - يقوم الطرف الثاني بتدريب الطرف الأول أو من يرشحه على كيفية تشغيل النظام وإعداداته.
3 - يقوم الطرف الثانى بضبط زوايا الرؤية، إعدادات التشغيل، وكشف الحركة والبرمجة بما يتوافق مع متطلبات العميل.
4 - يقوم الطرف الثانى بتوصيل وتهيئة الأجهزة بالشبكة الداخلية أو الإنترنت وضمان التشغيل الكامل للنظام.`
            };

            contractClauses[1] = {
              title: "البند الثاني: التكاليف وطريقة الدفع",
              content: `1. التكلفة الإجمالية:
تبلغ قيمة العقد الإجمالية (${quotation.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} درهم إماراتي) شاملة توريد المعدات والتركيب والتشغيل.
2. جدول الدفع:
- 30% مقدّم عند توقيع العقد.
- 30% بعد توريد المعدات.
- 30% بعد إتمام التركيب.
- 10% عند تجربة النظام والتشغيل بنجاح.
3. الضرائب والرسوم:
يتحمل الطرف الأول أية ضرائب أو رسوم حكومية أو بلدية تتعلق بتنفيذ العقد.`
            };

            reset({
              ...DEFAULT_CONTRACT_VALUES,
              contractNo: randomNo,
              firstPartyName: quotation.clientName,
              firstPartyPhone: quotation.contactNo || "",
              firstPartyAddress: quotation.locationArea || "",
              secondPartyName: quotation.companyName || "كامشيلد م.م.ح",
              secondPartyAddress: quotation.companyAddress || "37 شارع آل مكتوم, دبى",
              totalCost: quotation.total,
              clauses: contractClauses,
              quotationId: quotation.id
            });
          }
        } else {
          const randomNo = "C" + String(Math.floor(Math.random() * 90000) + 10000);
          setValue("contractNo", randomNo);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, searchParams, reset, setValue, router]);

  const onSignatureEnd = (party: "first" | "second") => {
    if (party === "first" && firstPartySigRef.current) {
      if (!firstPartySigRef.current.isEmpty()) {
        setValue("firstPartySignature", firstPartySigRef.current.toDataURL("image/png"));
      }
    } else if (party === "second" && secondPartySigRef.current) {
      if (!secondPartySigRef.current.isEmpty()) {
        setValue("secondPartySignature", secondPartySigRef.current.toDataURL("image/png"));
      }
    }
  };

  const clearSignature = (party: "first" | "second") => {
    if (party === "first" && firstPartySigRef.current) {
      firstPartySigRef.current.clear();
      setValue("firstPartySignature", "");
    } else if (party === "second" && secondPartySigRef.current) {
      secondPartySigRef.current.clear();
      setValue("secondPartySignature", "");
    }
  };

  const saveDocHelper = async (data: Contract): Promise<string> => {
    const documentId = (id && id !== "new") ? id : `contract-${Date.now()}`;
    const now = new Date().toISOString();
    const updatedDoc: Contract = {
      ...data,
      id: documentId,
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    await saveContract(updatedDoc);
    return documentId;
  };

  const onSubmit = async (data: Contract) => {
    setSaving(true);
    try {
      await saveDocHelper(data);
      router.refresh();
      alert(language === "ar" ? "تم حفظ العقد بنجاح!" : "Contract saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving contract:", error);
      alert(language === "ar" ? "فشل حفظ العقد." : "Failed to save contract.");
    } finally {
      setSaving(false);
    }
  };

  // Canvas-based oklch→rgb converter (uses the browser's native color parser)
  const makeColorConverter = (doc: Document) => {
    const tmpCanvas = doc.createElement("canvas");
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    const ctx = tmpCanvas.getContext("2d");
    return (color: string): string => {
      if (!ctx) return "#000000";
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        if (a === 0) return "rgba(0,0,0,0)";
        return `rgb(${r},${g},${b})`;
      } catch {
        return "#000000";
      }
    };
  };

  // Sanitise <style> tags and element inline styles in a cloned document
  const patchDocumentColors = (doc: Document) => {
    const toRgb = makeColorConverter(doc);

    if (!doc.querySelector("link[href*='Cairo']")) {
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap";
      doc.head.appendChild(link);
    }

    doc.querySelectorAll("style").forEach((styleEl) => {
      if (!styleEl.textContent) return;
      if (styleEl.textContent.includes("oklch") || styleEl.textContent.includes("oklab") || styleEl.textContent.includes("lab(")) {
        styleEl.textContent = styleEl.textContent
          .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
          .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
          .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
      }
    });
    doc.querySelectorAll("link[rel='stylesheet']:not([href*='Cairo']), link[as='style']").forEach((l) => l.remove());
  };

  const bakeElementStyles = (origElement: HTMLElement, cloneElement: HTMLElement) => {
    const toRgb = makeColorConverter(document);
    const propsToCopy = [
      "display", "position", "top", "right", "bottom", "left", "float", "clear",
      "width", "height", "min-width", "min-height", "max-width", "max-height",
      "margin-top", "margin-right", "margin-bottom", "margin-left",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "box-sizing", "overflow", "overflow-x", "overflow-y", "z-index",
      "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
      "justify-content", "align-items", "align-content", "gap", "row-gap", "column-gap",
      "grid-template-columns", "grid-template-rows", "grid-column", "grid-row", "grid-auto-flow",
      "font-family", "font-size", "font-weight", "font-style", "line-height",
      "text-align", "text-decoration", "direction", "letter-spacing", "word-spacing",
      "color", "background-color", "background-image", "background-position", "background-size", "background-repeat",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
      "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
      "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius",
      "box-shadow", "opacity", "object-fit"
    ];

    const origEls = [origElement, ...Array.from(origElement.querySelectorAll("*"))];
    const cloneEls = [cloneElement, ...Array.from(cloneElement.querySelectorAll("*"))];

    origEls.forEach((orig, i) => {
      const cloneEl = cloneEls[i];
      if (!(orig instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(orig);

      propsToCopy.forEach((prop) => {
        let val = computed.getPropertyValue(prop);
        if (!val) return;

        if (prop === "font-family") {
          val = "Cairo, 'Segoe UI', Tahoma, Arial, sans-serif";
        }
        if (prop === "letter-spacing") {
          val = "0px";
        }

        // Convert any oklch / oklab / lab colors to rgb
        if (val.includes("oklch") || val.includes("oklab") || val.includes("lab(")) {
          val = val
            .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
            .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
            .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
        }
        cloneEl.style.setProperty(prop, val, "important");
      });
    });
  };

  const captureElementAsCanvas = async (element: HTMLDivElement): Promise<HTMLCanvasElement> => {
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    const clone = element.cloneNode(true) as HTMLDivElement;
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "-9999px";
    clone.style.setProperty("width", "210mm", "important");
    clone.style.setProperty("min-width", "210mm", "important");
    if (element.clientHeight > 0) {
      clone.style.setProperty("height", `${element.clientHeight}px`, "important");
      clone.style.setProperty("min-height", `${element.clientHeight}px`, "important");
    } else {
      clone.style.setProperty("height", "auto", "important");
    }
    clone.style.setProperty("zoom", "1", "important");
    clone.style.setProperty("transform", "none", "important");
    document.body.appendChild(clone);

    // Save original styles and force desktop print size temporarily
    const originalCssText = element.style.cssText;
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty("z-index", "99999", "important");
    element.style.setProperty("top", "0", "important");
    element.style.setProperty("left", "0", "important");
    element.style.setProperty("width", "210mm", "important");
    element.style.setProperty("min-width", "210mm", "important");
    element.style.setProperty("transform", "none", "important");
    element.style.setProperty("zoom", "1", "important");

    // Force layout reflow
    const _reflow = element.offsetHeight;

    bakeElementStyles(element, clone);

    // Restore original styles
    element.style.cssText = originalCssText;

    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const options = {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          patchDocumentColors(clonedDoc);
        },
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
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      return pdf;
    } catch (error) {
      console.error("PDF generation failed:", error);
      throw error;
    } finally {
      document.body.classList.remove("pdf-generating");
      setExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const docId = await saveDocHelper(formValues);
      if (id === "new") {
        router.push(`/contract/${docId}`);
      }

      const cNo = formValues.contractNo || "Contract";
      const filename = `Contract_${cNo}`;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.print();
        return;
      }

      if (!previewRef.current) {
        alert("Preview element not found");
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
          // Skip cross-origin
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
              body, #contract-preview-page, .font-arabic, [dir="rtl"], [dir="rtl"] * {
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
      const cNo = watch("contractNo") || "Contract";
      const blob = pdf.output("blob");
      const file = new File([blob], `Contract_${cNo}.pdf`, { type: "application/pdf" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Smart Nexus Contract ${cNo}`,
          text: `Please find attached contract ${cNo} from Smart Nexus.`
        });
      } else {
        handleDownloadPDF();
      }
    } catch (error) {
      console.error("Sharing failed:", error);
      handleDownloadPDF();
    }
  };

  const handleCopySignLink = () => {
    if (!id || id === "new") {
      alert(language === "ar" ? "يرجى حفظ العقد أولاً لتتمكن من مشاركة رابط التوقيع" : "Please save the contract first to copy the signature link.");
      return;
    }
    const signLink = `${window.location.origin}/contract/${id}/sign`;
    navigator.clipboard.writeText(signLink);
    alert(language === "ar" ? "تم نسخ رابط توقيع العميل بنجاح!" : "Client signing link copied successfully!");
  };

  const formValues = watch();

  if (loading || !isMounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-zinc-400 mt-2 text-sm">Loading contract editor...</p>
      </div>
    );
  }

function getClauseSplitIndex(clauses: Array<{ title: string; content: string }>): number {
  if (!clauses || clauses.length === 0) return 3;
  const clause1Lines = clauses[0]?.content ? clauses[0].content.split('\n').length : 4;
  if (clause1Lines > 8) {
    return 2;
  } else if (clause1Lines > 4) {
    return 3;
  }
  return 4;
}

  if (isPrintMode) {
    const splitIndex = getClauseSplitIndex(watchedClauses || []);
    const page1Clauses = watchedClauses.slice(0, splitIndex);
    const page2Clauses = watchedClauses.slice(splitIndex);

    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-start p-0 m-0 w-full" style={{ direction: "ltr" }}>
        <div 
          ref={previewRef}
          id="contract-preview-wrapper"
          className="flex flex-col gap-4 print:gap-0"
        >
          {/* Page 1 */}
          <div 
            id="contract-preview-page-1"
            dir="rtl"
            className="pdf-page w-[210mm] h-[296mm] bg-white text-zinc-900 pt-[10mm] pb-[8mm] px-[12mm] relative flex flex-col font-arabic pdf-preview-container"
            style={{ boxSizing: "border-box" }}
          >


            {/* Legal Contract Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4 mb-4">
              <div>
                <h1 className="text-lg font-bold text-emerald-800 leading-tight">
                  {formValues.title || "عقد توريد وتركيب"}
                </h1>
                <div className="flex flex-col gap-1 mt-1 text-[11px] text-zinc-500">
                  <div>رقم العقد: <span className="font-mono text-zinc-800 font-semibold">{formValues.contractNo}</span></div>
                  <div>التاريخ: <span className="text-zinc-800 font-semibold">{formValues.date}</span></div>
                </div>
              </div>
              <div className="text-left">
                {settings?.logoBase64 ? (
                  <div className="w-24 h-14 flex items-center justify-start">
                    <img 
                      src={settings.logoBase64} 
                      alt="Smart Nexus Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="font-bold text-base tracking-wider text-emerald-800">SMART NEXUS</div>
                )}
                <p className="text-[9px] text-zinc-400 mt-0.5">أنظمة التقنية المتقدمة</p>
              </div>
            </div>

            {/* Parties Section */}
            <div className="mb-4 space-y-1 bg-zinc-50 p-3 border border-zinc-200 rounded-lg">
              <p className="text-xs font-semibold mb-2 border-b border-zinc-200 pb-1 text-emerald-800">أطراف الاتفاقية:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                {/* الطرف الأول */}
                <div className="space-y-1 leading-relaxed border-l border-zinc-200 pl-3">
                  <p className="font-bold text-zinc-800">الطرف الأول (العميل):</p>
                  <p><span className="text-zinc-500">الاسم:</span> <span className="font-semibold">{formValues.firstPartyName}</span></p>
                  <p><span className="text-zinc-500">الهاتف:</span> <span className="font-mono">{formValues.firstPartyPhone}</span></p>
                  <p><span className="text-zinc-500">العنوان:</span> <span>{formValues.firstPartyAddress}</span></p>
                </div>
                {/* الطرف الثاني */}
                <div className="space-y-1 leading-relaxed pr-3">
                  <p className="font-bold text-zinc-800">الطرف الثاني (الشركة):</p>
                  <p><span className="text-zinc-500">الاسم:</span> <span className="font-semibold">{formValues.secondPartyName}</span></p>
                  <p><span className="text-zinc-500">الهاتف:</span> <span className="font-mono">{formValues.secondPartyPhone}</span></p>
                  <p><span className="text-zinc-500">العنوان:</span> <span>{formValues.secondPartyAddress}</span></p>
                </div>
              </div>
            </div>

            {/* Clauses Section */}
            <div className="flex-1 space-y-3.5 text-[10px] text-zinc-700 leading-relaxed text-justify">
              {page1Clauses.map((clause, index) => (
                <div key={index} className="space-y-1">
                  <h3 className="font-bold text-emerald-800 border-r-2 border-emerald-600 pr-2 py-0.5 text-[11px]">
                    {clause.title}
                  </h3>
                  <div className="whitespace-pre-line text-[9.5px] leading-relaxed text-zinc-600 pr-3 font-sans">
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
            className="pdf-page w-[210mm] h-[296mm] bg-white text-zinc-900 pt-[10mm] pb-[8mm] px-[12mm] relative flex flex-col font-arabic pdf-preview-container"
            style={{ boxSizing: "border-box" }}
          >


            {/* Clauses Section */}
            <div className="space-y-2 text-[9.5px] text-zinc-700 leading-snug text-justify mb-3">
              {page2Clauses.map((clause, index) => (
                <div key={index} className="space-y-0.5">
                  <h3 className="font-bold text-emerald-800 border-r-2 border-emerald-600 pr-2 py-0.5 text-[10.5px]">
                    {clause.title}
                  </h3>
                  <div className="whitespace-pre-line text-[9px] leading-snug text-zinc-600 pr-3 font-sans">
                    {clause.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Signatures Footer */}
            <div className="border-t border-zinc-200 pt-3 mt-4">
              <div className="grid grid-cols-2 gap-8 text-xs">
                {/* الطرف الأول */}
                <div className="space-y-1.5">
                  <p className="font-bold text-emerald-800 border-b border-zinc-100 pb-0.5 text-center">الطرف الأول (العميل)</p>
                  <p className="text-[10px]"><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{formValues.firstPartySignName}</span></p>
                  <p className="text-[10px]"><span className="text-zinc-400">التاريخ:</span> <span className="font-semibold">{formValues.firstPartySignDate}</span></p>
                  <div className="h-14 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center overflow-hidden p-1 relative">
                    {formValues.firstPartySignature ? (
                      <img 
                        src={formValues.firstPartySignature} 
                        alt="First Party Signature" 
                        className="h-full object-contain z-10"
                      />
                    ) : (
                      <span className="text-[9.5px] text-zinc-400 z-10">بانتظار التوقيع</span>
                    )}
                    {formValues.firstPartyStamp && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 select-none">
                        <img 
                          src={formValues.firstPartyStamp} 
                          alt="Client Stamp" 
                          className="h-12 w-12 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* الطرف الثاني */}
                <div className="space-y-1.5">
                  <p className="font-bold text-emerald-800 border-b border-zinc-100 pb-0.5 text-center">الطرف الثاني (الشركة)</p>
                  <p className="text-[10px]"><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{formValues.secondPartySignName}</span></p>
                  <p className="text-[10px]"><span className="text-zinc-400">التاريخ:</span> <span className="font-semibold">{formValues.secondPartySignDate}</span></p>
                  <div className="h-14 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center overflow-hidden p-1 relative">
                    {formValues.secondPartySignature ? (
                      <img 
                        src={formValues.secondPartySignature} 
                        alt="Second Party Signature" 
                        className="h-full object-contain z-10"
                      />
                    ) : (
                      <span className="text-[9.5px] text-zinc-400 z-10">بانتظار التوقيع</span>
                    )}
                    {settings?.stampBase64 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 select-none">
                        <img 
                          src={settings.stampBase64} 
                          alt="Company Stamp" 
                          className="h-12 w-12 object-contain"
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
    );
  }

  const splitIndex = getClauseSplitIndex(watchedClauses || []);
  const page1Clauses = watchedClauses.slice(0, splitIndex);
  const page2Clauses = watchedClauses.slice(splitIndex);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col main-layout-container">
      {/* Editor Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 py-3 px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print sticky top-0 z-40">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-500" />
                {id ? t("editTitle") : t("newContract")}
              </h1>
              <p className="text-xs text-zinc-500 font-mono">No: {formValues.contractNo}</p>
            </div>
          </div>
          
          {/* Action buttons on very small mobile screens (hidden on md) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button 
              type="submit" 
              form="contract-form"
              disabled={saving}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium transition-all"
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
            <button 
              type="button"
              onClick={handleCopySignLink}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-medium transition-all"
              title={language === "ar" ? "نسخ رابط توقيع العميل" : "Copy Client Sign Link"}
            >
              <Link2 className="w-4 h-4 text-emerald-500" />
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
              onClick={() => setPreviewTab("preview")}
              className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-semibold rounded text-center ${previewTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {t("previewTab")}
            </button>
          </div>

          {/* Desktop/Tablet Action Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              type="submit" 
              form="contract-form"
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-805 text-white font-medium text-xs transition-all hover:scale-[1.02]"
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
            <button 
              type="button"
              onClick={handleCopySignLink}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-850 border border-zinc-750 hover:bg-zinc-800 text-emerald-400 font-medium text-xs transition-all hover:scale-[1.02]"
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-500" />
              {language === "ar" ? "رابط توقيع العميل" : "Client Sign Link"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Split Pane */}
      <div className="flex-1 flex overflow-hidden workspace-split-pane">
        {/* Left Side: Editor Form */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 no-print bg-zinc-950 ${previewTab !== "edit" ? "hidden" : "block"}`}>
          <form id="contract-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            
            {/* Metadata Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("contractDetails")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("contractNo")}</label>
                  <input 
                    type="text" 
                    {...register("contractNo", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("date")}</label>
                  <input 
                    type="text" 
                    {...register("date", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{t("contractLocation")}</label>
                  <input 
                    type="text" 
                    {...register("location", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">عنوان العقد (Contract Title)</label>
                  <input 
                    type="text" 
                    {...register("title", { required: true })} 
                    placeholder="مثال: عقد توريد وتركيب أنظمة كاميرات مراقبة"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* الطرف الأول (العميل) */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("firstParty")}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">الاسم الكامل للعميل / الشركة</label>
                  <input 
                    type="text" 
                    {...register("firstPartyName", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">رقم الهاتف</label>
                    <input 
                      type="text" 
                      {...register("firstPartyPhone")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">العنوان</label>
                    <input 
                      type="text" 
                      {...register("firstPartyAddress")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* الطرف الثاني (الشركة) */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("secondParty")}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">اسم الشركة المنفذة</label>
                  <input 
                    type="text" 
                    {...register("secondPartyName", { required: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">رقم الهاتف</label>
                    <input 
                      type="text" 
                      {...register("secondPartyPhone")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">العنوان</label>
                    <input 
                      type="text" 
                      {...register("secondPartyAddress")} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* التكلفة الإجمالية وكتابتها */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("contractCost")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">التكلفة الرقمية (AED)</label>
                  <input 
                    type="number" 
                    {...register("totalCost", { valueAsNumber: true })} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">التكلفة كتابةً (بالعربية)</label>
                  <input 
                    type="text" 
                    {...register("totalCostWords")} 
                    placeholder="مثال: مائة وسبعة وخمسون ألفاً درهماً"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* بنود العقد التسعة */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">{t("clausesLabel")}</h2>
              <p className="text-xs text-zinc-400">يمكنك تعديل أي بند من بنود العقد بالكامل لتناسب متطلباتك.</p>
              
              <div className="space-y-4">
                {watchedClauses.map((clause, index) => (
                  <div key={index} className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-300">{clause.title || `البند ${index + 1}`}</label>
                    <input 
                      type="hidden" 
                      {...register(`clauses.${index}.title`)} 
                    />
                    <textarea 
                      rows={6}
                      {...register(`clauses.${index}.content`)} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-zinc-700 outline-none font-sans leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* التوقيعات الرقمية */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-5 rounded-xl space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">التوقيع والاعتماد (Signatures)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* توقيع الطرف الأول (العميل) */}
                <div className="space-y-3 p-4 rounded-lg bg-zinc-950 border border-zinc-850">
                  <h3 className="text-xs font-semibold text-zinc-300">{t("firstParty")}</h3>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">اسم الموقّع</label>
                    <input 
                      type="text" 
                      {...register("firstPartySignName")} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">تاريخ التوقيع</label>
                    <input 
                      type="text" 
                      {...register("firstPartySignDate")} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">شاشة التوقيع</label>
                    <div className="bg-white rounded overflow-hidden border border-zinc-800">
                      <SignatureCanvas 
                        ref={firstPartySigRef}
                        onEnd={() => onSignatureEnd("first")}
                        canvasProps={{ className: "w-full h-32" }}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => clearSignature("first")}
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {language === "ar" ? "إعادة تعيين التوقيع" : "Clear Signature"}
                    </button>
                  </div>
                </div>

                {/* توقيع الطرف الثاني (الشركة) */}
                <div className="space-y-3 p-4 rounded-lg bg-zinc-950 border border-zinc-850">
                  <h3 className="text-xs font-semibold text-zinc-300">{t("secondParty")}</h3>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">اسم الموقّع</label>
                    <input 
                      type="text" 
                      {...register("secondPartySignName")} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">تاريخ التوقيع</label>
                    <input 
                      type="text" 
                      {...register("secondPartySignDate")} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">شاشة التوقيع</label>
                    <div className="bg-white rounded overflow-hidden border border-zinc-800">
                      <SignatureCanvas 
                        ref={secondPartySigRef}
                        onEnd={() => onSignatureEnd("second")}
                        canvasProps={{ className: "w-full h-32" }}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => clearSignature("second")}
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {language === "ar" ? "إعادة تعيين التوقيع" : "Clear Signature"}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {language === "ar" ? "حفظ العقد والاعتمادات" : "Save Contract & Approvals"}
            </button>
          </form>
        </div>

        {/* Right Side: A4 Preview */}
        <div className={`flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-950 p-2 sm:p-6 md:p-8 flex justify-center print-area printable-area ${previewTab === "edit" ? "hidden md:flex" : "flex"}`}>
          <div className="w-full max-w-[210mm] sm:w-[210mm] flex flex-col gap-6 print:gap-0">
            <div 
              ref={previewRef}
              id="contract-preview-wrapper"
              className="flex flex-col gap-6 print:gap-0"
            >
              {/* Page 1 */}
              <div 
                id="contract-preview-page-1"
                dir="rtl"
                className="pdf-page w-full max-w-[210mm] sm:w-[210mm] bg-white text-zinc-900 p-4 sm:p-8 md:px-[12mm] md:pt-[10mm] md:pb-[8mm] shadow-md sm:shadow-2xl rounded-lg sm:rounded-none relative flex flex-col font-arabic pdf-preview-container print-area printable-area print:h-[296mm]"
                style={{ boxSizing: "border-box" }}
              >


                {/* Legal Contract Header */}
                <div className="flex items-start justify-between border-b border-zinc-200 pb-4 mb-4">
                  <div>
                    <h1 className="text-lg font-bold text-emerald-800 leading-tight">
                      {formValues.title || "عقد توريد وتركيب"}
                    </h1>
                    <div className="flex flex-col gap-1 mt-1 text-[11px] text-zinc-500">
                      <div>رقم العقد: <span className="font-mono text-zinc-800 font-semibold">{formValues.contractNo}</span></div>
                      <div>التاريخ: <span className="text-zinc-800 font-semibold">{formValues.date}</span></div>
                    </div>
                  </div>
                  <div className="text-left">
                    {settings?.logoBase64 ? (
                      <div className="w-24 h-14 flex items-center justify-start">
                        <img 
                          src={settings.logoBase64} 
                          alt="Smart Nexus Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="font-bold text-base tracking-wider text-emerald-800">SMART NEXUS</div>
                    )}
                    <p className="text-[9px] text-zinc-400 mt-0.5">أنظمة التقنية المتقدمة</p>
                  </div>
                </div>

                {/* Parties Section */}
                <div className="mb-4 space-y-1 bg-zinc-50 p-3 border border-zinc-200 rounded-lg">
                  <p className="text-xs font-semibold mb-2 border-b border-zinc-200 pb-1 text-emerald-800">أطراف الاتفاقية:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                    {/* الطرف الأول */}
                    <div className="space-y-1 leading-relaxed border-l border-zinc-200 pl-3">
                      <p className="font-bold text-zinc-800">الطرف الأول (العميل):</p>
                      <p><span className="text-zinc-500">الاسم:</span> <span className="font-semibold">{formValues.firstPartyName}</span></p>
                      <p><span className="text-zinc-500">الهاتف:</span> <span className="font-mono">{formValues.firstPartyPhone}</span></p>
                      <p><span className="text-zinc-500">العنوان:</span> <span>{formValues.firstPartyAddress}</span></p>
                    </div>
                    {/* الطرف الثاني */}
                    <div className="space-y-1 leading-relaxed pr-3">
                      <p className="font-bold text-zinc-800">الطرف الثاني (الشركة):</p>
                      <p><span className="text-zinc-500">الاسم:</span> <span className="font-semibold">{formValues.secondPartyName}</span></p>
                      <p><span className="text-zinc-500">الهاتف:</span> <span className="font-mono">{formValues.secondPartyPhone}</span></p>
                      <p><span className="text-zinc-500">العنوان:</span> <span>{formValues.secondPartyAddress}</span></p>
                    </div>
                  </div>
                </div>

                {/* Clauses Section */}
                <div className="flex-1 space-y-3.5 text-[10px] text-zinc-700 leading-relaxed text-justify">
                  {page1Clauses.map((clause, index) => (
                    <div key={index} className="space-y-1">
                      <h3 className="font-bold text-emerald-800 border-r-2 border-emerald-600 pr-2 py-0.5 text-[11px]">
                        {clause.title}
                      </h3>
                      <div className="whitespace-pre-line text-[9.5px] leading-relaxed text-zinc-600 pr-3 font-sans">
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
                className="pdf-page w-full max-w-[210mm] sm:w-[210mm] bg-white text-zinc-900 p-4 sm:p-8 md:px-[12mm] md:pt-[10mm] md:pb-[8mm] shadow-md sm:shadow-2xl rounded-lg sm:rounded-none relative flex flex-col font-arabic pdf-preview-container print-area printable-area print:h-[296mm]"
                style={{ boxSizing: "border-box" }}
              >


                {/* Clauses Section */}
                <div className="space-y-2 text-[9.5px] text-zinc-700 leading-snug text-justify mb-3">
                  {page2Clauses.map((clause, index) => (
                    <div key={index} className="space-y-0.5">
                      <h3 className="font-bold text-emerald-800 border-r-2 border-emerald-600 pr-2 py-0.5 text-[10.5px]">
                        {clause.title}
                      </h3>
                      <div className="whitespace-pre-line text-[9px] leading-snug text-zinc-600 pr-3 font-sans">
                        {clause.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Signatures Footer */}
                <div className="border-t border-zinc-200 pt-3 mt-4">
                  <div className="grid grid-cols-2 gap-8 text-xs">
                    {/* الطرف الأول */}
                    <div className="space-y-1.5">
                      <p className="font-bold text-emerald-800 border-b border-zinc-100 pb-0.5 text-center">الطرف الأول (العميل)</p>
                      <p className="text-[10px]"><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{formValues.firstPartySignName}</span></p>
                      <p className="text-[10px]"><span className="text-zinc-400">التاريخ:</span> <span className="font-semibold">{formValues.firstPartySignDate}</span></p>
                      <div className="h-14 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center overflow-hidden p-1 relative">
                        {formValues.firstPartySignature ? (
                          <img 
                            src={formValues.firstPartySignature} 
                            alt="First Party Signature" 
                            className="h-full object-contain z-10"
                          />
                        ) : (
                          <span className="text-[9.5px] text-zinc-400 z-10">بانتظار التوقيع</span>
                        )}
                        {formValues.firstPartyStamp && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 select-none">
                            <img 
                              src={formValues.firstPartyStamp} 
                              alt="Client Stamp" 
                              className="h-12 w-12 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* الطرف الثاني */}
                    <div className="space-y-1.5">
                      <p className="font-bold text-emerald-800 border-b border-zinc-100 pb-0.5 text-center">الطرف الثاني (الشركة)</p>
                      <p className="text-[10px]"><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{formValues.secondPartySignName}</span></p>
                      <p className="text-[10px]"><span className="text-zinc-400">التاريخ:</span> <span className="font-semibold">{formValues.secondPartySignDate}</span></p>
                      <div className="h-14 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center overflow-hidden p-1 relative">
                        {formValues.secondPartySignature ? (
                          <img 
                            src={formValues.secondPartySignature} 
                            alt="Second Party Signature" 
                            className="h-full object-contain z-10"
                          />
                        ) : (
                          <span className="text-[9.5px] text-zinc-400 z-10">بانتظار التوقيع</span>
                        )}
                        {settings?.stampBase64 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 select-none">
                            <img 
                              src={settings.stampBase64} 
                              alt="Company Stamp" 
                              className="h-12 w-12 object-contain"
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
      </div>
    </div>
  );
}
