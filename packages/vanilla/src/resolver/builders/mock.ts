import type { NodeBuilder } from '../builder';
import type { Product } from '../../shared/types';
import { CG_DATASET, CG_ROLE } from '../../shared/attributes';
import { groupProducts } from '../aggregation';

export function createMockBuilder(nodeKind: string): NodeBuilder {
  return ({ node, doc, products, selection }) => {
    const el = doc.createElement('div');

    el.dataset[CG_DATASET.node] = nodeKind;

    el.dataset[CG_DATASET.type] = node.type;

    if (nodeKind === 'input_body') {
      const cta = (node.selection as { type?: string } | undefined)?.type === 'cta';

      if (selection?.multiple) {
        el.dataset[CG_DATASET.selectMode] = 'multiple';

        if (selection.maxSelect) el.dataset[CG_DATASET.maxSelect] = String(selection.maxSelect);
      }

      stampOptions(el, doc, products ?? [], node.aggregate_products === true, selection?.control ?? 'radio', cta);

      if (node.opt_out) {
        const decline = doc.createElement(cta ? 'div' : 'label');

        decline.dataset[CG_DATASET.role] = CG_ROLE.decline;

        decline.dataset[CG_DATASET.optionId] = 'opt_out';

        decline.dataset[CG_DATASET.productIds] = '';

        if (cta) {
          const control = doc.createElement('button');

          control.dataset[CG_DATASET.role] = CG_ROLE.decline;

          control.dataset[CG_DATASET.optionId] = 'opt_out';

          decline.append(control);
        } else {
          const control = doc.createElement('input');

          control.type = 'radio';

          control.dataset[CG_DATASET.role] = CG_ROLE.selectionControl;

          decline.append(control);
        }

        el.append(decline);
      }
    }

    return el;
  };
}

function stampOptions(
  container: HTMLElement,
  doc: Document,
  products: Product[],
  aggregate: boolean,
  controlType: 'radio' | 'checkbox',
  cta = false,
): void {
  const groups = groupProducts(products, aggregate);

  groups.forEach((group, index) => {
    const option = doc.createElement(cta ? 'div' : 'label');

    option.dataset[CG_DATASET.role] = CG_ROLE.option;

    // Matches the real input_body builder: every option carries a stable
    // option id, the selection identity is never a quote id.
    const optionId = `opt_in_${index + 1}`;

    option.dataset[CG_DATASET.optionId] = optionId;

    option.dataset[CG_DATASET.productIds] = group.productIds.join(' ');

    if (cta) {
      const button = doc.createElement('button');

      button.dataset[CG_DATASET.role] = CG_ROLE.submit;

      button.dataset[CG_DATASET.optionId] = optionId;

      button.dataset[CG_DATASET.productIds] = group.productIds.join(' ');

      option.append(button);
    } else {
      const control = doc.createElement('input');

      control.type = controlType;

      control.dataset[CG_DATASET.role] = CG_ROLE.selectionControl;

      option.append(control);
    }

    container.append(option);
  });
}
