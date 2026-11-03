import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAG_CLICK_GUARD_MS, useDragClickGuard } from './useDragClickGuard';

function clickOn(anchor: HTMLAnchorElement): boolean {
  return anchor.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true }),
  );
}

describe('useDragClickGuard', () => {
  let anchor: HTMLAnchorElement;

  beforeEach(() => {
    vi.useFakeTimers();
    anchor = document.createElement('a');
    anchor.href = '/candidaturas/1';
    document.body.append(anchor);
  });

  afterEach(() => {
    vi.useRealTimers();
    anchor.remove();
  });

  it('cancela o clique disparado logo depois do arraste', () => {
    const { result } = renderHook(() => useDragClickGuard());

    act(() => result.current());

    expect(clickOn(anchor)).toBe(false);
  });

  it('não bloqueia o clique seguinte ao do arraste', () => {
    const { result } = renderHook(() => useDragClickGuard());

    act(() => result.current());
    clickOn(anchor);

    expect(clickOn(anchor)).toBe(true);
  });

  it('libera a trava sozinha quando nenhum clique é gerado', () => {
    const { result } = renderHook(() => useDragClickGuard());

    act(() => result.current());
    act(() => vi.advanceTimersByTime(DRAG_CLICK_GUARD_MS));

    expect(clickOn(anchor)).toBe(true);
  });
});
