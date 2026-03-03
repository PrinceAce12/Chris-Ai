export const PlanetLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 7c-1.5-2-4-3-6.5-3-5.2 0-9.5 4.3-9.5 9.5S6.3 23 11.5 23c2.5 0 5-1 6.5-3" />
    <path d="M14 10.5c-.8-1-2-1.5-3.5-1.5-2.8 0-5 2.2-5 5s2.2 5 5 5c1.5 0 2.7-.5 3.5-1.5" />
  </svg>
);
