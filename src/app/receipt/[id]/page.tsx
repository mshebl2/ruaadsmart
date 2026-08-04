"use client";

import { Suspense, use } from "react";
import ReceiptEditor from "@/components/ReceiptEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditReceipt({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <ReceiptEditor id={resolvedParams.id} />
    </Suspense>
  );
}
