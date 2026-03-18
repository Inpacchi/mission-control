import { useCallback } from 'react';
import type { MouseEventHandler } from 'react';

export interface ButtonPressHandlers {
  onMouseDown: MouseEventHandler<HTMLElement>;
  onMouseUp: MouseEventHandler<HTMLElement>;
  onMouseLeave: MouseEventHandler<HTMLElement>;
}

/**
 * Returns mouse event handlers that produce the standard press-scale animation
 * used across interactive buttons in the UI: scale down to 0.97 on press with
 * a fast ease-in, scale back to 1 on release or leave with a slow ease-out.
 *
 * Usage: spread the returned handlers directly onto the element.
 *
 *   const pressHandlers = useButtonPress();
 *   <button {...pressHandlers} onClick={...}>...</button>
 *
 * The handlers only set transform and transition — they do not interfere with
 * any other styles applied to the element.
 */
export function useButtonPress(): ButtonPressHandlers {
  const onMouseDown: MouseEventHandler<HTMLElement> = useCallback((e) => {
    e.currentTarget.style.transform = 'scale(0.97)';
    e.currentTarget.style.transition = 'transform 100ms cubic-bezier(0.4, 0, 1, 1)';
  }, []);

  const onMouseUp: MouseEventHandler<HTMLElement> = useCallback((e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
  }, []);

  const onMouseLeave: MouseEventHandler<HTMLElement> = useCallback((e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
  }, []);

  return { onMouseDown, onMouseUp, onMouseLeave };
}
