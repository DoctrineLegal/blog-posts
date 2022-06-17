import {
  LexicalNode,
  createCommand,
  LexicalCommand,
  $isElementNode,
  $getSelection,
  $setSelection,
  ElementNode,
  EditorConfig,
  SerializedElementNode,
  Spread,
} from "lexical";
import { LinkNode } from "@lexical/link";
import utils from "@lexical/utils";

function convertAnchorElement(domNode: Node) {
  let node = null;

  if (domNode instanceof HTMLAnchorElement) {
    const href = domNode.getAttribute("href");
    if (href?.includes("doctrine.fr/l/")) {
      node = $createLegislationLinkNode(href);
    }
  }

  return {
    node,
  };
}

// Duplicated type - wait for type release from @lexical/link (current 0.3.3)
type SerializedLinkNode = Spread<
  {
    type: "link";
    url: string;
    version: 1;
  },
  SerializedElementNode
>;

export const TOGGLE_SIMPLE_LEGISLATION_COMMAND: LexicalCommand<string | null> =
  createCommand();

export class SimpleLegislationNode extends LinkNode {
  static getType() {
    return "simple-legislation-link";
  }

  static clone(node: SimpleLegislationNode) {
    return new SimpleLegislationNode(node.__url, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);

    utils.addClassNamesToElement(element, "underline text-emerald-500");

    return element;
  }

  static importDOM() {
    return {
      a: () => ({
        conversion: convertAnchorElement,
        priority: 2 as const, // higher than link node (ie: 1)
      }),
    };
  }

  static importJSON(serializedNode: SerializedLinkNode) {
    const node = $createLegislationLinkNode(serializedNode.url);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON() {
    const json = {
      ...super.exportJSON(),
      type: this.getType(),
    };
    return json;
  }
}

export function $createLegislationLinkNode(url: string): SimpleLegislationNode {
  return new SimpleLegislationNode(url);
}

export function $isSimpleLegislationNode(
  node: LexicalNode | null | undefined
): node is SimpleLegislationNode {
  return node instanceof SimpleLegislationNode;
}

export function toggleLegislationLink(url: null | string): void {
  const selection = $getSelection();

  if (selection !== null) {
    $setSelection(selection);
  }

  const sel = $getSelection();

  if (sel !== null) {
    const nodes = sel.extract();

    if (url === null) {
      // Remove LinkNodes
      nodes.forEach((node) => {
        const parent = node.getParent();

        if ($isSimpleLegislationNode(parent)) {
          const children = parent.getChildren();

          for (let i = 0; i < children.length; i++) {
            parent.insertBefore(children[i]);
          }

          parent.remove();
        }
      });
    } else {
      // Add or merge LinkNodes
      if (nodes.length === 1) {
        const firstNode = nodes[0];

        // if the first node is a LinkNode or if its
        // parent is a LinkNode, we update the URL.
        if ($isSimpleLegislationNode(firstNode)) {
          firstNode.setURL(url);
          return;
        } else {
          const parent = firstNode.getParent();

          if ($isSimpleLegislationNode(parent)) {
            // set parent to be the current linkNode
            // so that other nodes in the same parent
            // aren't handled separately below.
            parent.setURL(url);
            return;
          }
        }
      }

      let prevParent: ElementNode | null = null;
      let linkNode: SimpleLegislationNode | null = null;

      nodes.forEach((node) => {
        const parent = node.getParent();

        if (
          parent === linkNode ||
          parent === null ||
          ($isElementNode(node) && !node.isInline())
        ) {
          return;
        }

        if ($isSimpleLegislationNode(parent)) {
          linkNode = parent;
          parent.setURL(url);
          return;
        }

        if (!parent.is(prevParent)) {
          prevParent = parent;
          linkNode = $createLegislationLinkNode(url);

          if ($isSimpleLegislationNode(parent)) {
            if (node.getPreviousSibling() === null) {
              parent.insertBefore(linkNode);
            } else {
              parent.insertAfter(linkNode);
            }
          } else {
            node.insertBefore(linkNode);
          }
        }

        if ($isSimpleLegislationNode(node)) {
          if (node.is(linkNode)) {
            return;
          }
          if (linkNode !== null) {
            const children = node.getChildren();

            for (let i = 0; i < children.length; i++) {
              linkNode.append(children[i]);
            }
          }

          node.remove();
          return;
        }

        if (linkNode !== null) {
          linkNode.append(node);
        }
      });
    }
  }
}
