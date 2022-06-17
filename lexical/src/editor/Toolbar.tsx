import { createCommand, LexicalCommand, LexicalEditor } from "lexical";
import { useCallback, useRef } from "react";
import { exportFile, importFile } from "@lexical/file";

import { TOGGLE_SIMPLE_LEGISLATION_COMMAND } from "../legislation/simple/SimpleLegislationNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useSelectedNode } from "./useSelectedNode";
import { Button } from "../ui/Button";
import { INSERT_RICH_LEGISLATION_COMMAND } from "../legislation/rich/RichLegislationNodePlugin";
import { DETECT_LEGISLATION } from "../legislation/rich/DetectLegislation";

export const TOGGLE_IMPORT_HTML: LexicalCommand<string> = createCommand();

function ToolbarComponent({
  editor,
  isLink,
  isText,
}: {
  editor: LexicalEditor;
  isLink: boolean;
  isText: boolean;
}): JSX.Element {
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null);

  const toggleLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_SIMPLE_LEGISLATION_COMMAND, "https://");
    } else {
      editor.dispatchCommand(TOGGLE_SIMPLE_LEGISLATION_COMMAND, null);
    }
  }, [editor, isLink]);

  return (
    <div ref={popupCharStylesEditorRef} className="character-style-popup">
      <Button
        onClick={toggleLink}
        disabled={!isLink && !isText}
        active={isLink}
        aria-label="toggle link"
      >
        Add simple legislation link
      </Button>
      <Button
        onClick={() => {
          editor.dispatchCommand(INSERT_RICH_LEGISLATION_COMMAND, null);
        }}
        disabled={isLink || isText}
        aria-label="insert rich legislation"
      >
        Insert Rich Legislation
      </Button>
      <Button
        onClick={() => {
          editor.dispatchCommand(DETECT_LEGISLATION, null);
        }}
        disabled={!isText || isLink}
        aria-label="detect legislation"
      >
        Detect legislation
      </Button>
      <Button
        onClick={() =>
          exportFile(editor, {
            fileName: `Doctrine-${new Date().toISOString()}`,
            source: "demo",
          })
        }
        aria-label="Export state"
      >
        Export
      </Button>
      <Button onClick={() => importFile(editor)} aria-label="Import state">
        Import
      </Button>
      <Button
        onClick={() => {
          editor.dispatchCommand(TOGGLE_IMPORT_HTML, null);
        }}
        aria-label="Import HTML"
      >
        Import HTML
      </Button>
    </div>
  );
}

export function Toolbar(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [isText, isLink] = useSelectedNode(editor);

  return <ToolbarComponent editor={editor} isLink={isLink} isText={isText} />;
}
