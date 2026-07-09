/**
 * Subtle, enterprise cyber-themed backdrop.
 * Token-driven so it works in light and dark. Very low opacity — a faint
 * dot grid, a few connection lines/nodes, and a large shield watermark.
 * No flashy gradients or oversized illustrations.
 */
export function AuthBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden text-cds-text-secondary"
    >
      {/* Fine dot grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Faint node / connection network */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
        fill="none"
        stroke="currentColor"
      >
        <g strokeWidth="1">
          <path d="M120 140 L360 240 L300 470 L120 140" />
          <path d="M360 240 L640 180 L900 300 L640 180" />
          <path d="M900 300 L1080 520 L820 620 L900 300" />
          <path d="M300 470 L560 600 L820 620" />
          <path d="M560 600 L360 240" />
        </g>
        <g fill="currentColor">
          {[
            [120, 140],
            [360, 240],
            [640, 180],
            [900, 300],
            [300, 470],
            [560, 600],
            [820, 620],
            [1080, 520],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
          ))}
        </g>
      </svg>

      {/* Large shield watermark */}
      <svg
        className="absolute -right-24 top-1/2 hidden h-[42rem] w-[42rem] -translate-y-1/2 opacity-[0.04] lg:block"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      >
        <path d="M16 3L27 7.5V15C27 22 22 27.5 16 30C10 27.5 5 22 5 15V7.5L16 3Z" />
        <path d="M10.5 16.2L14.6 20.3L21.8 12.4" strokeWidth="0.9" />
      </svg>
    </div>
  );
}
