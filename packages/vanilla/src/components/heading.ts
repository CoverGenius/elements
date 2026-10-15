export type HeadingVariant = 'header' | 'section';

export interface HeadingConfig {
  text: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4';
  variant?: HeadingVariant;
}

export function buildHeading({ text, level = 'h2', variant }: HeadingConfig): HTMLElement {
  const el = document.createElement(level);

  el.className = variant ? `cge-heading cge-heading-${variant}` : 'cge-heading';
  el.textContent = text;

  return el;
}
