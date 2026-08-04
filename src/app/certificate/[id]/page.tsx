"use client";

import { use, Suspense } from "react";
import CertificateEditor from "@/components/CertificateEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCertificate({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <CertificateEditor id={resolvedParams.id} />
    </Suspense>
  );
}
