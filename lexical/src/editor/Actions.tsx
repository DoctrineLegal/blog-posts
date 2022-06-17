import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useSelectedNode } from "./useSelectedNode";
import { EditSimpleLink } from "../legislation/simple/EditSimpleLink";
import { RichLegislationContext } from "../legislation/rich/RichLegislationContext";
import { useContext } from "react";
import { EditRichLegislation } from "../legislation/rich/EditRichLegislation";
import { DetectLegislation } from "../legislation/rich/DetectLegislation";
import { HTMLImport } from "./HTMLImport";

export function Actions(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [, isLink, isRich, isDetection, isHTMLImport] = useSelectedNode(editor);
  const { nodeKey } = useContext(RichLegislationContext);

  return (
    <div className="">
      {isLink && <EditSimpleLink editor={editor} />}
      {isRich && nodeKey && (
        <EditRichLegislation editor={editor} nodeKey={nodeKey} />
      )}
      {isDetection && <DetectLegislation editor={editor} />}
      {isHTMLImport && <HTMLImport editor={editor} />}
    </div>
  );
}
