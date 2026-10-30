import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const MicIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
  </svg>
);

export const StopIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  </svg>
);

export const VolumeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
  </svg>
);

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ArrowLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

export const BookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v16H5.5A2.5 2.5 0 0 0 3 21.5z" />
    <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v16h5.5A2.5 2.5 0 0 1 21 21.5z" />
  </svg>
);

export const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);

export const FlameIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="m5 13 4 4 10-10" />
  </svg>
);

export const SwapIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M4 8h12l-3-3M20 16H8l3 3" />
  </svg>
);

export const MinusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);

export const QuestionIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7v.5" />
    <path d="M12 18h.01" />
  </svg>
);

export const TrendingUpIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M4 17l6-6 4 4 6-6" />
    <path d="M20 9v5h-5" />
  </svg>
);

export const HandIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M11 12V4.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M14 12V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.4a5.5 5.5 0 0 1-4.6-2.5L3 14.6a1.6 1.6 0 0 1 2.7-1.7L8 15.6" />
  </svg>
);

export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 6.4a3 3 0 0 1 0 5.2" />
    <path d="M18.5 20a6 6 0 0 0-2-4.5" />
  </svg>
);

export const EarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M6 9a6 6 0 0 1 12 0c0 3.2-3 3.8-3 6.2A2.8 2.8 0 0 1 9.5 16" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 0" />
  </svg>
);

export const SparklesIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M11 3l1.5 4L17 8.5 12.5 10 11 14l-1.5-4L5 8.5 9.5 7z" />
    <path d="M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </svg>
);

export const RepeatIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M17 2l4 4-4 4" />
    <path d="M3 12V10a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 12v2a4 4 0 0 1-4 4H3" />
  </svg>
);

/* Child-action pictograms: a wordless child should still read the button. */

export const ArrowRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v9h12v-9" />
  </svg>
);

export const RefreshIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 6v5h-5" />
  </svg>
);

export const GlobeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3z" />
  </svg>
);

export const PersonIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

export const UserSwitchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 9h6M19 6l3 3-3 3" />
  </svg>
);

export const PersonAddIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M18 8v6M15 11h6" />
  </svg>
);

export const FlagIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M6 21V4" />
    <path d="M6 4h11l-2.5 4 2.5 4H6" />
  </svg>
);

export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const UploadIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M12 16V4" />
    <path d="M8 8l4-4 4 4" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);

export const WifiOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M5 12.5a11 11 0 0 1 5-2.9" />
    <path d="M19 12.5a11 11 0 0 0-5-2.9" />
    <path d="M8.5 16a5 5 0 0 1 7 0" />
    <circle cx="12" cy="19.5" r="1" />
  </svg>
);

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
