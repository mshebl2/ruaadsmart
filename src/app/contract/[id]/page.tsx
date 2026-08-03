"use client";

import { use, Suspense } from "react";
import ContractEditor from "@/components/ContractEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditContract({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <ContractEditor id={resolvedParams.id} />
    </Suspense>
  );
}
