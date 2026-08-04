import { Suspense } from "react";
import CertificateEditor from "@/components/CertificateEditor";

export default function NewCertificate() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <CertificateEditor />
    </Suspense>
  );
}
