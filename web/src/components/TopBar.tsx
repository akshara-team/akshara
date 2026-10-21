import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "./icons";

export function TopBar({
  brand = "Akshara",
  back = false,
  backTo,
}: {
  brand?: string;
  back?: boolean;
  backTo?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <span className="topbar__brand">{brand}</span>
      {back && (
        <button
          type="button"
          className="topbar__back"
          aria-label="Go back"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        >
          <ArrowLeftIcon width={20} height={20} />
        </button>
      )}
    </header>
  );
}
