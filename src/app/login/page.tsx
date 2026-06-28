"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Lock, User, Globe, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, setLanguage, isRtl } = useLanguage();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(callbackUrl);
        // Refresh the router to apply middleware state changes
        router.refresh();
      } else {
        setError(t("invalidCredentials"));
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setError(language === "ar" ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center relative px-4 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in Header */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-all duration-300"
        >
          <Globe className="w-4 h-4 text-blue-400" />
          <span>{language === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 p-1 flex items-center justify-center mb-4">
              <Image
                src="/logo.jpg"
                alt="Ruaad Smart Logo"
                fill
                className="object-contain rounded-xl"
                priority
              />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white text-center font-arabic">
              {t("loginTitle")}
            </h2>
            <p className="text-xs text-zinc-400 mt-2 text-center max-w-[280px]">
              {t("loginSubtitle")}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                {t("username")}
              </label>
              <div className="relative flex items-center">
                <span className={`absolute ${isRtl ? "right-4" : "left-4"} text-zinc-500`}>
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "أدخل اسم المستخدم" : "Enter username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl py-3 ${
                    isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"
                  } text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                {t("password")}
              </label>
              <div className="relative flex items-center">
                <span className={`absolute ${isRtl ? "right-4" : "left-4"} text-zinc-500`}>
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl py-3 ${
                    isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"
                  } text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all duration-300 hover:scale-[1.01] shadow-[0_0_20px_rgba(59,130,246,0.15)] disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>{t("authenticating")}</span>
                </>
              ) : (
                <span>{t("signInBtn")}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
