import { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';

interface HoloOverlayProps {
  /** Whether the holographic overlay is active (only true for mythic cards) */
  active: boolean;
}

/**
 * Holographic shimmer overlay for Mythic rarity cards.
 *
 * CRITICAL: Mouse coordinate updates use ref.current.style.setProperty() — never React state.
 * This prevents per-frame re-renders during mouse tracking.
 *
 * At rest: base opacity 0.2 with holoPulse animation.
 * On hover: opacity rises, --pointer-x/--pointer-y drive radial gradient, subtle 3D tilt applied to parent.
 * prefers-reduced-motion: skips JS mouse tracking entirely.
 */
export function HoloOverlay({ active }: HoloOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !overlayRef.current) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    // Walk up to find the card root (closest ancestor with position:relative context)
    const el = overlayRef.current;
    parentRef.current = el.closest('[data-holo-root]') as HTMLElement ?? el.parentElement;

    const handleMouseMove = (e: MouseEvent) => {
      if (!el) return;
      const target = parentRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Update custom properties directly — no React state
      el.style.setProperty('--pointer-x', `${x}%`);
      el.style.setProperty('--pointer-y', `${y}%`);
      el.style.opacity = '0.55';

      // Subtle 3D tilt — write to parent element style directly
      const rotY = ((x - 50) / 50) * 8;
      const rotX = ((50 - y) / 50) * 8;
      target.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
      target.style.transition = 'transform 80ms ease-out';
    };

    const handleMouseLeave = () => {
      if (!el || !parentRef.current) return;
      el.style.setProperty('--pointer-x', '50%');
      el.style.setProperty('--pointer-y', '50%');
      el.style.opacity = '0.2';
      parentRef.current.style.transform = '';
      parentRef.current.style.transition = 'transform 300ms ease';
    };

    const root = parentRef.current;
    if (root) {
      root.addEventListener('mousemove', handleMouseMove);
      root.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (root) {
        root.removeEventListener('mousemove', handleMouseMove);
        root.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <Box
      ref={overlayRef}
      position="absolute"
      inset={0}
      borderRadius="inherit"
      pointerEvents="none"
      zIndex={10}
      style={{
        // CSS custom properties — updated directly via ref in JS
        '--pointer-x': '50%',
        '--pointer-y': '50%',
        opacity: 0.2,
        transition: 'opacity 300ms ease',
        mixBlendMode: 'soft-light',
        background: `
          radial-gradient(circle at var(--pointer-x) var(--pointer-y), rgba(255,255,255,0.2) 0%, transparent 60%),
          linear-gradient(110deg,
            rgba(168,85,247,0.15) 0%,
            rgba(59,130,246,0.15) 15%,
            rgba(16,185,129,0.15) 30%,
            rgba(245,158,11,0.15) 45%,
            rgba(239,68,68,0.15) 60%,
            rgba(168,85,247,0.15) 75%,
            rgba(59,130,246,0.15) 90%,
            rgba(16,185,129,0.15) 100%
          )
        `,
        backgroundSize: '100% 100%, 300% 300%',
        filter: 'brightness(1.2) saturate(1.3)',
        animation: 'holoPulse 3s ease-in-out infinite',
      } as React.CSSProperties}
    >
      {/* Scanline texture overlay */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="inherit"
        pointerEvents="none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)',
        }}
      />
    </Box>
  );
}
