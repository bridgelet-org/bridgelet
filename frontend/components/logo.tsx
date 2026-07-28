export default function Logo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="linkGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>

      {/* Dashed ring: ephemeral account */}
      <circle
        cx="40"
        cy="64"
        r="26"
        stroke="#6C63FF"
        strokeWidth="8"
        strokeDasharray="10 8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Arrow connector */}
      <line
        x1="68"
        y1="64"
        x2="88"
        y2="64"
        stroke="#38BDF8"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Solid ring: permanent wallet */}
      <circle cx="100" cy="64" r="18" fill="#6C63FF" />
      <circle cx="100" cy="64" r="9" fill="none" stroke="#38BDF8" strokeWidth="4" />
      <circle cx="100" cy="64" r="3" fill="#F59E0B" />
    </svg>
  );
}
