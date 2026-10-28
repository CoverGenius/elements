import { coverGeniusDefaults } from './cover-genius-defaults';
import { FONT_SIZE_BASE_DEFAULT, sdkOriginatedDefaults } from './sdk-originated-defaults';
import { SEMANTIC_FAN_OUT, THEMABLE_VARIABLES } from './themable-variables';
import type { ThemableVariable } from './themable-variables';

type Outcome = 'component' | 'semantic' | 'sdk-originated' | 'fan-out';

interface MappingRow {
  readonly source: keyof typeof coverGeniusDefaults | null;
  readonly outcome: Outcome;
  readonly value: string;
  readonly notes?: string;
}

// ── Wire-mapping table ─────────────────────────────────────────────
// Every themable variable (themable-variables.ts's THEMABLE_VARIABLES,
// which grows as components introduce new --cge-* properties) mapped to
// a coverGeniusDefaults entry or an SDK-originated value. Reviewed
// per-variable; see notes for ambiguities and rejected alternatives.

const WIRE_MAPPING: Record<ThemableVariable, MappingRow> = {
  accentColor: {
    source: '--cge-color-global-info',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-global-info'].light,
    notes:
      'Rejected --cge-color-bg-accent: selectionAccentColor (the only current consumer, via fan-out) needs the brand action blue, not a background accent tint.',
  },
  errorColor: {
    source: '--cge-color-global-error',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-global-error'].light,
    notes: 'Also --cge-alert-error-content-color (same #d62b00); semantic global preferred as more general-purpose.',
  },
  linkColor: {
    source: '--cge-color-typography-link',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-typography-link'].light,
    notes: 'Also --cge-link-common-content-color-default (same #0057ff); semantic preferred.',
  },
  fontSizeBase: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.fontSizeBase ?? FONT_SIZE_BASE_DEFAULT,
    notes:
      'Anchor for every text size (font-size is calc(N * this)). Absolute px only, enforced in applyTheme; no gui token, the design system root is a fixed 16px.',
  },
  panelBackgroundColor: {
    source: '--cge-color-bg-white',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-bg-white'].light,
    notes:
      'Rejected --cge-color-bg-card (#f7f7f7): card bg is for embedded cards; panel (outermost container) uses white.',
  },
  panelBorderColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.panelBorderColor ?? '#C5CAD1',
    notes:
      'Rejected --cge-color-border-card (#c8c8c8): kept the panel border colour. Border is off by default (panelBorderWidth: 0), so this only surfaces once a partner opts into a visible panel border.',
  },
  panelBorderWidth: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.panelBorderWidth ?? '0',
    notes:
      'Off by default: consumers typically wrap the panel in their own container. Rejected --cge-content-card-row-border-width-lg (~1px): that was a placeholder before this variable had a real consumer.',
  },
  panelBorderRadius: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.panelBorderRadius ?? '0',
    notes:
      'Off by default, same rationale as panelBorderWidth. Rejected --cge-accordion-common-container-border-radius-lg (0.75rem): that was a placeholder before this variable had a real consumer.',
  },
  panelPadding: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.panelPadding ?? '0',
    notes:
      'Off by default: consumers typically wrap the panel in their own container. No gui "outer panel" token exists.',
  },
  panelSectionGap: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.panelSectionGap ?? '16px',
    notes: 'Default gap between adjacent panel sections (header-to-top_body uses panelHeaderGap instead).',
  },
  panelHeaderGap: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.panelHeaderGap ?? '4px',
    notes: 'Narrower gap specifically between the header and top_body sections.',
  },
  headerHeadingColor: {
    source: '--cge-heading-color',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-heading-color'].light,
  },
  headerHeadingSize: {
    source: '--cge-heading-sm-typography-font-size-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-heading-sm-typography-font-size-lg'].light,
    notes:
      'Heading sizes range xxxs (0.875rem) to lg (2rem). Chose sm (1.5rem) for panel header. Rejected: lg (page-level), xs (too small).',
  },
  headerIconColor: {
    source: '--cge-color-icon-dark',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-icon-dark'].light,
  },
  headerIconSize: {
    source: '--cge-alert-common-icon-lg-size-width-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-common-icon-lg-size-width-lg'].light,
    notes: 'Alert large icon (1.5rem) is the closest match for header icon size.',
  },
  inputBodyBorderColor: {
    source: '--cge-color-border-form-input',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-border-form-input'].light,
  },
  inputBodyBorderWidth: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.inputBodyBorderWidth ?? '1px',
    notes: 'Rejected the gui form-input border-width token (0.0625rem, hairline): kept the reviewed prior 1px.',
  },
  inputBodyBorderRadius: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.inputBodyBorderRadius ?? '0.25rem',
    notes:
      'Rejected the alert-container radius (0.5rem): kept the reviewed prior 0.25rem, matching the gui form-input radius scale.',
  },
  optInBackgroundColor: {
    source: '--cge-color-bg-white',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-bg-white'].light,
    notes: 'No opt-in-specific token in gui. White is the standard active/selected card bg.',
  },
  optInBorderColor: {
    source: '--cge-color-border-card',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-border-card'].light,
  },
  optInBorderWidth: {
    source: '--cge-alert-common-container-border-width-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-common-container-border-width-lg'].light,
    notes:
      'No action-card border-width token. Alert container border-width (0.0625rem) is the standard container border.',
  },
  optInBorderRadius: {
    source: '--cge-action-card-container-border-radius-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-action-card-container-border-radius-lg'].light,
    notes: 'Opt-in card is structurally an action card.',
  },
  optOutBackgroundColor: {
    source: '--cge-color-bg-light',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-bg-light'].light,
    notes: 'Muted bg for inactive/deselected state.',
  },
  optOutBorderColor: {
    source: '--cge-color-border-light',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-border-light'].light,
  },
  optOutBorderRadius: {
    source: '--cge-action-card-container-border-radius-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-action-card-container-border-radius-lg'].light,
    notes: 'Opt-out card is structurally an action card. Same source as optInBorderRadius.',
  },
  selectionAccentColor: {
    source: null,
    outcome: 'fan-out',
    value: '',
    notes: 'Fan-out to accentColor via SEMANTIC_FAN_OUT.',
  },
  selectionBorderColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.selectionBorderColor ?? '#C5CAD1',
  },
  selectionBorderWidth: {
    source: '--cge-status-common-container-border-width-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-status-common-container-border-width-lg'].light,
    notes: 'Status container border-width (0.0625rem). Selection and status are structurally similar card states.',
  },
  badgeBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.badgeBackgroundColor ?? '#008800',
    notes: 'The gui success-badge token reads as too teal against the panel; kept the reviewed prior green.',
  },
  badgeTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.badgeTextColor ?? '#ffffff',
    notes:
      'Matches the sdk-originated badgeBackgroundColor; white reads correctly against it, the gui label token does not.',
  },
  badgeBorderRadius: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.badgeBorderRadius ?? '8rem',
    notes: 'Rejected the gui badge-container token (0.5rem, boxy); badge reads as a fully-rounded pill at 8rem.',
  },
  benefitTickColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.benefitTickColor ?? '#008800',
    notes: 'Rejected --cge-color-global-success: kept the reviewed prior green to match badgeBackgroundColor.',
  },
  benefitPillBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.benefitPillBackgroundColor ?? '#F0F4F8',
    notes: 'Rejected --cge-color-bg-success: kept the reviewed prior pale blue-grey pill background.',
  },
  benefitPillColor: {
    source: '--cge-color-global-success',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-global-success'].light,
  },
  benefitPillBorderRadius: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.benefitPillBorderRadius ?? '6.25rem',
    notes: 'Rejected --cge-tag-container-border-radius-lg (8rem): kept the reviewed prior 6.25rem.',
  },
  warningPanelBackgroundColor: {
    source: '--cge-alert-warning-container-bg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-warning-container-bg'].light,
    notes: 'Also --cge-color-bg-warning (same #fef8f3); component-scoped preferred.',
  },
  warningPanelBorderColor: {
    source: '--cge-alert-warning-container-border-color',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-warning-container-border-color'].light,
  },
  warningPanelTextColor: {
    source: '--cge-alert-warning-content-color',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-warning-content-color'].light,
  },
  infoPanelBackgroundColor: {
    source: '--cge-alert-info-container-bg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-info-container-bg'].light,
  },
  infoPanelBorderColor: {
    source: '--cge-alert-info-container-border-color',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-info-container-border-color'].light,
  },
  infoPanelTextColor: {
    source: '--cge-alert-info-content-color',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-info-content-color'].light,
  },
  topInfoPanelBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.topInfoPanelBackgroundColor ?? '#fff9de',
    notes: 'No gui token for this section-specific info panel; warm yellow per design.',
  },
  bottomInfoPanelBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.bottomInfoPanelBackgroundColor ?? '#EDF0F3',
    notes:
      'No gui token for this section-specific info panel; matches the neutral panel grey used by testimonialPlainBackgroundColor.',
  },
  bottomInfoPanelTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.bottomInfoPanelTextColor ?? '#001833',
    notes: 'No gui token for this navy; infoPanelTextColor (#0057ff alert-blue) reads wrong on the neutral grey panel.',
  },
  requiredPanelBackgroundColor: {
    source: '--cge-color-bg-error',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-bg-error'].light,
    notes:
      'No "required" component in gui. Error bg for required/mandatory semantics. Also --cge-alert-error-container-bg (same #fff4f2).',
  },
  requiredPanelBorderColor: {
    source: '--cge-alert-error-container-border-color',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-error-container-border-color'].light,
  },
  requiredPanelTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.requiredPanelTextColor ?? '#73777C',
    notes:
      'Rejected --cge-alert-error-content-color (#d62b00, red): the reviewed default reads as neutral grey, not error red.',
  },
  requiredTextColor: {
    source: null,
    outcome: 'fan-out',
    value: '',
    notes:
      'Required (error) state text. Fans out to errorColor via SEMANTIC_FAN_OUT. Distinct from requiredPanelTextColor, the resting panel text.',
  },
  requiredBorderColor: {
    source: null,
    outcome: 'fan-out',
    value: '',
    notes:
      'Required (error) state option border. Fans out to errorColor via SEMANTIC_FAN_OUT. Distinct from requiredPanelBorderColor, the resting panel border.',
  },
  credibilityTextColor: {
    source: '--cge-color-typography-light',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-typography-light'].light,
    notes: 'Credibility message text color.',
  },
  testimonialPanelBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.testimonialPanelBackgroundColor ?? '#A7D7A7',
    notes: 'Rejected --cge-color-bg-white: kept the reviewed prior soft green background.',
  },
  testimonialPanelBorderColor: {
    source: '--cge-color-border-card',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-border-card'].light,
    notes: 'Testimonial panel card border.',
  },
  testimonialPanelStarColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.testimonialPanelStarColor ?? '#ffb800',
    notes: 'Rating star icons fill color.',
  },
  disclaimerColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.disclaimerColor ?? '#73777C',
    notes: 'Rejected --cge-color-typography-light (#6b6b6b): kept the reviewed prior #73777C.',
  },
  disclaimerSize: {
    source: '--cge-typography-content-xxs-font-size',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-typography-content-xxs-font-size'].light,
    notes: 'Rejected xs (0.875rem); xxs (0.75rem) is typical disclaimer size.',
  },
  separatorColor: {
    source: '--cge-color-border-divider',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-border-divider'].light,
    notes: 'Also --cge-divider-common-container-bg (same #c8c8c8); semantic preferred.',
  },
  separatorWidth: {
    source: '--cge-divider-common-container-size-width-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-divider-common-container-size-width-lg'].light,
    notes: 'Separator = divider in gui token terms.',
  },
  buttonBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonBackgroundColor ?? '#0057ff',
    notes:
      'Rejected --cge-button-primary-container-bg-default (#ffe600, yellow CTA): kept the reviewed prior brand blue.',
  },
  buttonTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonTextColor ?? '#fff',
    notes:
      'Matches the sdk-originated buttonBackgroundColor; white reads correctly against blue, not against the gui yellow-CTA label color.',
  },
  buttonHoverBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonHoverBackgroundColor ?? '',
    notes: 'The gui primary hover token is the yellow-CTA family, so this is authored.',
  },
  buttonSecondaryBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSecondaryBackgroundColor ?? '',
  },
  buttonSecondaryHoverBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSecondaryHoverBackgroundColor ?? '',
  },
  buttonSelectedPositiveBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSelectedPositiveBackgroundColor ?? '',
  },
  buttonSelectedPositiveBorderColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSelectedPositiveBorderColor ?? '',
  },
  buttonSelectedPositiveTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSelectedPositiveTextColor ?? '',
  },
  buttonSelectedNegativeBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSelectedNegativeBackgroundColor ?? '',
  },
  buttonSelectedNegativeBorderColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSelectedNegativeBorderColor ?? '',
  },
  buttonSelectedNegativeTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.buttonSelectedNegativeTextColor ?? '',
  },
  buttonBorderRadius: {
    source: '--cge-button-common-container-border-radius-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-button-common-container-border-radius-lg'].light,
  },
  buttonFontSize: {
    source: '--cge-button-common-label-typography-font-size-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-button-common-label-typography-font-size-lg'].light,
    notes: 'Rejected the size-scoped lg/md/sm sub-family (button-size-specific); this is the common label token.',
  },
  badgeFontSize: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.badgeFontSize ?? '0.625rem',
    notes: 'Rejected --cge-badge-common-label-typography-font-size-lg (0.875rem): kept the reviewed prior 0.625rem.',
  },
  badgeFontWeight: {
    source: '--cge-badge-common-label-typography-font-weight-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-badge-common-label-typography-font-weight-lg'].light,
  },
  headerHeadingFontWeight: {
    source: '--cge-heading-typography-font-weight-semi-bold-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-heading-typography-font-weight-semi-bold-lg'].light,
    notes: 'Rejected bold (700): panel header reads as semi-bold today.',
  },
  sectionHeadingSize: {
    source: '--cge-heading-xs-typography-font-size-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-heading-xs-typography-font-size-lg'].light,
    notes: 'One tier below the panel header (sm, 1.5rem). Rejected xxs (too small) and sm (already headerHeadingSize).',
  },
  sectionHeadingFontWeight: {
    source: '--cge-heading-page-subtext-typography-font-weight-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-heading-page-subtext-typography-font-weight-lg'].light,
    notes: 'top_body/bottom_body headings render at 400 (regular), distinct from the header heading (600).',
  },
  sectionHeadingColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.sectionHeadingColor ?? '#73777C',
    notes: 'Rejected --cge-color-typography-light (#6b6b6b): kept the reviewed prior #73777C.',
  },
  iconSize: {
    source: '--cge-alert-common-icon-lg-size-width-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-alert-common-icon-lg-size-width-lg'].light,
    notes: 'Same source as headerIconSize; a generic icon default should match, not diverge.',
  },
  secondaryTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.secondaryTextColor ?? '#73777C',
    notes: 'Rejected --cge-color-typography-light (#6b6b6b): kept the reviewed prior #73777C.',
  },
  primaryTextColor: {
    source: '--cge-color-typography-dark',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-typography-dark'].light,
    notes: 'Full-strength body text (testimonial heading, trustpilot subtitle/rating, sales-count text).',
  },
  listHeadingColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.listHeadingColor ?? '#73777C',
    notes: 'Rejected --cge-color-typography-light (#6b6b6b): kept the reviewed prior #73777C.',
  },
  priceLabelColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.priceLabelColor ?? '#2d2d2d',
    notes: 'Rejected --cge-color-typography-light (#6b6b6b, muted): kept the reviewed prior full-strength #2d2d2d.',
  },
  subheadingColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.subheadingColor ?? '#73777C',
    notes: 'Rejected --cge-color-typography-light (#6b6b6b): kept the reviewed prior #73777C.',
  },
  termsLinkFontSize: {
    source: '--cge-link-common-content-typography-font-size-lg',
    outcome: 'component',
    value: coverGeniusDefaults['--cge-link-common-content-typography-font-size-lg'].light,
  },
  priceBlockFontSize: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.priceBlockFontSize ?? '1.5rem',
    notes:
      'No gui "large price/amount" typography token; emphasized price display is SDK composition, not a gui component.',
  },
  priceFontSize: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.priceFontSize ?? '1rem',
    notes: 'No gui "price" concept exists.',
  },
  priceFontWeight: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.priceFontWeight ?? '500',
    notes: 'No gui "price" concept exists.',
  },
  testimonialRatedBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.testimonialRatedBackgroundColor ?? '#F0F7F0',
    notes:
      'No gui "positive/rated testimonial" background token; closest candidate (--cge-color-bg-success) is a meaningfully different hue family.',
  },
  testimonialRatedTextColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.testimonialRatedTextColor ?? '#2D5E2D',
    notes: 'No matching gui green-text token exists.',
  },
  testimonialRatedBorderColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.testimonialRatedBorderColor ?? '#A7D7A7',
    notes: 'No matching gui green-border token exists.',
  },
  testimonialPlainBackgroundColor: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.testimonialPlainBackgroundColor ?? '#EDF0F3',
    notes: 'Closest gui token (--cge-color-bg-card, #f7f7f7) is close but not exact; kept as the reviewed literal.',
  },
  linkDecoration: {
    source: null,
    outcome: 'sdk-originated',
    value: sdkOriginatedDefaults.linkDecoration ?? 'none',
    notes: 'A text-decoration keyword, not a color/size any gui token models.',
  },
  bottomHeadingColor: {
    source: '--cge-color-typography-dark',
    outcome: 'semantic',
    value: coverGeniusDefaults['--cge-color-typography-dark'].light,
    notes: 'Matches primaryTextColor (same source): full-strength text, same tier as the sales-count icon/text.',
  },
};

// ── Generate internalThemeDefaults from the mapping table ──────────

type InternalThemeDefaults = Record<ThemableVariable, string>;

function buildInternalThemeDefaults(): InternalThemeDefaults {
  const result = {} as Record<ThemableVariable, string>;
  const variables = Object.keys(THEMABLE_VARIABLES) as ThemableVariable[];

  for (const variable of variables) {
    const row = WIRE_MAPPING[variable];

    if (row.outcome === 'fan-out') {
      const target = SEMANTIC_FAN_OUT[variable as keyof typeof SEMANTIC_FAN_OUT] as ThemableVariable | undefined;

      if (!target || !(target in WIRE_MAPPING)) {
        throw new Error(`Fan-out variable "${variable}" has no entry in SEMANTIC_FAN_OUT`);
      }

      result[variable] = WIRE_MAPPING[target].value;
      continue;
    }

    if (row.outcome === 'sdk-originated') {
      const authored = sdkOriginatedDefaults[variable];
      if (authored === undefined) {
        throw new Error(`sdk-originated variable "${variable}" missing from sdkOriginatedDefaults`);
      }
      result[variable] = authored;
      continue;
    }

    result[variable] = row.value;
  }

  return result;
}

const internalThemeDefaults: InternalThemeDefaults = buildInternalThemeDefaults();

export { WIRE_MAPPING, internalThemeDefaults };
export type { MappingRow, Outcome, InternalThemeDefaults };
