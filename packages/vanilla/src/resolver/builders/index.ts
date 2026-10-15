import { registerBuilders } from '../registry';
import { headerBuilder } from './header';
import { topBodyBuilder } from './top-body';
import { bottomBodyBuilder } from './bottom-body';
import { footerBuilder } from './footer';
import { inputBodyBuilder } from './input-body';

export function registerSectionBuilders(): void {
  registerBuilders({
    header: headerBuilder,
    top_body: topBodyBuilder,
    input_body: inputBodyBuilder,
    bottom_body: bottomBodyBuilder,
    footer: footerBuilder,
  });
}
