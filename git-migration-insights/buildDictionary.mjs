import { promises as fs } from "fs";
import path from "path";

export async function buildDictionary(repository) {
  const data = await fs.readFile(
    path.join(
      repository,
      "apps/front-server/locales/read-only-auto-generated/fr.json"
    ),
    "utf8"
  );

  return JSON.parse(data);
}
