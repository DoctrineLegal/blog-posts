import { globby } from "globby";
import { promises as fs } from "fs";
import path from "path";

import * as recast from "recast";

async function parseTypescriptCode(code) {
  return recast.parse(code, {
    parser: await import("recast/parsers/typescript.js"),
  });
}

function getControllerData(properties) {
  const domain = properties.find((prop) => prop.key.name === "domain");
  const endpointPath = properties.find((prop) => prop.key.name === "route");

  let path;
  if (
    endpointPath.value.type === "Literal" ||
    endpointPath.value.type === "StringLiteral"
  ) {
    path = endpointPath.value.value;
  } else if (endpointPath.value.type === "ArrayExpression") {
    path = endpointPath.value.elements.map((el) => el.value).toString();
  }

  return {
    domain: domain.value.property.name,
    path,
  };
}

export async function v1Analyzer(code) {
  const ast = await parseTypescriptCode(code);
  let endpointsData = [];
  recast.visit(ast, {
    visitNewExpression: (path) => {
      const { value } = path;
      if (value.callee.name === "Controller") {
        const firstArg = value.arguments[0];

        const endpointData = getControllerData(firstArg.properties);
        endpointsData.push(endpointData);
      }
      return false;
    },
    visitClassDeclaration: (path) => {
      const { value } = path;
      if (
        value.superClass !== null &&
        value.superClass.name.includes("Controller")
      ) {
        const tru = value.body.body.find((b) => b.kind === "constructor");

        if (tru) {
          const arg = tru.body.body[0].expression.arguments[0];

          if (arg) {
            const endpointData = getControllerData(arg.properties);
            endpointsData.push(endpointData);
          }
        }
      }
      return false;
    },
  });
  return endpointsData;
}

async function getBackwardCompatiblePaths(repository) {
  try {
    // oldest version
    await fs.access(path.join(repository, "/backend/controllers"));
    return {
      v1: "/backend/controllers",
    };
  } catch (error) {
    // mute the error
  }

  try {
    // middle version
    await fs.access(path.join(repository, "/api-server/v1/controllers"));
    return {
      v1: "/api-server/v1/controllers",
    };
  } catch (error) {
    // mute the error
  }

  // new version
  return {
    v1: "/apps/api-server/v1/controllers",
  };
}

export async function generateMetrics(repository) {
  let endpointsData = [];
  const squadsDomains = await import(
    `${repository}/packages/shared/constants/domainDesign.js`
  );

  const basePaths = await getBackwardCompatiblePaths(repository);

  const v1Paths = await globby(
    path.join(repository, `${basePaths.v1}/**/*.js`)
  );

  for (const path of v1Paths.filter((path) => !path.includes(".spec."))) {
    const code = await fs.readFile(path, "utf8");

    // Generate Mermaid flow
    const fileEndpointsData = await v1Analyzer(code);

    endpointsData = endpointsData.concat(fileEndpointsData);
  }

  const dataBySquad = endpointsData.reduce((acc, data) => {
    const { domain, path } = data;
    const squad = squadsDomains.MAPPING[domain];

    if (!acc[squad]) {
      acc[squad] = {};
    }
    if (!acc[squad][domain]) {
      acc[squad][domain] = [];
    }

    acc[squad][domain].push(path);
    return acc;
  }, {});

  console.log(dataBySquad);

  return;
}
