import type { LexicalCommand } from "lexical";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from "lexical";
import { useEffect } from "react";

import {
  RichLegislationNode,
  $createRichLegislationNode,
  toggleRichLegislationLink,
  LegislationType,
} from "./RichLegislationNode";

export const INSERT_RICH_LEGISLATION_COMMAND: LexicalCommand<string> =
  createCommand();

export const CONVERT_SELECTION_TO_RICH_LEGISLATION_COMMAND: LexicalCommand<string> =
  createCommand();

export function RichLegislationNodePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([RichLegislationNode])) {
      throw new Error(
        "CalloutPlugin: RichLegislationNode not registered on editor"
      );
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand<string | null>(
      INSERT_RICH_LEGISLATION_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const RichLegislationNode = $createRichLegislationNode();

          if ($isRootNode(selection.anchor.getNode())) {
            selection.insertParagraph();
          }

          selection.insertNodes([RichLegislationNode]);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand<LegislationType>(
      CONVERT_SELECTION_TO_RICH_LEGISLATION_COMMAND,
      (legislation) => {
        toggleRichLegislationLink(legislation);

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
