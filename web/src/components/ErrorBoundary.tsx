import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScreenError } from "./ScreenError";

type Props = {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
};

type State = { error: Error | null };

/**
 * Catches render/lifecycle errors in a subtree and shows a fallback instead of
 * unmounting the whole app. Mount one per screen (see App.tsx) so one broken
 * screen leaves the rest — and the navigation — working.
 *
 * Note: boundaries catch render errors, not event handlers or async work.
 * Those are handled where they happen (see the API adapter + reading machine).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Loud in the console; a deployed build would report this somewhere.
    console.error("[screen error]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback({ error, reset: this.reset });
    return <ScreenError error={error} onRetry={this.reset} />;
  }
}
