import Piso from "../../brand/Piso";
import Button from "./Button";

interface Props {
  title: string;
  body: string;
  /** One action, deliberately: an empty screen has exactly one next step. */
  action: { label: string; onClick: () => void };
}

export default function EmptyState({ title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <Piso state="empty" size={96} />
      <h2 className="m-0 font-display text-lg font-medium text-ink-hi">{title}</h2>
      <p className="m-0 max-w-sm text-sm text-ink-2">{body}</p>
      <Button onClick={action.onClick}>{action.label}</Button>
    </div>
  );
}
