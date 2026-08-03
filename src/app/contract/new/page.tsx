"use client";

import { Suspense } from "react";
import ContractEditor from "@/components/ContractEditor";

export default function NewContract() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <ContractEditor />
    </Suspense>
  );
}
