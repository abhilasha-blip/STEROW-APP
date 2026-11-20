/**
 * Render counting for perf regression tests.
 *
 *   jest.mock('@/components/Logo', () =>
 *     require('../test/renderCounter').tracked('Logo', jest.requireActual('@/components/Logo')));
 *
 * The module's default export is wrapped so every render bumps `renderCounts[name]`, keeping its memo /
 * forwardRef wrapper so the measurement reflects the real component.
 */
import React from 'react';

export const renderCounts: Record<string, number> = {};

export const resetRenderCounts = () => {
  for (const k of Object.keys(renderCounts)) {
    delete renderCounts[k];
  }
};

const bump = (name: string) => {
  renderCounts[name] = (renderCounts[name] ?? 0) + 1;
};

const MEMO = Symbol.for('react.memo');
const FORWARD_REF = Symbol.for('react.forward_ref');

type AnyComponent = { $$typeof?: symbol; type?: AnyComponent; compare?: unknown; render?: Function };

function wrap(name: string, comp: AnyComponent): unknown {
  if (comp.$$typeof === MEMO) {
    return React.memo(wrap(name, comp.type as AnyComponent) as React.FC, comp.compare as never);
  }
  if (comp.$$typeof === FORWARD_REF) {
    const render = comp.render as (p: unknown, r: unknown) => React.ReactNode;
    return React.forwardRef((p, r) => {
      bump(name);
      return render(p, r);
    });
  }
  const fn = comp as unknown as (p: unknown) => React.ReactNode;
  return (p: unknown) => {
    bump(name);
    return fn(p);
  };
}

/** A jest.mock factory result: the actual module with its default export counted. */
export function tracked(name: string, actual: { default: AnyComponent }) {
  return { __esModule: true, ...actual, default: wrap(name, actual.default) };
}
