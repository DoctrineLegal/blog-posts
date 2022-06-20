import { NodeKey } from "lexical";

import { LegislationType } from "./RichLegislationNode";
import { useContext } from "react";
import { RichLegislationContext } from "./RichLegislationContext";

export function RichLegislationComponent({
  comment,
  legislation,
  nodeKey,
}: {
  comment: string;
  nodeKey: NodeKey;
  legislation?: LegislationType;
}): JSX.Element {
  const { nodeKey: activeNodeKey, setNodeKey } = useContext(
    RichLegislationContext
  );
  const selected = activeNodeKey === nodeKey;

  const edit = () => {
    setNodeKey(selected ? undefined : nodeKey);
  };

  const selectedClass = selected ? "bg-emerald-600" : "bg-emerald-500";

  return (
    <span
      className={`${selectedClass} rounded-lg text-white	align-middle inline-flex p-2`}
    >
      <span className="material-symbols-outlined">balance</span>
      {!!legislation && (
        <a className="pl-2" href={`https://www.doctrine.fr${legislation.url}`}>
          {legislation.title}
        </a>
      )}
      {comment && (
        <span
          title={comment}
          className="material-symbols-outlined cursor-pointer	pl-2 cursor-help"
        >
          info
        </span>
      )}
      <button className="pl-2" onClick={edit}>
        <span className="material-symbols-outlined">edit</span>
      </button>
    </span>
  );
}
