import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

// Interpolate SVG coordinates, keeping the same stars anchored during zoom.
export function useMapCamera(target) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const current = useRef(target.split(' ').map(Number));
  useLayoutEffect(() => {
    const to = target.split(' ').map(Number), from = [...current.current];
    let frame;
    const start = performance.now();
    const draw = now => {
      const progress = reduced ? 1 : Math.min((now - start) / 340, 1);
      const eased = 1 - (1 - progress) ** 3;
      current.current = from.map((n, i) => n + (to[i] - n) * eased);
      ref.current?.setAttribute('viewBox', current.current.join(' '));
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    draw(start);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);
  return ref;
}

export function touchFeedback(event, type) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const node = event.currentTarget;
  node.getAnimations().forEach(animation => animation.cancel());
  node.animate(type === 'moon' ? [{ transform: 'scale(.95) rotate(-5deg)' }, { transform: 'scale(1.02) rotate(3deg)' }, { transform: 'scale(1) rotate(0)' }]
    : [{ transform: 'scale(.94) rotate(-3deg)' }, { transform: 'scale(1.04) rotate(3deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 240, easing: 'ease-out' });
}
