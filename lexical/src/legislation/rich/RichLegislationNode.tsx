import {
  LexicalNode,
  NodeKey,
  createCommand,
  LexicalCommand,
  DecoratorNode,
  $getSelection,
  $setSelection,
  ElementNode,
  Spread,
  SerializedElementNode,
} from "lexical";
import { RichLegislationComponent } from "./RichLegislationComponent";
import data from "../data.json";

function convertAnchorElement(legislation: LegislationType) {
  return function (domNode: Node) {
    let node = null;

    if (domNode instanceof HTMLAnchorElement) {
      node = $createRichLegislationNode(legislation, domNode.innerText);
    }

    return {
      node,
    };
  };
}

type SerializedRichLegislationNode = Spread<
  {
    type: "rich-legislation-link";
    legislation: LegislationType;
    comment: string;
    version: 1;
  },
  SerializedElementNode
>;
export const TOGGLE_LEGISLATION_COMMAND: LexicalCommand<string | null> =
  createCommand();

export type LegislationType = { url: string; title: string; doc_id: string };

export class RichLegislationNode extends DecoratorNode<JSX.Element> {
  __legislation?: LegislationType;
  __comment: string = "";

  static getType() {
    return "rich-legislation-link";
  }

  static clone(node: RichLegislationNode): RichLegislationNode {
    return new RichLegislationNode(
      node.__legislation,
      node.__comment,
      node.__key
    );
  }

  constructor(
    legislation?: LegislationType,
    comment: string = "",
    key?: NodeKey
  ) {
    super(key);
    this.__legislation = legislation;
    this.__comment = comment;
  }

  createDOM(): HTMLElement {
    const elem = document.createElement("span");
    return elem;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <RichLegislationComponent
        comment={this.__comment}
        legislation={this.__legislation}
        nodeKey={this.__key}
      />
    );
  }

  updateLegislation(legislation: LegislationType): void {
    const self = this.getWritable();
    self.__legislation = legislation;
  }

  updateComment(comment: string): void {
    const self = this.getWritable();
    self.__comment = comment;
  }

  static importJSON(serializedNode: SerializedRichLegislationNode) {
    return $createRichLegislationNode(
      serializedNode.legislation,
      serializedNode.comment
    );
  }

  exportJSON() {
    return {
      type: this.getType(),
      comment: this.__comment,
      legislation: this.__legislation,
      version: 1,
    };
  }

  static importDOM() {
    return {
      a: (node: Node) => {
        if (node instanceof HTMLAnchorElement) {
          const href = node.getAttribute("href");

          const legislation = data.find((l: LegislationType) =>
            href?.includes(l.url)
          );
          if (legislation) {
            return {
              conversion: convertAnchorElement(legislation),
              priority: 3 as const, // higher than simple legislation link
            };
          }
        }

        return null;
      },
    };
  }
}

export function $createRichLegislationNode(
  legilsation?: LegislationType,
  comment?: string
): RichLegislationNode {
  return new RichLegislationNode(legilsation, comment);
}

export function $isRichLegislationNode(
  node: LexicalNode | null | undefined
): node is RichLegislationNode {
  return node instanceof RichLegislationNode;
}

export function toggleRichLegislationLink(legislation: LegislationType): void {
  const selection = $getSelection();

  if (selection !== null) {
    $setSelection(selection);
  }

  const sel = $getSelection();

  if (sel !== null) {
    const nodes = sel.extract();

    let prevParent: ElementNode | null = null;
    let linkNode: RichLegislationNode | null = null;

    nodes.forEach((node) => {
      const parent = node.getParent();

      if (parent === null) {
        return;
      }

      if (!parent.is(prevParent)) {
        linkNode = $createRichLegislationNode(legislation);

        node.replace(linkNode);
      }
    });
  }
}
