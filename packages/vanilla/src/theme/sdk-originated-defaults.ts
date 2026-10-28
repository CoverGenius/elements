import type { ThemableVariable } from './themable-variables';

// Authored literal values for themable variables that have no matching
// GUI token in coverGeniusDefaults. When a GUI token source becomes
// available, move the entry into WIRE_MAPPING and remove it from here.
//
// buildInternalThemeDefaults() in wire-mapping.ts merges these with
// the GUI-sourced values to produce the full defaults record.

// The px anchor every font-size resolves against. Shared with the host baseline
// so the :host declaration and the themable default cannot drift.
const FONT_SIZE_BASE_DEFAULT = '16px';

const sdkOriginatedDefaults: Partial<Record<ThemableVariable, string>> = {
  fontSizeBase: FONT_SIZE_BASE_DEFAULT,
  testimonialPanelStarColor: '#F2B544',
  priceBlockFontSize: '1.5rem',
  priceFontSize: '1rem',
  priceFontWeight: '500',
  testimonialRatedBackgroundColor: '#F0F7F0',
  testimonialRatedTextColor: '#2D5E2D',
  testimonialRatedBorderColor: '#A7D7A7',
  testimonialPlainBackgroundColor: '#EDF0F3',
  testimonialPanelBackgroundColor: '#A7D7A7',
  badgeBackgroundColor: '#008800',
  badgeBorderRadius: '8rem',
  badgeFontSize: '0.625rem',
  badgeTextColor: '#ffffff',
  benefitPillBackgroundColor: '#F0F4F8',
  benefitPillBorderRadius: '6.25rem',
  benefitTickColor: '#008800',
  buttonBackgroundColor: '#0057ff',
  buttonTextColor: '#fff',
  buttonHoverBackgroundColor: '#1241CE',
  buttonSecondaryBackgroundColor: '#ffffff',
  buttonSecondaryHoverBackgroundColor: '#EEF4FE',
  buttonSelectedPositiveBackgroundColor: '#F2FAF8',
  buttonSelectedPositiveBorderColor: '#008068',
  buttonSelectedPositiveTextColor: '#008068',
  buttonSelectedNegativeBackgroundColor: '#EFEFEF',
  buttonSelectedNegativeBorderColor: '#989898',
  buttonSelectedNegativeTextColor: '#2D2D2D',
  disclaimerColor: '#73777C',
  inputBodyBorderRadius: '0.25rem',
  inputBodyBorderWidth: '1px',
  listHeadingColor: '#73777C',
  priceLabelColor: '#2d2d2d',
  requiredPanelTextColor: '#73777C',
  secondaryTextColor: '#73777C',
  sectionHeadingColor: '#73777C',
  subheadingColor: '#73777C',
  linkDecoration: 'none',
  topInfoPanelBackgroundColor: '#fff9de',
  bottomInfoPanelBackgroundColor: '#EDF0F3',
  bottomInfoPanelTextColor: '#001833',
  selectionBorderColor: '#C5CAD1',
  panelBorderColor: '#C5CAD1',
  panelBorderWidth: '0',
  panelBorderRadius: '0',
  panelPadding: '0',
  panelSectionGap: '16px',
  panelHeaderGap: '4px',
};

export { FONT_SIZE_BASE_DEFAULT, sdkOriginatedDefaults };
