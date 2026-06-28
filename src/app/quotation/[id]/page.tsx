"use client";

import { use } from "react";
import QuotationEditor from "@/components/QuotationEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditQuotation({ params }: PageProps) {
  const resolvedParams = use(params);
  return <QuotationEditor id={resolvedParams.id} />;
}
