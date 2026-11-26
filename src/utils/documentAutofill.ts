import type { DocumentKey } from '@/constants/onboarding';
import type { DocumentFieldValues } from '@/screens/onboarding/schemas/documents.schema';
import { parseIsoDate } from './validation';

/** What can be read from an uploaded document: the licence or one of the vehicle documents. */
export type AutofillDocType = 'dl' | DocumentKey;

export type AutofillField =
  | 'dlNumber'
  | 'issuedOn'
  | 'validUpto'
  | 'registrationNumber'
  | 'regDate'
  | 'makeModel'
  | 'fuelType'
  | 'chassisNumber'
  | 'engineNumber'
  | 'colour'
  | 'policyNo'
  | 'insurer'
  | 'certificateNo'
  | 'fastagId';

/** Review-form values ("" = empty); dates "YYYY-MM-DD". */
export type AutofillValues = Partial<Record<AutofillField, string>>;

export type AutofillFieldSpec = { key: AutofillField; kind: 'text' | 'date'; upper?: boolean };

const text = (key: AutofillField, upper = false): AutofillFieldSpec => ({ key, kind: 'text', upper });
const date = (key: AutofillField): AutofillFieldSpec => ({ key, kind: 'date' });

/** The review form of each document, in order. */
export const AUTOFILL_FIELDS: Record<AutofillDocType, readonly AutofillFieldSpec[]> = {
  dl: [text('dlNumber', true), date('issuedOn'), date('validUpto')],
  rc: [
    text('registrationNumber', true),
    date('regDate'),
    date('validUpto'),
    text('makeModel'),
    text('fuelType'),
    text('chassisNumber', true),
    text('engineNumber', true),
    text('colour'),
  ],
  insurance: [text('policyNo', true), text('insurer'), date('validUpto')],
  pollution: [text('certificateNo', true), date('validUpto')],
  fastag: [text('fastagId', true)],
};

/**
 * The OCR response's keys → the form's fields. DL: the web's `{ dl_number, issued_on, valid_upto,
 * vehicle_classes }`. Documents: `/ocr/document` answers a column map of the vdocs table (the web
 * spreads it into the form), so the table's columns come first; a few common aliases follow
 * (docs/api/ocr-findings.md).
 */
const RESPONSE_KEYS: Record<AutofillDocType, Partial<Record<AutofillField, readonly string[]>>> = {
  dl: { dlNumber: ['dl_number'], issuedOn: ['issued_on'], validUpto: ['valid_upto'] },
  rc: {
    registrationNumber: ['registration_number', 'rc_number', 'vehicle_number'],
    regDate: ['reg_date', 'registration_date'],
    validUpto: ['valid_upto', 'fitness_upto'],
    makeModel: ['maker_model', 'make_model'],
    fuelType: ['fuel_type', 'fuel'],
    chassisNumber: ['chassis_number'],
    engineNumber: ['engine_number'],
    colour: ['colour', 'color'],
  },
  insurance: { policyNo: ['policy_no', 'policy_number'], insurer: ['insurer'], validUpto: ['end_date', 'valid_upto'] },
  pollution: { certificateNo: ['certificate_no'], validUpto: ['validity_expiry_date', 'valid_upto'] },
  fastag: { fastagId: ['fastag_id'] },
};

const DATE_FIELDS = new Set<AutofillField>(['issuedOn', 'validUpto', 'regDate']);
/** Upper-case, as the manual forms type them. */
const UPPER_FIELDS = new Set<AutofillField>(
  (Object.values(AUTOFILL_FIELDS).flat() as AutofillFieldSpec[]).filter(f => f.upper).map(f => f.key),
);

/** "YYYY-MM-DD" from ISO dates / timestamps, "DD/MM/YYYY", "DD-MM-YYYY" or "DD.MM.YYYY"; "" if not a real date. */
export function normalizeDate(value: string): string {
  const v = value.trim();
  let iso = '';
  const ymd = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(v);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (ymd) {
    iso = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  } else if (dmy) {
    iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return iso && parseIsoDate(iso) ? iso : '';
}

/** One read value, cleaned: trimmed; dates YYYY-MM-DD; numbers (DL, registration, policy, …) upper-case. */
export function normalizeAutofillValue(field: AutofillField, value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }
  const v = String(value).trim();
  if (DATE_FIELDS.has(field)) {
    return normalizeDate(v);
  }
  return UPPER_FIELDS.has(field) ? v.toUpperCase() : v;
}

/** The OCR response → the form's fields (only the non-empty ones). */
export function fromOcrResponse(docType: AutofillDocType, raw: Record<string, unknown>): AutofillValues {
  const out: AutofillValues = {};
  for (const { key } of AUTOFILL_FIELDS[docType]) {
    for (const k of RESPONSE_KEYS[docType][key] ?? []) {
      const v = normalizeAutofillValue(key, raw[k]);
      if (v) {
        out[key] = v;
        break;
      }
    }
  }
  // RC: make + model as separate names (the web's /ocr/rc shape).
  if (docType === 'rc' && !out.makeModel) {
    const mm = [raw.make, raw.model].filter(x => typeof x === 'string' && x.trim()).join(' ').trim();
    if (mm) {
      out.makeModel = mm;
    }
  }
  return out;
}

/**
 * The web's merge rule: a read value replaces the form's value only when it is non-empty. Returns the
 * merged values and which fields were filled from the document ("Auto-filled – please check").
 */
export function mergeAutofill(form: AutofillValues, extracted: AutofillValues): { values: AutofillValues; filled: AutofillField[] } {
  const values: AutofillValues = { ...form };
  const filled: AutofillField[] = [];
  for (const [k, v] of Object.entries(extracted) as [AutofillField, string | undefined][]) {
    if (v && v.trim()) {
      values[k] = v;
      filled.push(k);
    }
  }
  return { values, filled };
}

/* ----------------------------- vehicle documents ↔ the card's details ----------------------------- */

/** vdocs_regcertificate.fuel_type as the web saves it (Petrol / Diesel / Electric / CNG / Hybrid). */
const RC_FUELS = ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'] as const;
const fuel = (v: string | undefined): string | undefined => {
  const f = v?.trim().toLowerCase();
  return RC_FUELS.find(x => x.toLowerCase() === f);
};

/** A card's saved details (and the vehicle number for the RC) → the review form. */
export function autofillValuesFromFields(key: DocumentKey, fields: DocumentFieldValues | null, vehicleNumber?: string): AutofillValues {
  const f = fields ?? {};
  switch (key) {
    case 'rc':
      return {
        registrationNumber: f.registrationNumber ?? vehicleNumber ?? '',
        regDate: f.rc?.regDate ?? '',
        validUpto: f.rc?.validUpto ?? '',
        makeModel: f.rc?.makeModel ?? '',
        fuelType: f.rc?.fuelType ?? '',
        chassisNumber: f.rc?.chassisNumber ?? '',
        engineNumber: f.rc?.engineNumber ?? '',
        colour: f.rc?.colour ?? '',
      };
    case 'insurance':
      return { policyNo: f.policyNo ?? '', insurer: f.insurer ?? '', validUpto: f.expiry ?? '' };
    case 'pollution':
      return { certificateNo: f.certificateNo ?? '', validUpto: f.expiry ?? '' };
    case 'fastag':
      return { fastagId: f.fastagId ?? '' };
  }
}

/** The confirmed review form → the card's details (kept: anything the form doesn't show, e.g. the RC vehicle). */
export function fieldsFromAutofillValues(key: DocumentKey, v: AutofillValues, existing: DocumentFieldValues | null): DocumentFieldValues {
  const t = (x: string | undefined) => x?.trim() ?? '';
  const base = existing ?? {};
  switch (key) {
    case 'rc':
      return {
        ...base,
        registrationNumber: t(v.registrationNumber).toUpperCase().replace(/\s+/g, '') || base.registrationNumber,
        rc: {
          ...base.rc,
          regDate: t(v.regDate) || null,
          validUpto: t(v.validUpto) || null,
          makeModel: t(v.makeModel),
          fuelType: fuel(v.fuelType) ?? '',
          chassisNumber: t(v.chassisNumber),
          engineNumber: t(v.engineNumber),
          colour: t(v.colour),
        },
      };
    case 'insurance':
      return { ...base, policyNo: t(v.policyNo), insurer: t(v.insurer), expiry: t(v.validUpto) || null };
    case 'pollution':
      return { ...base, certificateNo: t(v.certificateNo), expiry: t(v.validUpto) || null };
    case 'fastag':
      return { ...base, fastagId: t(v.fastagId) };
  }
}
