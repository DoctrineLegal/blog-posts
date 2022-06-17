import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { SimpleLegislationPlugin } from "../legislation/simple/SimpleLegislationPlugin";
import { SimpleLegislationNode } from "../legislation/simple/SimpleLegislationNode";
import { LinkNode } from "@lexical/link";
import { Toolbar } from "../editor/Toolbar";
import { Actions } from "../editor/Actions";
import { RichLegislationNodePlugin } from "../legislation/rich/RichLegislationNodePlugin";
import { RichLegislationNode } from "../legislation/rich/RichLegislationNode";
import { RichLegislationContextProvider } from "../legislation/rich/RichLegislationContext";
import { Section } from "../ui/Section";

export const Editor = () => (
  <RichLegislationContextProvider>
    <LexicalComposer
      initialConfig={{
        namespace: "test",
        editor__DEPRECATED: null,
        nodes: [SimpleLegislationNode, RichLegislationNode, LinkNode],
        onError: console.error,
      }}
    >
      <div className="mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="m-8 flex space-y-8 flex-col">
          <Section title="Toolbar">
            <Toolbar />
          </Section>

          <Section title="Editor">
            <div className="relative">
              <PlainTextPlugin
                contentEditable={
                  <ContentEditable className="p-2 min-h-[150px] border-solid border-2 border-sky-500" />
                }
                placeholder={
                  <div className="absolute top-2 left-2 pointer-events-none">
                    Enter some text...
                  </div>
                }
              />
            </div>
          </Section>

          <Section title="Actions">
            <Actions />
          </Section>
        </div>
      </div>
      <SimpleLegislationPlugin />
      <RichLegislationNodePlugin />
    </LexicalComposer>
  </RichLegislationContextProvider>
);
