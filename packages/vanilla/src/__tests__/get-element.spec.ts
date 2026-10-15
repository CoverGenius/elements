import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getElement } from '../core/get-element';
import { registerElements } from '../core/register';
import { resolveContext } from '../shared/context';
import { clearContainers, clearContexts, DEFAULT_TAG_NAME, getContainer, setContext } from '../core/registry';
import { registerBuilder, clearBuilders } from '../resolver/registry';
import { createMockBuilder } from '../resolver/builders/mock';
import { SECTION_ORDER } from '../resolver/layout';
import type { OfferResponse } from '../shared/types';

// A response that resolves to a rendered panel (valid presentation + a mock
// builder per section), for tests that assert the rendered state end to end.
const renderableOffer = (): OfferResponse =>
  ({
    id: 'o1',
    offer_config_id: 'oc1',
    offer_schema: 'schema-1',
    currency: 'USD',
    products: [],
    content: {},
    presentation: {
      schema_version: '1.0',
      ref: 'r1',
      variant: 'v1',
      theme: {},
      layout: { header: { type: 'default' } },
    },
  }) as unknown as OfferResponse;

// getElement() reads SDK state only and never queries the DOM. Registration
// defines the client, so getElement() returns undefined before registerElements()
// has run. The container map is process-wide, so tests seed a context per case
// and reset between them.
//
// registerElements()'s idempotency guard is process-global (first call wins), so
// clearContexts() below resets that guard between tests. It cannot undo
// customElements.define() itself (the platform allows a given constructor to
// back only one custom element definition, ever, in a registry): once the
// Element class has been defined by the real registerElements() call below, no
// test may call registerElements() again. Tests needing a live, connected,
// upgraded element seed the context with register() and create the element.

function register() {
  setContext(DEFAULT_TAG_NAME, resolveContext({ environment: 'sandbox' }));
}

afterEach(() => {
  clearContainers();
  clearContexts();
});

describe('getElement: registration gate', () => {
  it('returns undefined before registerElements() has run', () => {
    expect(getElement()).toBeUndefined();
  });

  it('returns a client once registered', () => {
    register();

    const client = getElement();

    expect(client).toBeDefined();
    expect(typeof client?.render).toBe('function');
    expect(typeof client?.on).toBe('function');
    expect(typeof client?.selection.set).toBe('function');
    expect(typeof client?.unmount).toBe('function');
  });
});

describe('getElement: singleton per placement', () => {
  beforeEach(() => {
    register();
  });

  it('returns the same client for the same ref', () => {
    expect(getElement('checkout-primary')).toBe(getElement('checkout-primary'));
  });

  it('returns different clients for different refs', () => {
    expect(getElement('panel-a')).not.toBe(getElement('panel-b'));
  });

  it('creates a container for the ref on first call', () => {
    getElement('lazy-created');

    expect(getContainer('lazy-created')).toBeDefined();
  });

  it('no-arg and a ref call resolve to different containers', () => {
    expect(getElement()).not.toBe(getElement('sidebar'));
  });
});

describe('getElement: selection through the public client', () => {
  beforeEach(() => {
    register();
  });

  it('selection.set then get round-trips through the client', () => {
    const client = getElement('sel');

    client?.selection.set('plan-a');

    expect(client?.selection.get()).toBe('plan-a');
  });

  it('selection.getAll returns [] with no selection and the option ids once set', () => {
    const client = getElement('sel-all');

    expect(client?.selection.getAll()).toEqual([]);

    client?.selection.set('plan-a');

    expect(client?.selection.getAll()).toEqual(['plan-a']);
  });

  it('selection.getAll is [] after reset', () => {
    const client = getElement('sel-all-reset');
    client?.selection.set('plan-a');

    client?.selection.reset();

    expect(client?.selection.getAll()).toEqual([]);
  });

  it('selection.reset clears the value through the client', () => {
    const client = getElement('sel-reset');
    client?.selection.set('plan-a');

    client?.selection.reset();

    expect(client?.selection.get()).toBeNull();
  });
});

// No beforeEach seeding a context here on purpose: registerElements()'s
// idempotency guard is process-global (first call wins), so this describe block
// must start with nothing registered. This is the one real, live registration
// for the whole file; every other test in this file seeds context directly via
// register().
describe('getElement: selection.required reflects onto a mounted element', () => {
  it('reflects the required flag onto the element via the client', () => {
    document.body.innerHTML = '';
    registerElements({ environment: 'sandbox' });
    const client = getElement('sel-required');
    const el = document.createElement(DEFAULT_TAG_NAME);
    el.setAttribute('data-presentation-ref', 'sel-required');
    document.body.appendChild(el);

    client?.selection.required();

    expect(el.hasAttribute('data-cg-elements-required')).toBe(true);
  });

  it('ignores required() while an option is selected and shows it again after reset', () => {
    register();
    document.body.innerHTML = '';
    const client = getElement('sel-required-selected');
    const el = document.createElement(DEFAULT_TAG_NAME);
    el.setAttribute('data-presentation-ref', 'sel-required-selected');
    document.body.appendChild(el);

    client?.selection.set('plan-a');
    client?.selection.required();

    expect(el.hasAttribute('data-cg-elements-required')).toBe(false);
    expect(client?.selection.get()).toBe('plan-a');

    client?.selection.reset();
    client?.selection.required();

    expect(el.hasAttribute('data-cg-elements-required')).toBe(true);
  });
});

describe('getElement: lazy binding through the public client', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does not throw when driving a client whose element is not in the DOM', () => {
    // No live element involved here, so the context-only helper is enough;
    // this does not need (and must not attempt) a second real registration.
    register();
    const client = getElement('not-mounted-yet');

    expect(() => {
      client?.render({
        id: 'o1',
        offer_config_id: 'oc1',
        offer_schema: 'schema-1',
        currency: 'USD',
        products: [],
        content: {},
        presentation: {},
      });
      client?.selection.set('plan-a');
      client?.on('change', () => {});
    }).not.toThrow();
  });

  it('binds queued state to the element once it upgrades', () => {
    // The 'selection.required' test above already ran customElements.define()
    // for <cg-elements>, which can only ever succeed once per class in this
    // process. clearContexts() wiped its context afterward, so seed it back with
    // register() (context only) rather than calling the real registerElements()
    // again. The tag is still a defined custom element at the DOM level, so
    // document.createElement() below upgrades normally.
    register();
    for (const section of SECTION_ORDER) {
      registerBuilder(section, 'default', createMockBuilder(section));
    }

    const client = getElement('deferred');
    // A valid presentation so the queued state is a rendered panel, held on the
    // container before mount and pushed into the shadow root on upgrade.
    client?.render(renderableOffer());

    const el = document.createElement(DEFAULT_TAG_NAME);
    el.setAttribute('data-presentation-ref', 'deferred');
    document.body.appendChild(el);

    expect(el.getAttribute('data-cg-elements-state')).toBe('rendered');
    expect(el.shadowRoot?.querySelector('[data-cg-node="header"]')).not.toBeNull();

    clearBuilders();
  });
});
