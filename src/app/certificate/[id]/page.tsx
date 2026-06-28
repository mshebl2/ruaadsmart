"use client";

import { use } from "react";
import CertificateEditor from "@/components/CertificateEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCertificate({ params }: PageProps) {
  const resolvedParams = use(params);
  return <CertificateEditor id={resolvedParams.id} />;
}
