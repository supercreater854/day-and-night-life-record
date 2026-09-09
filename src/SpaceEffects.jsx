import { useEffect, useState } from 'react';
import { useReducedMotion } from './motion';

const lights = [[9,18],[79,11],[47,29],[18,56],[87,47],[63,75],[31,90],[92,85]];

export default function SpaceEffects({ paused = false }) {
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  if (reduced) return null;
  return <div className={`space-effects ${hidden || paused ? 'effects-paused' : ''}`} aria-hidden="true">
    {lights.map(([x, y], index) => <span key={index} className="ambient-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-index * 1.7}s`, animationDuration: `${5 + index % 3}s` }}>✦</span>)}
  </div>;
}
