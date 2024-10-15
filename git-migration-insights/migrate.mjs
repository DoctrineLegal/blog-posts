import { globby } from "globby";
import { promises as fs } from "fs";
import path from "path";

import * as recast from "recast";
import { clean } from "./cleanKeys.mjs";

async function parseTypescriptCode(code) {
  return recast.parse(code, {
    parser: await import("recast/parsers/babel-ts.js"),
  });
}

export async function analyzer({ code, dictionary, filePath }) {
  const ast = await parseTypescriptCode(code);
  const keysToDelete = [];
  const modifiedAst = recast.visit(ast, {
    visitJSXOpeningElement: (path) => {
      const { value } = path;
      if (value.name.name === "FormattedMessage") {
        const hasDefaultMessage = value.attributes.some(
          (attribute) => attribute.name?.name === "defaultMessage"
        );
        const idElement = value.attributes.find(
          (attribute) => attribute.name?.name === "id"
        );

        if (
          !hasDefaultMessage &&
          !!idElement &&
          !!idElement.value.value &&
          !dictionary[idElement.value.value]
        ) {
          console.log("filePath", filePath);
          console.log(`Missing translation for ${idElement.value.value}`);
        }

        if (
          !hasDefaultMessage &&
          !!idElement &&
          !!idElement.value.value &&
          dictionary[idElement.value.value]
        ) {
          value.attributes.push(
            recast.types.builders.jsxAttribute(
              recast.types.builders.jsxIdentifier("defaultMessage"),
              recast.types.builders.jsxExpressionContainer(
                recast.types.builders.templateLiteral(
                  [
                    recast.types.builders.templateElement(
                      {
                        raw: dictionary[idElement.value.value],
                        cooked: dictionary[idElement.value.value],
                      },
                      false
                    ),
                  ],
                  []
                )
              )
            )
          );
          keysToDelete.push(idElement.value.value);
        }
      }

      return false;
    },
  });

  return { updateCode: recast.print(modifiedAst).code, keysToDelete };
}

export async function migrate({ dictionary, repository }) {
  const clientPaths = await globby(
    path.join(repository, `apps/front-server/components/**/*.tsx`)
  );

  let result = [];

  for (const path of clientPaths.filter((path) => !path.includes(".spec."))) {
    const code = await fs.readFile(path, "utf8");

    const { updateCode, keysToDelete } = await analyzer({
      dictionary,
      code,
      filePath: path,
    });

    await fs.writeFile(path, updateCode, "utf8");
    result = result.concat(keysToDelete);
  }

  await clean({ keysToDelete: result, repository });
}
