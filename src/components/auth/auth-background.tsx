/**
 * Premium, enterprise cyber backdrop for the auth screens.
 *
 * Layered and deliberately restrained — deep IBM-blue ambient glows, a fine
 * grid, a SOC-style radar, a node/network constellation, and a large shield
 * watermark. Everything sits at low opacity so it reads as texture behind the
 * login card, never bright or busy. Token-driven, so it holds up in light and
 * dark. No gradients on the card itself; the card design is untouched.
 */
export function AuthBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base wash + ambient IBM-blue glows */}
      <div className="absolute inset-0 bg-cds-bg" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60rem 40rem at 18% 12%, rgb(var(--cds-blue) / 0.16), transparent 60%)," +
            "radial-gradient(50rem 40rem at 88% 88%, rgb(var(--cds-blue) / 0.12), transparent 55%)," +
            "radial-gradient(40rem 30rem at 100% 0%, rgb(var(--cds-blue-active) / 0.14), transparent 60%)",
        }}
      />

      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.55] text-cds-blue"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--cds-blue) / 0.06) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgb(var(--cds-blue) / 0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse at center, black 55%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 55%, transparent 100%)",
        }}
      />

      {/* SOC-style radar sweep (bottom-left) */}
      <svg
        className="absolute -bottom-40 -left-40 h-[36rem] w-[36rem] text-cds-blue opacity-[0.14]"
        viewBox="0 0 400 400"
        fill="none"
        stroke="currentColor"
      >
        <g strokeWidth="1">
          <circle cx="200" cy="200" r="60" />
          <circle cx="200" cy="200" r="110" />
          <circle cx="200" cy="200" r="160" />
          <circle cx="200" cy="200" r="200" />
          <line x1="200" y1="0" x2="200" y2="400" />
          <line x1="0" y1="200" x2="400" y2="200" />
        </g>
        <path
          d="M200 200 L200 0 A200 200 0 0 1 373 100 Z"
          fill="currentColor"
          opacity="0.12"
          stroke="none"
        />
      </svg>

      {/* Node / network constellation */}
      <svg
        className="absolute inset-0 h-full w-full text-cds-link opacity-[0.16]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
        fill="none"
        stroke="currentColor"
      >
        <g strokeWidth="1">
          <path d="M120 150 L360 250 L300 480 L120 150" />
          <path d="M360 250 L640 190 L900 300 L640 190" />
          <path d="M900 300 L1080 520 L820 620 L900 300" />
          <path d="M300 480 L560 600 L820 620" />
          <path d="M560 600 L360 250" />
          <path d="M900 300 L1120 200" />
          <path d="M120 150 L60 420" />
        </g>
        <g fill="currentColor">
          {[
            [120, 150],
            [360, 250],
            [640, 190],
            [900, 300],
            [300, 480],
            [560, 600],
            [820, 620],
            [1080, 520],
            [1120, 200],
            [60, 420],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="8" opacity="0.18" />
              <circle cx={cx} cy={cy} r="3" />
            </g>
          ))}
        </g>
      </svg>

      {/* Large shield watermark (right) */}
      <svg
        className="absolute -right-28 top-1/2 hidden h-[44rem] w-[44rem] -translate-y-1/2 text-cds-blue opacity-[0.08] lg:block"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <path d="M16 3L27 7.5V15C27 22 22 27.5 16 30C10 27.5 5 22 5 15V7.5L16 3Z" />
        <path d="M16 6L23.5 9V15C23.5 20.5 20.2 24.6 16 26.5C11.8 24.6 8.5 20.5 8.5 15V9L16 6Z" />
        <path d="M11 16L14.6 19.6L21.4 12" strokeWidth="0.8" />
      </svg>

      {/* Faint binary column (SOC feel) */}
      <div className="absolute right-[7%] top-0 hidden h-full flex-col justify-center gap-2 font-mono text-[10px] leading-4 text-cds-blue opacity-[0.06] xl:flex">
        {[
          "01001101 01001001 01010100",
          "10101110 00110101 11000110",
          "01110011 01101111 01100011",
          "11010010 10011001 01000111",
          "00101101 01011010 10110001",
        ].map((row, i) => (
          <div key={i}>{row}</div>
        ))}
      </div>

      {/* Subtle top-edge scan line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgb(var(--cds-blue) / 0.4), transparent)",
        }}
      />
    </div>
  );
}
