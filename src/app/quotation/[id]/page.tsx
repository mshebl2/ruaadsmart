"use client";

import { use, Suspense } from "react";
import QuotationEditor from "@/components/QuotationEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditQuotation({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <QuotationEditor id={resolvedParams.id} />
    </Suspense>
  );
}
