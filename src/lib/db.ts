const DB_NAME = 'ruaad_smart_db';
const DB_VERSION = 1;

export interface PurchaseInvoice {
  id: string;
  name: string;
  fileData: string; // base64 string
  fileType: string;
  uploadedAt: string;
}

export interface QuotationItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  cost?: number; // Internal cost price
  total: number;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  date: string;
  validUntil: string;
  preparedBy: string;
  clientName: string;
  contactNo: string;
  email: string;
  locationArea: string;
  projectReference: string;
  items: QuotationItem[];
  subtotal: number;
  total: number;
  paymentTerms: string;
  termsConditions: string;
  preparedByName: string;
  preparedByDate: string;
  clientAcceptanceName: string;
  clientAcceptanceDate: string;
  companyName: string;
  bankName: string;
  bankIban: string;
  companyAddress: string;
  companyEmail: string;
  purchaseInvoices?: PurchaseInvoice[];
  createdAt: string;
  updatedAt: string;
}

export interface CertificateItem {
  id: string;
  system: string;
  remarks: string;
  done: boolean;
}

export interface Certificate {
  id: string;
  project: string;
  systemType: string;
  statement: string;
  checklist: CertificateItem[];
  warrantyText: string;
  clientName: string;
  clientSignature?: string; // base64 signature image
  clientDate: string;
  integratorName: string;
  integratorSignature?: string; // base64 signature image
  integratorDate: string;
  address: string;
  website: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

// Quotation Operations
export async function saveQuotation(quotation: Quotation): Promise<void> {
  const res = await fetch('/api/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quotation),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save quotation');
  }
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const res = await fetch(`/api/quotations/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch quotation');
  return res.json();
}

export async function getAllQuotations(): Promise<Quotation[]> {
  const res = await fetch('/api/quotations');
  if (!res.ok) throw new Error('Failed to fetch quotations');
  return res.json();
}

export async function deleteQuotation(id: string): Promise<void> {
  const res = await fetch(`/api/quotations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete quotation');
}

// Certificate Operations
export async function saveCertificate(certificate: Certificate): Promise<void> {
  const res = await fetch('/api/certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(certificate),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save certificate');
  }
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  const res = await fetch(`/api/certificates/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch certificate');
  return res.json();
}

export async function getAllCertificates(): Promise<Certificate[]> {
  const res = await fetch('/api/certificates');
  if (!res.ok) throw new Error('Failed to fetch certificates');
  return res.json();
}

export async function deleteCertificate(id: string): Promise<void> {
  const res = await fetch(`/api/certificates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete certificate');
}

export interface Receipt {
  id: string;
  receiptNo: string;
  date: string;
  clientName: string;
  amount: number;
  amountInWords: string;
  paymentMethod: "cash" | "bank" | "cheque";
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  receivedFor: string;
  receivedBy: string;
  integratorSignature?: string;
  createdAt: string;
  updatedAt: string;
}

// Receipt Operations
export async function saveReceipt(receipt: Receipt): Promise<void> {
  const res = await fetch('/api/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receipt),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save receipt');
  }
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const res = await fetch(`/api/receipts/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch receipt');
  return res.json();
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const res = await fetch('/api/receipts');
  if (!res.ok) throw new Error('Failed to fetch receipts');
  return res.json();
}

export async function deleteReceipt(id: string): Promise<void> {
  const res = await fetch(`/api/receipts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete receipt');
}
