"use client";

import { useEffect, useState } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const { t, language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if the app is running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if user dismissed the prompt recently (within 7 days)
    const dismissedTime = localStorage.getItem("pwa_install_dismissed");
    if (dismissedTime) {
      const diff = Date.now() - parseInt(dismissedTime, 10);
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return; // Don't show if dismissed within 7 days
      }
    }

    // Detect if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // If iOS Safari, we can display instructions after a short delay
    if (isIosDevice) {
      const isSafari = /safari/.test(userAgent) && !/crios|fxios|opera|edgios/.test(userAgent);
      if (isSafari) {
        // Show after 3 seconds for a smoother experience
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // For Android / Desktop (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the browser install prompt
    await deferredPrompt.prompt();

    // Wait for the user's choice
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Reset prompt and hide banner
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-8 duration-500 ease-out">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-md text-zinc-100">
        {/* Subtle accent light */}
        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl" />
        
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded-lg hover:bg-zinc-800/60"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-4 items-start pr-6 rtl:pr-0 rtl:pl-6">
          {/* App Logo / Icon representation */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Download className="h-6 w-6 animate-pulse" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-50 font-cairo">
              {t("pwaInstallTitle")}
            </h3>
            <p className="mt-1 text-sm text-zinc-400 leading-relaxed font-cairo">
              {t("pwaInstallDesc")}
            </p>

            {isIos ? (
              /* iOS Guide */
              <div className="mt-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50 p-3 text-xs text-zinc-300 leading-relaxed font-cairo flex flex-col gap-2">
                <p className="font-semibold text-zinc-200">
                  {language === "ar" ? "خطوات التثبيت على آيفون:" : "Installation steps for iPhone:"}
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                  <li>
                    {language === "ar" ? (
                      <>
                        اضغط على زر المشاركة <Share className="inline h-3.5 w-3.5 mx-1 text-sky-400" /> أسفل الشاشة.
                      </>
                    ) : (
                      <>
                        Tap the Share button <Share className="inline h-3.5 w-3.5 mx-1 text-sky-400" /> at the bottom of the screen.
                      </>
                    )}
                  </li>
                  <li>
                    {language === "ar" ? (
                      <>
                        اختر <span className="text-zinc-200 font-medium">إضافة إلى الصفحة الرئيسية</span> <Plus className="inline h-3.5 w-3.5 mx-1 p-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-200" /> من القائمة.
                      </>
                    ) : (
                      <>
                        Select <span className="text-zinc-200 font-medium">Add to Home Screen</span> <Plus className="inline h-3.5 w-3.5 mx-1 p-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-200" /> from the menu.
                      </>
                    )}
                  </li>
                </ol>
              </div>
            ) : (
              /* Android & Desktop Actions */
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-zinc-50 py-2 px-4 text-sm font-semibold transition-all duration-200 shadow-lg shadow-emerald-600/10 font-cairo flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  {t("pwaInstallBtn")}
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/20 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 py-2 px-4 text-sm font-medium transition-all duration-200 font-cairo"
                >
                  {t("pwaDismissBtn")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
