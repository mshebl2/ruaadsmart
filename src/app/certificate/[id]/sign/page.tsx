"use client";

import { Suspense, use } from "react";
import ClientCertificateSigner from "@/components/ClientCertificateSigner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SignCertificatePage({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading portal...</div>}>
      <ClientCertificateSigner id={resolvedParams.id} />
    </Suspense>
  );
}
