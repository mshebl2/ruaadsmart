"use client";

import { Suspense } from "react";
import ReceiptEditor from "@/components/ReceiptEditor";

export default function NewReceipt() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <ReceiptEditor />
    </Suspense>
  );
}
