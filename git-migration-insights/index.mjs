import shell from "shelljs";

import { migrate } from "./migrate.mjs";
import config from "./config.mjs";
import { buildDictionary } from "./buildDictionary.mjs";

const currentDirector = shell.pwd().stdout;
shell.cd(config.repository);

shell.cd(config.repository);
shell.cd(currentDirector);
const dictionary = await buildDictionary(config.repository);
await migrate({ dictionary, repository: config.repository });
