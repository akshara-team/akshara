import { MicIcon, StopIcon } from "./icons";

export type MicState = "idle" | "recording" | "processing";

export function MicButton({
  state,
  onClick,
  label,
}: {
  state: MicState;
  onClick?: () => void;
  /** Accessible name; the visible text lives beside the button, per the design. */
  label: string;
}) {
  const disabled = state === "processing";
  return (
    <button
      type="button"
      className={`micbutton micbutton--${state}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={state === "recording"}
    >
      {state === "recording" ? (
        <StopIcon width={44} height={44} />
      ) : (
        <MicIcon width={44} height={44} />
      )}
    </button>
  );
}
