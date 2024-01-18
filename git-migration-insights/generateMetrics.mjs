import { globby } from "globby";
import { promises as fs } from "fs";
import path from "path";
import config from "./config.mjs";
import * as recast from "recast";

const { repository } = config;

function v1Analyzer(ast) {
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

function v2Analyzer(ast) {
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

async function getBackwardCompatiblePaths() {
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

export async function generateMetrics() {
  let controllersCount = { v1: 0, v2: 0 };

  const basePaths = await getBackwardCompatiblePaths();

  const v1Paths = await globby(
    path.join(repository, `${basePaths.v1}/**/*.js`)
  );

  for (const path of v1Paths.filter((path) => !path.includes(".spec."))) {
    const file = await fs.readFile(path, "utf8");

    // Read TypeScript source code
    const tsAst = recast.parse(file, {
      parser: await import("recast/parsers/typescript.js"),
    });

    // Generate Mermaid flow
    const count = v1Analyzer(tsAst);
    controllersCount.v1 += count;
  }

  const v2Paths = basePaths.v2
    ? await globby(path.join(repository, `${basePaths.v2}/**/*.ts`))
    : [];

  for (const path of v2Paths.filter((path) => !path.includes("/tests/"))) {
    const file = await fs.readFile(path, "utf8");

    // Read TypeScript source code
    const tsAst = recast.parse(file, {
      parser: await import("recast/parsers/typescript.js"),
    });

    // Generate Mermaid flow
    const count = v2Analyzer(tsAst);
    controllersCount.v2 += count;
  }

  return controllersCount;
}
