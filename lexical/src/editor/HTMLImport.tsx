import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  LexicalEditor,
} from "lexical";
import { useState } from "react";
import { $generateNodesFromDOM } from "@lexical/html";
import { Button } from "../ui/Button";
import { TOGGLE_IMPORT_HTML } from "./Toolbar";

export function HTMLImport({ editor }: { editor: LexicalEditor }) {
  const [htmlString, setHtmlString] = useState("");

  const importHTML = (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setHtmlString("");
    editor.dispatchCommand(TOGGLE_IMPORT_HTML, null);
    editor.update(() => {
      // In the browser you can use the native DOMParser API to parse the HTML string.
      const parser = new DOMParser();
      const dom = parser.parseFromString(htmlString, "text/html");

      // Once you have the DOM instance it's easy to generate LexicalNodes.
      const nodes = $generateNodesFromDOM(editor, dom);

      // Select the root
      $getRoot().select();

      // Insert them at a selection.
      const selection = $getSelection();
      if (selection && $isRangeSelection(selection)) {
        selection.insertNodes(nodes);
      }
    });
  };
  return (
    <div>
      <form onSubmit={importHTML}>
        <div>
          <p>
            Example:
            <pre className="p-4 bg-slate-300 m-2">
              {`this <a href="/l/texts/codes/LEGITEXT000006070721/articles/LEGIARTI000006430468">
   will become a rich link with comment
</a> and this
<a href="doctrine.fr/l/1231321">will become a simple link</a>
`}
            </pre>
          </p>
          <p>Type your HTML here</p>
          <textarea
            className="w-full h-24 border-solid border-2 border-sky-500"
            value={htmlString}
            onChange={(e) => setHtmlString(e.target.value)}
          />
        </div>
        <Button type="submit">Import HTML</Button>
      </form>
    </div>
  );
}
