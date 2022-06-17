import {
  $getSelection,
  $isRangeSelection,
  ElementNode,
  LexicalEditor,
  RangeSelection,
  TextNode,
} from "lexical";
import { useCallback, useEffect, useState } from "react";
import {
  $isSimpleLegislationNode,
  TOGGLE_SIMPLE_LEGISLATION_COMMAND,
} from "./SimpleLegislationNode";
import { $isAtNodeEnd } from "@lexical/selection";
import { Button } from "../../ui/Button";

function getSelectedNode(selection: RangeSelection): TextNode | ElementNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
}

export function EditSimpleLink({ editor }: { editor: LexicalEditor }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [editedUrl, setEditedUrl] = useState("");

  const transformNode = (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setLinkUrl(editedUrl);
    editor.dispatchCommand(TOGGLE_SIMPLE_LEGISLATION_COMMAND, editedUrl);
  };

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isSimpleLegislationNode(parent)) {
        setLinkUrl(parent.getURL());
        setEditedUrl(parent.getURL());
      } else if ($isSimpleLegislationNode(node)) {
        setLinkUrl(node.getURL());
        setEditedUrl(node.getURL());
      } else {
        setLinkUrl("");
        setEditedUrl("");
      }
    }

    return true;
  }, []);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  return (
    <div>
      <input
        className="w-full"
        value={editedUrl}
        onChange={(evt) => setEditedUrl(evt.target.value)}
        placeholder="Type your url here"
      />
      <form onSubmit={transformNode}>
        <Button disabled={editedUrl === linkUrl} type="submit">
          Save link
        </Button>
      </form>
    </div>
  );
}
