import { globby } from "globby";
import { promises as fs } from "fs";
import path from "path";

import * as recast from "recast";

async function parseTypescriptCode(code) {
  return recast.parse(code, {
    parser: await import("recast/parsers/typescript.js"),
  });
}

export async function v1Analyzer(code) {
  const ast = await parseTypescriptCode(code);
  let count = 0;
  recast.visit(ast, {
    visitNewExpression: (path) => {
      const { value } = path;
      if (value.callee.name === "Controller") {
        count += 1;
      }
      return true;
    },
  });
  return count;
}

export async function v2Analyzer(code) {
  const ast = await parseTypescriptCode(code);

  let count = 0;
  recast.visit(ast, {
    visitDecorator: (path) => {
      const { value } = path;

      const annotation = value.expression.callee.name;
      if (["Post", "Get", "Put", "Delete"].includes(annotation)) {
        count += 1;
      }
      return true;
    },
  });
  return count;
}

async function getBackwardCompatiblePaths(repository) {
  try {
    // oldest version
    await fs.access(path.join(repository, "/backend/controllers"));
    return {
      v1: "/backend/controllers",
      v2: undefined,
    };
  } catch (error) {
    // mute the error
  }

  // new version
  return {
    v1: "/apps/api-server/v1/controllers",
    v2: "/apps/api-server/v2/infrastructure/controllers",
  };
}

export async function generateMetrics(repository) {
  let controllersCount = { v1: 0, v2: 0 };

  const basePaths = await getBackwardCompatiblePaths(repository);

  const v1Paths = await globby(
    path.join(repository, `${basePaths.v1}/**/*.js`)
  );

  for (const path of v1Paths.filter((path) => !path.includes(".spec."))) {
    const code = await fs.readFile(path, "utf8");

    // Generate Mermaid flow
    const count = await v1Analyzer(code);
    controllersCount.v1 += count;
  }

  const v2Paths = basePaths.v2
    ? await globby(path.join(repository, `${basePaths.v2}/**/*.ts`))
    : [];

  for (const path of v2Paths.filter((path) => !path.includes("/tests/"))) {
    const code = await fs.readFile(path, "utf8");

    // Generate Mermaid flow
    const count = await v2Analyzer(code);
    controllersCount.v2 += count;
  }

  return controllersCount;
}
