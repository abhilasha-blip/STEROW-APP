/**
 * Profile completion (dashboard "Your Profile info pending" badge/ring, My Profile "x% Completed").
 *
 * Six equally weighted items, in the order "Complete Now" walks them (profile → licence → vehicle):
 *   fullName · email · photo · mobile (verified by OTP at sign-up, so always done) ·
 *   drivingLicence (number + file saved) · vehicleDocument (at least one vehicle with a document).
 * percent = round(done / total × 100).
 */
export const COMPLETION_ITEMS = ['fullName', 'email', 'photo', 'mobile', 'drivingLicence', 'vehicleDocument'] as const;
export type CompletionItem = (typeof COMPLETION_ITEMS)[number];

/** Where "Complete Now" sends the user for a missing item (onboarding screens). */
export type CompletionStep = 'Step1Profile' | 'Step2DrivingLicence' | 'Step3Documents';

export type CompletionUser = {
  fullName?: string | null;
  email?: string | null;
  /** Saved avatar (user_details.avatar_url); the signed URL may fail, the path is the truth. */
  avatarPath?: string | null;
} | null | undefined;

export type CompletionDl = { dlNumber?: string | null; documentPath?: string | null } | null | undefined;

/** A vehicle and how many documents (RC, insurance, PUC, FASTag) it has. */
export type CompletionVehicle = { documentCount: number };

export type ProfileCompletion = {
  /** 0–100, rounded. */
  percent: number;
  /** Missing items, in checklist order (empty at 100%). */
  missing: CompletionItem[];
  /** The screen for the first missing item ("Complete Now"), null at 100%. */
  nextStep: CompletionStep | null;
};

const STEP_FOR: Record<CompletionItem, CompletionStep | null> = {
  fullName: 'Step1Profile',
  email: 'Step1Profile',
  photo: 'Step1Profile',
  mobile: null,
  drivingLicence: 'Step2DrivingLicence',
  vehicleDocument: 'Step3Documents',
};

const filled = (s: string | null | undefined) => !!s && s.trim().length > 0;

export function getProfileCompletion(
  user: CompletionUser,
  dl: CompletionDl,
  vehicles: readonly CompletionVehicle[] | null | undefined,
): ProfileCompletion {
  const done: Record<CompletionItem, boolean> = {
    fullName: filled(user?.fullName),
    email: filled(user?.email),
    photo: filled(user?.avatarPath),
    mobile: true,
    drivingLicence: filled(dl?.dlNumber) && filled(dl?.documentPath),
    vehicleDocument: (vehicles ?? []).some(v => v.documentCount > 0),
  };
  const missing = COMPLETION_ITEMS.filter(item => !done[item]);
  const total = COMPLETION_ITEMS.length;
  return {
    percent: Math.round(((total - missing.length) / total) * 100),
    missing,
    nextStep: missing.map(item => STEP_FOR[item]).find(step => step !== null) ?? null,
  };
}
