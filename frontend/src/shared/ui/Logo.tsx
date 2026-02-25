interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 32, showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 36C20 36 4 25.5 4 14C4 9.58 7.58 6 12 6C15.04 6 17.68 7.64 19.2 10.08C19.56 9.4 20.04 8.76 20.6 8.2C21.88 6.84 23.68 6 25.68 6C30.1 6 33.68 9.58 33.68 14C33.68 25.5 20 36 20 36Z"
          fill="url(#heartGrad)"
        />
        <path
          d="M8 17H12L14.5 11L17.5 23L20 17H23L25 13.5L27 17H33"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="heartGrad" x1="4" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className="font-bold text-xl tracking-tight text-foreground">
          Med<span className="text-blue-600">AI</span>
        </span>
      )}
    </div>
  );
}
