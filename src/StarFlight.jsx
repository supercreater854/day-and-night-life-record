import { useLayoutEffect, useRef, useState } from 'react';
import { starPoints } from './model';
import { useReducedMotion } from './motion';

export default function StarFlight({ sourceRef, targetRef, record, onDone }) {
  const reducedMotion = useReducedMotion();
  const done = useRef(onDone);
  const star = useRef(null);
  const [path, setPath] = useState(null);
  done.current = onDone;

  useLayoutEffect(() => {
    const source = sourceRef.current?.querySelector('.today-star-anchor')?.getBoundingClientRect();
    const target = targetRef.current?.getBoundingClientRect();
    if (reducedMotion || !source || !target) {
      const frame = requestAnimationFrame(() => done.current());
      return () => cancelAnimationFrame(frame);
    }
    const startX = source.left + source.width / 2, startY = source.top + source.height / 2;
    const endX = target.left + target.width / 2, endY = target.top + target.height / 2;
    setPath({ startX, startY, x: endX - startX, y: endY - startY });
  }, [reducedMotion, sourceRef, targetRef]);

  useLayoutEffect(() => {
    if (!path) return;
    const node = star.current;
    if (!node?.animate) {
      const frame = requestAnimationFrame(() => done.current());
      return () => cancelAnimationFrame(frame);
    }
    const animation = node.animate([
      { transform: 'translate(-50%, -50%) translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(-50%, -50%) translate(${path.x * .72}px, ${path.y * .72}px) scale(.62) rotate(10deg)`, opacity: 1, offset: .72 },
      { transform: `translate(-50%, -50%) translate(${path.x}px, ${path.y}px) scale(.36) rotate(18deg)`, opacity: .2 },
    ], { duration: 760, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    animation.onfinish = () => done.current();
    return () => animation.cancel();
  }, [path]);

  if (!path) return null;
  return <div ref={star} className="star-flight" aria-hidden="true" style={{ left: path.startX, top: path.startY }}>
    <svg viewBox="-34 -34 68 68"><polygon points={starPoints(0, 0, Math.min(28, 16 * record.starSize))} fill="#ffe4a0" stroke="#191c21" strokeWidth="2.5" opacity={record.starBrightness} strokeLinejoin="round" /></svg>
  </div>;
}
