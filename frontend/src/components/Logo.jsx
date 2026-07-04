export function Logo({ variant = "full", className = "" }) {
  if (variant === "mark") {
    return (
      <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
        <rect width="40" height="40" rx="10" fill="#0C5E48" />
        <path d="M8 26C8 26 11 15 20 15C29 15 32 26 32 26" stroke="#F4F3EF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="20" cy="10" r="2.2" fill="#F4F3EF" />
        <circle cx="27" cy="14" r="1.4" fill="#F4F3EF" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 260 60" className={className} xmlns="http://www.w3.org/2000/svg" fill="none" aria-label="Aakash Drycleaners">
      <rect x="0" y="10" width="44" height="44" rx="11" fill="#0C5E48" />
      <path d="M8 42C8 42 12 26 22 26C32 26 36 42 36 42" stroke="#F4F3EF" strokeWidth="2.8" strokeLinecap="round" transform="translate(0,-4)"/>
      <circle cx="22" cy="20" r="2.6" fill="#F4F3EF" />
      <circle cx="30" cy="24" r="1.6" fill="#F4F3EF" opacity="0.7" />
      <text x="56" y="34" fontFamily="Cabinet Grotesk, Geist, sans-serif" fontWeight="800" fontSize="20" fill="#06291F" letterSpacing="-0.02em">AAKASH</text>
      <text x="56" y="50" fontFamily="Geist, sans-serif" fontWeight="600" fontSize="9" fill="#4A6159" letterSpacing="0.28em">DRYCLEANERS</text>
    </svg>
  );
}
