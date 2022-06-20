import { LegislationType } from "./RichLegislationNode";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "../AutocompleteServer";
import debounce from "lodash/debounce";
import { LexicalEditor, NodeKey } from "lexical";
import { withRichLegislationNode } from "./withRichLegislationNode";
import { LegislationSelector } from "./LegislationSelector";

const Section: FC<{ title: string; children: React.ReactNode }> = ({
  children,
  title,
}) => (
  <div className="bg-slate-50 p-4">
    <label className="text-lg">{title}</label>
    <div>{children}</div>
  </div>
);

export function EditRichLegislation({
  nodeKey,
  editor,
}: {
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [hits, setHits] = useState<LegislationType[]>([]);
  const [selectedLegislation, setSelectedLegislation] =
    useState<LegislationType>();
  const [input, setInput] = useState("");
  const [comment, setComment] = useState("");
  const query = useQuery();

  useEffect(() => {
    withRichLegislationNode(nodeKey, editor, (node) => {
      setSelectedLegislation(node.__legislation);
      setComment(node.__comment);
    });
  }, [nodeKey, editor]);

  const debounceFn = useMemo(
    () =>
      debounce((value: string) => {
        const searchPromise = query(value);
        searchPromise.promise.then((newSuggestion) => {
          if (newSuggestion) {
            setHits(newSuggestion);
          }
        });
      }, 200),
    [query]
  );

  const search = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = evt.target;
      setInput(value);
      debounceFn(value);
    },
    [debounceFn]
  );

  const select = (hit: LegislationType) => () => {
    withRichLegislationNode(nodeKey, editor, (node) => {
      node.updateLegislation(hit);
      setSelectedLegislation(hit);
      setInput("");
      setHits([]);
    });
  };

  return (
    <div>
      <Section title="Legislation: ">
        <div>
          {selectedLegislation && (
            <p>
              <b>Selected:</b> {selectedLegislation.title}
            </p>
          )}

          <input
            className="w-full"
            placeholder="Find a legislation"
            value={input}
            onChange={search}
          />
          <LegislationSelector legislations={hits} onSelect={select} />
        </div>
      </Section>
      <Section title="Comment: ">
        <div>
          <textarea
            placeholder="Add a comment"
            className="w-full"
            value={comment}
            onChange={(e) => {
              withRichLegislationNode(nodeKey, editor, (node) => {
                const newComment = e.target.value;
                setComment(newComment);
                node.updateComment(newComment);
              });
            }}
          />
        </div>
      </Section>
    </div>
  );
}
