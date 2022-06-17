import { $setSelection, LexicalCommand, LexicalEditor } from "lexical";

import { $getSelection, createCommand } from "lexical";
import { useCallback, useEffect, useState } from "react";

import { LegislationType } from "./RichLegislationNode";
import { useQuery } from "../AutocompleteServer";
import { LegislationSelector } from "./LegislationSelector";
import { CONVERT_SELECTION_TO_RICH_LEGISLATION_COMMAND } from "./RichLegislationNodePlugin";

export const CONVERT_TEXT_TO_LEGISLATION_LINK: LexicalCommand<string> =
  createCommand();

export const DETECT_LEGISLATION: LexicalCommand<string> = createCommand();

export function DetectLegislation({ editor }: { editor: LexicalEditor }) {
  const [loading, setLoading] = useState(false);
  const [legislations, setLegislations] = useState<LegislationType[]>([]);
  const query = useQuery();

  const transformNode = useCallback(
    (legislation: LegislationType) => () => {
      setLegislations([]);
      editor.dispatchCommand(
        CONVERT_SELECTION_TO_RICH_LEGISLATION_COMMAND,
        legislation
      );
    },
    [editor]
  );

  useEffect(() => {
    setLoading(true);
    editor.update(() => {
      const selection = $getSelection();

      if (selection !== null) {
        $setSelection(selection);
      }

      const sel = $getSelection();
      if (sel) {
        const text = sel.getTextContent();
        const searchPromise = query(text);
        searchPromise.promise.then((newSuggestion) => {
          if (newSuggestion) {
            setLegislations(newSuggestion);
          }
          setLoading(false);
        });
      }
    });
  }, [editor, query]);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {!loading && legislations.length > 0 && (
        <LegislationSelector
          legislations={legislations}
          onSelect={transformNode}
        />
      )}
    </div>
  );
}
