import { globby } from "globby";
import { promises as fs } from "fs";
import path from "path";

async function deleteFileAsync(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`Successfully deleted ${filePath}`);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
  }
}

export async function clean({ keysToDelete, repository }) {
  const translationFiles = await globby(
    path.join(repository, `apps/front-server/components/**/*.intl.json`)
  );

  for (const path of translationFiles) {
    const raw = await fs.readFile(path, "utf8");
    const componentTranslations = JSON.parse(raw);

    const newTrad = Object.keys(componentTranslations).reduce((acc, key) => {
      if (!keysToDelete.includes(key)) {
        acc[key] = componentTranslations[key];
      }
      return acc;
    }, {});

    // if no more keys -> delete file
    if (Object.keys(newTrad).length === 0) {
      await deleteFileAsync(path);
    } else {
      await fs.writeFile(path, JSON.stringify(newTrad), "utf8");
    }
  }
}
