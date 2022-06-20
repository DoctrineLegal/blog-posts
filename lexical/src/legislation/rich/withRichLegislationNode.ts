import { $getNodeByKey, LexicalEditor, NodeKey } from "lexical";

import {
  $isRichLegislationNode,
  RichLegislationNode,
} from "./RichLegislationNode";

export const withRichLegislationNode = (
  nodeKey: NodeKey,
  editor: LexicalEditor,
  cb: (node: RichLegislationNode) => void
): void => {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);
    if ($isRichLegislationNode(node)) {
      cb(node);
    }
  });
};
