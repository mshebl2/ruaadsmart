const DB_NAME = 'smart_nexus_db';
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
  discount?: number;
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
  bankBic?: string;
  bankAddress?: string;
  companyAddress: string;
  companyEmail: string;
  purchaseInvoices?: PurchaseInvoice[];
  status?: 'pending' | 'approved' | 'executed' | 'rejected' | 'cancelled';
  invoiceType?: 'standard' | 'tax';
  clientTaxNumber?: string;
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
  clientStamp?: string; // base64 stamp image
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
  const res = await fetch(`/api/quotations/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch quotation');
  return res.json();
}

export async function getAllQuotations(): Promise<Quotation[]> {
  const res = await fetch('/api/quotations', { cache: 'no-store' });
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
  const res = await fetch(`/api/certificates/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch certificate');
  return res.json();
}

export async function getAllCertificates(): Promise<Certificate[]> {
  const res = await fetch('/api/certificates', { cache: 'no-store' });
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
  // Tax Invoice Fields
  invoiceType?: "standard" | "tax";
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  clientTaxNumber?: string;
  zatcaQrCode?: string; // Base64 encoded TLV
  uuid?: string;        // UUIDv4 for tamper resistance
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
  const res = await fetch(`/api/receipts/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch receipt');
  return res.json();
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const res = await fetch('/api/receipts', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch receipts');
  return res.json();
}

export async function deleteReceipt(id: string): Promise<void> {
  const res = await fetch(`/api/receipts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete receipt');
}

export interface Settings {
  companyName?: string;
  logoBase64?: string;
  stampBase64?: string;
  taxRate?: number;    // e.g. 15 or 5
  taxNumber?: string;  // e.g. 300000000000003
  currency?: string;   // e.g. "SAR", "AED", "USD", "EGP"
}

export async function getSettings(): Promise<Settings> {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    return {};
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save settings');
  }
}

export interface ContractClause {
  title: string;
  content: string;
}

export interface Contract {
  id: string;
  contractNo: string;
  date: string;
  location: string;
  title: string;
  firstPartyName: string;
  firstPartyPhone: string;
  firstPartyAddress: string;
  secondPartyName: string;
  secondPartyPhone: string;
  secondPartyAddress: string;
  clauses: ContractClause[];
  totalCost: number;
  totalCostWords: string;
  firstPartySignName: string;
  firstPartySignature?: string;
  firstPartyStamp?: string;
  firstPartySignDate: string;
  secondPartySignName: string;
  secondPartySignature?: string;
  secondPartySignDate: string;
  createdAt: string;
  updatedAt: string;
  quotationId?: string;
}

// Contract Operations
export async function saveContract(contract: Contract): Promise<void> {
  const res = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contract),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save contract');
  }
}

export async function getContract(id: string): Promise<Contract | null> {
  const res = await fetch(`/api/contracts/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch contract');
  return res.json();
}

export async function getAllContracts(): Promise<Contract[]> {
  const res = await fetch('/api/contracts', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch contracts');
  return res.json();
}

export async function deleteContract(id: string): Promise<void> {
  const res = await fetch(`/api/contracts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete contract');
}

// Official Letters Operations
export interface OfficialLetter {
  id: string;
  letterNo: string;
  date: string;
  addressedTo: string;
  letterType: string;
  customTitle?: string;
  content: string;
  signatoryName?: string;
  signatoryTitle?: string;
  signatureImage?: string;
  stampBase64?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveOfficialLetter(letter: OfficialLetter): Promise<void> {
  const res = await fetch('/api/letters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(letter),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save official letter');
  }
}

export async function getOfficialLetter(id: string): Promise<OfficialLetter | null> {
  const res = await fetch(`/api/letters/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch official letter');
  return res.json();
}

export async function getAllOfficialLetters(): Promise<OfficialLetter[]> {
  const res = await fetch('/api/letters', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch official letters');
  return res.json();
}

export async function deleteOfficialLetter(id: string): Promise<void> {
  const res = await fetch(`/api/letters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete official letter');
}
