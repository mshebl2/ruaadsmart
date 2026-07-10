"use client";

import { Suspense } from "react";
import QuotationEditor from "@/components/QuotationEditor";

export default function NewQuotation() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <QuotationEditor />
    </Suspense>
  );
}
