export default function MoodFace({ value }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="18" cy="20" r="1.5" fill="currentColor" /><circle cx="30" cy="20" r="1.5" fill="currentColor" />
    <path d={['M16 32Q24 23 32 32', 'M17 30Q24 26 31 30', 'M17 29H31', 'M17 27Q24 34 31 27', 'M15 26Q24 39 33 26Z'][value - 1]} stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
