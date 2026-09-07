import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './motion';

const lights = [[9,18],[79,11],[47,29],[18,56],[87,47],[63,75],[31,90],[92,85]];
export default function SpaceEffects({ paused = false }) {
  const reduced = useReducedMotion();
  const flightArea = useRef(null);
  const [size, setSize] = useState({ width: 375, height: 650 });
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (reduced || !flightArea.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(flightArea.current);
    return () => observer.disconnect();
  }, [reduced]);
  const { width: w, height: h } = size;
  // Pixel paths keep the craft aligned with their actual trajectory at every width.
  const paths = {
    '--meteor-a': `path("M ${w * .12} ${h * .12} L ${w * .86} ${h * .43}")`,
    '--meteor-b': `path("M ${w * .38} ${h * .48} L ${w * 1.04} ${h * .69}")`,
    '--rocket-path': `path("M -55 ${h * .79} C ${w * .3} ${h * .79}, ${w * .73} ${h * .62}, ${w + 60} ${h * .32}")`,
    '--ufo-path': `path("M ${w + 55} ${h * .23} C ${w * .64} ${h * .13}, ${w * .46} ${h * .34}, -60 ${h * .26}")`,
  };
  if (reduced) return null;
  return <div className={`space-effects ${hidden || paused ? 'effects-paused' : ''}`} aria-hidden="true">
    {lights.map(([x,y],i) => <span key={i} className="ambient-spark" style={{left:`${x}%`,top:`${y}%`,animationDelay:`${-i * 1.7}s`,animationDuration:`${5+i%3}s`}}>✦</span>)}
    <div className="flight-area" ref={flightArea} style={paths}>
      {[0, 1].map(i => <div key={i} className={`meteor meteor-${i === 0 ? 'one' : 'two'}`}>
        <svg viewBox="0 0 120 8">
          <defs><linearGradient id={`meteor-tail-${i}`}><stop stopColor="#c5dafa" stopOpacity="0"/><stop offset=".7" stopColor="#d8e6ff" stopOpacity=".3"/><stop offset="1" stopColor="#fff3d2" stopOpacity=".85"/></linearGradient></defs>
          <path d="M0 4 115 2.9 118 4 115 5.1Z" fill={`url(#meteor-tail-${i})`}/>
          <circle cx="116" cy="4" r="1.5" fill="#fff3d2"/>
        </svg>
      </div>)}
      <div className="space-rocket"><svg viewBox="0 0 64 96" stroke="#191c21" strokeWidth="3" strokeLinejoin="round">
        <g className="rocket-flame" stroke="none"><path d="M25 69Q23 80 32 92Q41 80 39 69Z" fill="#e6a066"/><path d="M29 69Q27 78 32 84Q37 78 35 69Z" fill="#ffe4a0"/></g>
        <path d="M22 45Q9 53 12 70l14-8m16-17q13 8 10 25L38 62" fill="#cb8775"/>
        <path d="M32 7C16 22 16 49 24 68h16C48 49 48 22 32 7Z" fill="#eae8df"/>
        <path d="M32 7q-8 8-11 20h22Q40 15 32 7Z" fill="#cb8775"/>
        <circle cx="32" cy="40" r="7" fill="#9fc5d5"/>
        <path d="M25 64h14" fill="none" strokeLinecap="round"/>
      </svg></div>
      <div className="space-ufo"><div className="ufo-cabin"><svg viewBox="0 0 96 58" stroke="#191c21" strokeWidth="3" strokeLinejoin="round">
        <path d="M29 30C29 6 67 6 67 30Z" fill="#a9cbbb"/>
        <path d="M37 23q2-6 7-7" fill="none" stroke="#e6eee7" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M12 34Q17 48 48 48T84 34" fill="#898fae"/>
        <ellipse cx="48" cy="32" rx="37" ry="10" fill="#b6b5cb"/>
        <path d="M31 31q17 6 34 0" fill="none" strokeWidth="2"/>
        <g className="ufo-lights" fill="#ffe4a0" stroke="none"><circle cx="27" cy="38" r="1.8"/><circle cx="48" cy="40" r="1.8"/><circle cx="69" cy="38" r="1.8"/></g>
      </svg></div></div>
    </div>
  </div>;
}
