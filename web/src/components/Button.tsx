import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookIcon,
  ClockIcon,
  CloseIcon,
  EarIcon,
  FlagIcon,
  GlobeIcon,
  HandIcon,
  HomeIcon,
  MicIcon,
  PersonAddIcon,
  PersonIcon,
  QuestionIcon,
  RefreshIcon,
  RepeatIcon,
  SparklesIcon,
  TrendingUpIcon,
  UploadIcon,
  UserSwitchIcon,
  VolumeIcon,
  WifiOffIcon,
} from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";

/**
 * The child-action pictograms a button can carry. One picture per action, so a child who
 * cannot read still knows what the button does; what each one means is listed in
 * components.css. The icon sits 8px before the label (the `.btn` gap).
 */
export type ButtonIcon =
  | "none"
  | "audio"
  | "book"
  | "previous"
  | "next"
  | "home"
  | "finish"
  | "practice"
  | "results"
  | "quiet"
  | "retry"
  | "send"
  | "offline"
  | "wait"
  | "help"
  | "teacher"
  | "person"
  | "switch"
  | "add"
  | "language"
  | "close"
  | "repeat"
  | "mic";

const size = { width: 20, height: 20 } as const;

const ICONS: Record<Exclude<ButtonIcon, "none">, ReactNode> = {
  audio: <VolumeIcon {...size} />,
  book: <BookIcon {...size} />,
  previous: <ArrowLeftIcon {...size} />,
  next: <ArrowRightIcon {...size} />,
  home: <HomeIcon {...size} />,
  finish: <FlagIcon {...size} />,
  practice: <SparklesIcon {...size} />,
  results: <TrendingUpIcon {...size} />,
  quiet: <EarIcon {...size} />,
  retry: <RefreshIcon {...size} />,
  send: <UploadIcon {...size} />,
  offline: <WifiOffIcon {...size} />,
  wait: <ClockIcon {...size} />,
  help: <QuestionIcon {...size} />,
  teacher: <HandIcon {...size} />,
  person: <PersonIcon {...size} />,
  switch: <UserSwitchIcon {...size} />,
  add: <PersonAddIcon {...size} />,
  language: <GlobeIcon {...size} />,
  close: <CloseIcon {...size} />,
  repeat: <RepeatIcon {...size} />,
  mic: <MicIcon {...size} />,
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ButtonIcon;
  block?: boolean;
  /** `sm` is for inline row actions; `md` is the default CTA size. */
  size?: "md" | "sm";
  children: ReactNode;
};

export function Button({
  variant = "primary",
  icon = "none",
  block = false,
  size = "md",
  children,
  className,
  ...rest
}: Props) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={classes} {...rest}>
      {icon !== "none" && ICONS[icon]}
      {children}
    </button>
  );
}
