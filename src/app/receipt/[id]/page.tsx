"use client";

import { use } from "react";
import ReceiptEditor from "@/components/ReceiptEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditReceipt({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ReceiptEditor id={resolvedParams.id} />;
}
