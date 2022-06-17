import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_EDITOR } from "lexical";
import {
  TOGGLE_SIMPLE_LEGISLATION_COMMAND,
  SimpleLegislationNode,
  toggleLegislationLink,
} from "./SimpleLegislationNode";

export function SimpleLegislationPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([SimpleLegislationNode])) {
      throw new Error(
        "SimpleLegislationPlugin: SimpleLegislationNode not registered on editor"
      );
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand<string | null>(
      TOGGLE_SIMPLE_LEGISLATION_COMMAND,
      (url) => {
        toggleLegislationLink(url);

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
