import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BookIcon, VolumeIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: "none" | "audio" | "book";
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
      {icon === "audio" && <VolumeIcon width={20} height={20} />}
      {icon === "book" && <BookIcon width={20} height={20} />}
      {children}
    </button>
  );
}
