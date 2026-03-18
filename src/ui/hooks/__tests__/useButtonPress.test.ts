import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useButtonPress } from '../useButtonPress.js';

/**
 * useButtonPress uses useCallback internally to memoize its event handlers.
 * We use renderHook from @testing-library/react to properly initialize React
 * context in the jsdom environment.
 *
 * Each handler mutates e.currentTarget.style.transform and
 * e.currentTarget.style.transition — those are the observable outputs.
 */

function makeMockEvent(): { currentTarget: { style: { transform: string; transition: string } } } {
  return { currentTarget: { style: { transform: '', transition: '' } } };
}

describe('useButtonPress', () => {
  describe('return value shape', () => {
    it('returns an object with onMouseDown, onMouseUp, and onMouseLeave handlers', () => {
      const { result } = renderHook(() => useButtonPress());
      expect(typeof result.current.onMouseDown, 'onMouseDown should be a function').toBe('function');
      expect(typeof result.current.onMouseUp, 'onMouseUp should be a function').toBe('function');
      expect(typeof result.current.onMouseLeave, 'onMouseLeave should be a function').toBe('function');
    });

    it('returns exactly three keys (no extra properties)', () => {
      const { result } = renderHook(() => useButtonPress());
      expect(Object.keys(result.current), 'handler object should have exactly 3 keys').toHaveLength(3);
    });
  });

  describe('onMouseDown', () => {
    it('sets transform to scale(0.97) on press', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();
      result.current.onMouseDown(event as unknown as React.MouseEvent<HTMLElement>);
      expect(event.currentTarget.style.transform, 'transform should compress to scale(0.97) on press').toBe('scale(0.97)');
    });

    it('sets a fast ease-in transition on press', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();
      result.current.onMouseDown(event as unknown as React.MouseEvent<HTMLElement>);
      expect(
        event.currentTarget.style.transition,
        'transition should use a fast ease-in curve on press'
      ).toBe('transform 100ms cubic-bezier(0.4, 0, 1, 1)');
    });
  });

  describe('onMouseUp', () => {
    it('resets transform to scale(1) on release', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();
      event.currentTarget.style.transform = 'scale(0.97)';
      result.current.onMouseUp(event as unknown as React.MouseEvent<HTMLElement>);
      expect(event.currentTarget.style.transform, 'transform should return to scale(1) on mouse release').toBe('scale(1)');
    });

    it('sets a slow ease-out transition on release', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();
      result.current.onMouseUp(event as unknown as React.MouseEvent<HTMLElement>);
      expect(
        event.currentTarget.style.transition,
        'transition should use a slow ease-out curve on release'
      ).toBe('transform 150ms cubic-bezier(0, 0, 0.2, 1)');
    });
  });

  describe('onMouseLeave', () => {
    it('resets transform to scale(1) when cursor leaves', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();
      event.currentTarget.style.transform = 'scale(0.97)';
      result.current.onMouseLeave(event as unknown as React.MouseEvent<HTMLElement>);
      expect(event.currentTarget.style.transform, 'transform should return to scale(1) when cursor leaves').toBe('scale(1)');
    });

    it('sets a slow ease-out transition when cursor leaves', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();
      result.current.onMouseLeave(event as unknown as React.MouseEvent<HTMLElement>);
      expect(
        event.currentTarget.style.transition,
        'transition should use a slow ease-out curve when cursor leaves'
      ).toBe('transform 150ms cubic-bezier(0, 0, 0.2, 1)');
    });
  });

  describe('press-then-release cycle', () => {
    it('restores scale(1) after a full press-release cycle', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();

      result.current.onMouseDown(event as unknown as React.MouseEvent<HTMLElement>);
      expect(event.currentTarget.style.transform, 'transform should compress on press').toBe('scale(0.97)');

      result.current.onMouseUp(event as unknown as React.MouseEvent<HTMLElement>);
      expect(event.currentTarget.style.transform, 'transform should recover after release').toBe('scale(1)');
    });

    it('restores scale(1) when cursor leaves during a press', () => {
      const { result } = renderHook(() => useButtonPress());
      const event = makeMockEvent();

      result.current.onMouseDown(event as unknown as React.MouseEvent<HTMLElement>);
      expect(event.currentTarget.style.transform, 'transform should compress on press').toBe('scale(0.97)');

      result.current.onMouseLeave(event as unknown as React.MouseEvent<HTMLElement>);
      expect(event.currentTarget.style.transform, 'transform should recover when cursor leaves during press').toBe('scale(1)');
    });
  });
});
