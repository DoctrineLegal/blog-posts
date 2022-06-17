import { useCallback, useContext, useEffect, useState } from "react";
import { $isAtNodeEnd } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  ElementNode,
  LexicalEditor,
  RangeSelection,
  TextNode,
} from "lexical";
import { $isSimpleLegislationNode } from "../legislation/simple/SimpleLegislationNode";
import { DETECT_LEGISLATION } from "../legislation/rich/DetectLegislation";
import { RichLegislationContext } from "../legislation/rich/RichLegislationContext";
import { TOGGLE_IMPORT_HTML } from "./Toolbar";

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

export function useSelectedNode(editor: LexicalEditor) {
  const [isText, setIsText] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isDetection, setDetection] = useState(false);
  const [isHTMLImport, setIsHTMLImport] = useState(false);
  const { nodeKey, setNodeKey } = useContext(RichLegislationContext);

  const isRich = nodeKey && !isText && !isLink;

  useEffect(() => {
    if (nodeKey) {
      setIsText(false);
      setIsLink(false);
      setDetection(false);
    }
  }, [nodeKey]);

  const detectChanges = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      const nativeSelection = window.getSelection();
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        setIsLink(false);
        setIsHTMLImport(false);
        return;
      }

      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = getSelectedNode(selection);

      // Update links
      const parent = node.getParent();
      if ($isSimpleLegislationNode(parent) || $isSimpleLegislationNode(node)) {
        setIsLink(true);
        setNodeKey(undefined);
      } else {
        setIsLink(false);
      }

      if (selection.getTextContent() !== "") {
        const isText = $isTextNode(node);
        setIsText(isText);
        if (isText) {
          setNodeKey(undefined);
        }
      } else {
        setIsText(false);
        if ($isTextNode(node)) {
          setDetection(false);
        }
      }
    });
  }, [editor, setNodeKey]);

  useEffect(() => {
    return editor.registerCommand<string | null>(
      DETECT_LEGISLATION,
      () => {
        const domSelection = window.getSelection();
        if (domSelection) {
          setDetection(true);
        }
        return false; // should not stop propagation since this custom hook can be used multiple times
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand<string | null>(
      TOGGLE_IMPORT_HTML,
      () => {
        setIsHTMLImport((prev) => !prev);
        setIsText(false);
        setIsLink(false);
        setDetection(false);
        return false; // should not stop propagation since this custom hook can be used multiple times
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      detectChanges();
    });
  }, [editor, detectChanges]);

  return [
    Boolean(isText),
    Boolean(isLink),
    Boolean(isRich),
    Boolean(isDetection),
    Boolean(isHTMLImport),
  ];
}
