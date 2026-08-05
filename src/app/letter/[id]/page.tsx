"use client";

import { useParams } from "next/navigation";
import OfficialLetterEditor from "@/components/OfficialLetterEditor";

export default function EditLetterPage() {
  const params = useParams();
  const id = params.id as string;
  return <OfficialLetterEditor id={id} />;
}
