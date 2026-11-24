import { alpha, palette } from './palette';

/**
 * Semantic colour tokens. The rest of the app uses ONLY these names.
 * Built exclusively from `palette` – never add raw colour values here.
 */
export const colors = {
  background: {
    gradientStart: palette.indigo700,
    gradientMid: palette.indigo900,
    gradientEnd: palette.indigo950,
    glow: palette.violetGlow,
    /**
     * Onboarding header: a flat base with soft violet glows (OnboardingBackground). Sign In / Create
     * Account keep the diagonal gradient above: their Figma frames use a different background.
     */
    onboardingBase: palette.indigo975,
  },
  primary: {
    main: palette.violet500,
    gradientEnd: palette.violet400,
    contrastText: palette.white,
    /** Disabled primary button: solid grey fill, white label, no gradient. */
    disabled: palette.mist300,
  },
  text: {
    primary: palette.white,
    secondary: palette.mist100,
    placeholder: palette.slate400,
    link: palette.violet500,
    /** Labels, typed text and titles on the light onboarding sheet. */
    onLight: palette.ink900,
    /** Placeholders, "Or", hints and the "/4" step total. */
    onLightMuted: palette.slate400,
    /** The current step number ("1" in "1/4"). */
    stepCurrent: palette.lime400,
  },
  input: {
    background: alpha(palette.mist100, 0.08),
    border: alpha(palette.mist100, 0.16),
    borderFocused: alpha(palette.violet500, 0.9),
    caret: palette.mist100,
    /** TextField variant="light", DateField and UploadBox. */
    lightBackground: palette.mist100,
    lightBorder: alpha(palette.black, 0.04),
    lightBorderDashed: palette.slate400,
    lightIcon: palette.indigo950,
    /** Focused light field (step2-number-autofill.svg: a 1pt indigo950 border). */
    lightBorderFocused: palette.indigo950,
    /** Loading spinner inside a light field. */
    lightSpinner: palette.violet500,
  },
  chip: {
    background: palette.white,
    border: palette.mist100,
    selectedBorder: palette.violet500,
    /** Check-circle after the selected chip's label. */
    selectedIcon: palette.violet500,
  },
  progress: {
    track: alpha(palette.white, 0.16),
    fill: palette.lime400,
  },
  avatar: {
    background: palette.mist100,
    border: alpha(palette.black, 0.04),
    selectedRing: palette.violet500,
    badge: palette.violet500,
    badgeIcon: palette.mist50,
    placeholder: alpha(palette.slate400, 0.5),
  },
  surface: {
    card: alpha(palette.mist100, 0.08),
    cardBorder: alpha(palette.mist100, 0.16),
    iconButton: palette.navy600,
    iconButtonBorder: palette.navy500,
    /** Toasts: the darkest backdrop tone so they read above the gradient. */
    toast: palette.indigo950,
    toastBorder: alpha(palette.mist100, 0.16),
    shadow: palette.black,
    /** Bottom sheets: same tone as toasts, over a dimmed scrim. */
    sheet: palette.indigo950,
    sheetBorder: alpha(palette.mist100, 0.16),
    scrim: alpha(palette.black, 0.6),
    divider: alpha(palette.mist100, 0.16),
    handle: alpha(palette.mist100, 0.3),
    /** Onboarding: the light content sheet and the light bottom sheet. */
    sheetLight: palette.mist50,
    /** Dimmed backdrop behind the light bottom sheet (Figma: black 30%). */
    scrimLight: alpha(palette.black, 0.3),
    /** Round close (X) / remove buttons on light surfaces. */
    iconButtonLight: palette.mist200,
    dividerLight: palette.mist100,
    /** Upload icon circle in the empty UploadBox. */
    iconCircleLight: alpha(palette.black, 0.04),
  },
  accent: {
    biometric: palette.lime400,
  },
  status: {
    error: palette.red400,
    /** Inline errors on light surfaces (AA contrast). */
    errorOnLight: palette.red600,
  },
  /** Dashboard, drawer and the light screens behind it (design/dashboard). */
  dashboard: {
    headerBase: palette.indigo950,
    /** The blurred violet glow behind the logo (Figma: violet 80% blurred 177). */
    headerGlow: alpha(palette.violetGlow, 0.8),
    /** Light content area under the header; also the light screens' background. */
    background: palette.mist50,
    card: palette.white,
    cardBorder: alpha(palette.black, 0.08),
    tile: palette.mist100,
    tileBorder: alpha(palette.black, 0.04),
    tileIconCircle: palette.mist150,
    tileIcon: palette.indigo950,
    tileDisabled: alpha(palette.mist100, 0.6),
    tileTitle: palette.ink900,
    count: palette.violet500,
    countAlert: palette.red500,
    disabledText: alpha(palette.slate400, 0.6),
    sectionTitle: palette.brown900,
    muted: palette.slate400,
    headerIconButton: palette.navy600,
    headerIconButtonBorder: palette.navy500,
    headerIcon: palette.mist100,
    sos: palette.orange400,
    sosIcon: palette.ink900,
    dotActive: palette.lime400,
    dotInactive: alpha(palette.black, 0.12),
    /** "Your Profile info pending" banner. */
    banner: palette.lime400,
    bannerText: palette.ink900,
    progressTrack: palette.white,
    progressFill: palette.violet500,
    /** "Check your vehicle health" banner. */
    healthOverlay: alpha(palette.black, 0.44),
    healthRingTrack: alpha(palette.white, 0.5),
    healthRingFill: palette.lime400,
    healthRingCircle: alpha(palette.black, 0.5),
    healthRingBorder: alpha(palette.white, 0.18),
    healthCheck: palette.green500,
    onImage: palette.white,
    quickLink: palette.white,
    quickLinkShadow: alpha(palette.black, 0.04),
    /** Bottom tabs. */
    tabBar: palette.white,
    tabBarBorder: palette.mist175,
    tabActiveCircle: palette.violet500,
    tabActiveIcon: palette.white,
    tabActiveLabel: palette.ink900,
    tabInactive: palette.slate400,
    tabIndicator: palette.violet500,
    drawer: palette.white,
    drawerRowIcon: palette.slate400,
    drawerRowText: palette.ink900,
    drawerLogout: palette.violet500,
    drawerDivider: palette.mist100,
    pillBorder: palette.grey300,
    pillDot: palette.violet500,
    statusActive: palette.violet500,
    statusExpiring: palette.orange400,
    statusExpired: palette.red500,
    verified: palette.green500,
    verifiedBackground: alpha(palette.green500, 0.16),
    verifiedCheck: palette.white,
    chip: alpha(palette.violet500, 0.08),
    chipBorder: alpha(palette.violet500, 0.4),
    actionButton: palette.mist50,
    rowIconTile: palette.mist50,
    alert: palette.red500,
    profileBadge: palette.lime400,
    profileBadgeIcon: palette.indigo950,
  },
  /** Onboarding 3/3 document cards (design/dashboard/vehicle-documents-step.jpeg). */
  documents: {
    card: palette.white,
    iconTile: alpha(palette.violet500, 0.08),
    icon: palette.violet500,
    uploadTile: alpha(palette.violet500, 0.08),
    manualTile: palette.white,
    manualTileBorder: alpha(palette.violet500, 0.3),
    tileIcon: palette.violet500,
    tileTitle: palette.ink900,
    selectorBorder: alpha(palette.violet500, 0.6),
    added: palette.green500,
    addedBackground: alpha(palette.green500, 0.12),
  },
  /** Book a Service flow (design/book-service step1–4.1). */
  booking: {
    background: palette.mist50,
    title: palette.brown900,
    subtitle: palette.grey500,
    text: palette.ink900,
    meta: palette.grey550,
    muted: palette.slate400,
    link: palette.violet500,
    /** Stepper: done / current circles and the lines between done steps. */
    stepActive: palette.violet500,
    stepActiveText: palette.white,
    stepUpcoming: palette.white,
    stepUpcomingText: palette.grey500,
    stepLine: palette.violet500,
    stepLineUpcoming: alpha(palette.slate400, 0.5),
    stepLabel: palette.indigo950,
    stepLabelUpcoming: palette.grey500,
    /** White cards; the selected one has a violet border and a soft shadow (y 4, blur 8, 12%). */
    card: palette.white,
    cardBorder: alpha(palette.black, 0.08),
    cardSelectedBorder: palette.violet500,
    shadow: palette.black,
    /** Radios and checkboxes: unselected = mist fill + slate ring; selected = violet + white mark. */
    controlFill: palette.mist50,
    controlBorder: palette.slate400,
    controlSelected: palette.violet500,
    controlMark: palette.white,
    rowIcon: palette.slate400,
    /** Step 2 voice card (violet 16%), mic halo rings (12% / 25%) and the language pill. */
    voiceCard: alpha(palette.violet500, 0.16),
    voiceCardBorder: alpha(palette.black, 0.04),
    micHaloOuter: alpha(palette.violet500, 0.12),
    micHaloInner: alpha(palette.violet500, 0.25),
    mic: palette.violet500,
    micIcon: palette.white,
    languageBorder: alpha(palette.violet500, 0.3),
    languageIcon: palette.indigo950,
    /** The example-prompt box and the textarea (mist50, black 4% border). */
    inset: palette.mist50,
    insetBorder: alpha(palette.black, 0.04),
    insetBorderFocused: palette.indigo950,
    /** Step 3: search field, filter button, sort chips. */
    search: palette.mist100,
    filterButton: alpha(palette.black, 0.04),
    sortChip: palette.white,
    sortChipBorder: palette.mist100,
    sortChipText: palette.slate400,
    sortChipActive: palette.indigo950,
    sortChipActiveText: palette.white,
    logoBorder: alpha(palette.black, 0.04),
    /** Centre badges: tinted pill + matching text / icon. */
    pillBorder: alpha(palette.black, 0.04),
    badgeAuthorised: alpha(palette.violet500, 0.16),
    badgeAuthorisedText: palette.violet500,
    badgeCertified: alpha(palette.lime400, 0.24),
    badgeCertifiedText: palette.indigo950,
    badgeMultiBrand: alpha(palette.slate400, 0.24),
    badgeMultiBrandText: palette.slate400,
    badgeRating: alpha(palette.orange400, 0.16),
    star: palette.orange400,
    badgeRatingText: palette.slate400,
    badgeDistance: palette.mist100,
    badgeDistanceText: palette.slate400,
    /** Step 4: date / slot chips, address + phone rows, dividers. */
    chip: palette.white,
    chipBorder: palette.mist100,
    chipText: palette.slate400,
    chipSelectedText: palette.ink900,
    field: palette.mist50,
    fieldBorder: alpha(palette.black, 0.08),
    fieldIcon: palette.slate400,
    fieldDisabledText: palette.slate400,
    divider: alpha(palette.black, 0.08),
    /** Map-pin placeholder in "Add new address". */
    mapPlaceholder: palette.mist100,
    /** Congratulations: halo rings around the check. */
    successHaloOuter: alpha(palette.violet500, 0.08),
    successHaloInner: alpha(palette.violet500, 0.16),
    success: palette.violet500,
  },
  statusBar: 'light-content',
} as const;

/** Shape every colour scheme (e.g. a future light theme) must satisfy. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type AppColors = Omit<Widen<typeof colors>, 'statusBar'> & {
  statusBar: 'light-content' | 'dark-content';
};

/** Dot-paths to every leaf colour token, e.g. 'text.secondary'. */
export type ColorToken = {
  [G in Exclude<keyof AppColors, 'statusBar'>]: `${G & string}.${keyof AppColors[G] & string}`;
}[Exclude<keyof AppColors, 'statusBar'>];

export function resolveColor(scheme: AppColors, token: ColorToken): string {
  const [group, key] = token.split('.') as [keyof AppColors, string];
  return (scheme[group] as Record<string, string>)[key];
}
