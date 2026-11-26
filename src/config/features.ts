/**
 * Feature flags (code defaults; flip here once the backend confirms a feature). Tests override them with
 * __setFeatureFlagsForTests.
 */
export type FeatureFlags = {
  /**
   * Read the uploaded document (OCR) to pre-fill its details. Off until the public APP /ocr/* contract,
   * cost and consent are confirmed (API_PLAN O1, docs/api/ocr-findings.md): ocrService.read returns
   * "unavailable" and the user types the details, as before.
   */
  OCR_ENABLED: boolean;
};

export const FEATURE_DEFAULTS: Readonly<FeatureFlags> = Object.freeze({ OCR_ENABLED: false });

let current: FeatureFlags = { ...FEATURE_DEFAULTS };

export const isFeatureEnabled = (name: keyof FeatureFlags): boolean => current[name];

/** Test-only: override some flags (reset with no argument). */
export function __setFeatureFlagsForTests(next?: Partial<FeatureFlags>): void {
  current = { ...FEATURE_DEFAULTS, ...next };
}
