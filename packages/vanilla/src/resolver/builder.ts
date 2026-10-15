import type { SdkContext } from '../shared/context';
import type { Product, ThemeProfile } from '../shared/types';
import type { LayoutNode, HeaderNode, TopBodyNode, InputBodyNode, BottomBodyNode, FooterNode } from './layout';
import type { SelectionBehavior } from './selection';
import { SectionBundle } from './binding/routing';

export interface BuildArgs<TNode extends LayoutNode = LayoutNode> {
  node: TNode;
  content?: SectionBundle;
  selection?: SelectionBehavior;
  ctx: SdkContext;
  doc: Document;
  products?: Product[];
  theme?: ThemeProfile;
}

export type NodeBuilder<TNode extends LayoutNode = LayoutNode> = (args: BuildArgs<TNode>) => HTMLElement;

export interface SectionBuilderMap {
  header: NodeBuilder<HeaderNode>;
  top_body: NodeBuilder<TopBodyNode>;
  input_body: NodeBuilder<InputBodyNode>;
  bottom_body: NodeBuilder<BottomBodyNode>;
  footer: NodeBuilder<FooterNode>;
}
