import { LegislationType } from "./RichLegislationNode";
import { Button } from "../../ui/Button";

export function LegislationSelector({
  legislations,
  onSelect,
}: {
  legislations: LegislationType[];
  onSelect: (legislation: LegislationType) => () => void;
}) {
  return (
    <ul className="pl-8">
      {legislations.map((legislation) => (
        <li key={legislation.doc_id}>
          <Button type="button" onClick={onSelect(legislation)}>
            <span className="material-symbols-outlined text-xs">done</span>
          </Button>
          <span className="pl-2">{legislation.title}</span>
        </li>
      ))}
    </ul>
  );
}
