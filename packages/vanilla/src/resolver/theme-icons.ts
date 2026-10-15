import type { ThemeProfile } from '../shared/types';

type IconKey = 'header' | 'footer_logo' | 'top_info_panel';

const ICON_DEFAULTS: Record<IconKey, string> = {
  header: 'header-shield',
  footer_logo: 'xcover-logo',
  top_info_panel: 'info',
};

export function resolveIconName(theme: ThemeProfile | undefined, key: IconKey): string {
  const override = theme?.icons?.[key];

  return typeof override === 'string' && override.length > 0 ? override : ICON_DEFAULTS[key];
}
