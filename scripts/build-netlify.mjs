import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const publishDir = new URL("../netlify-publish/", import.meta.url);
const workerFile = new URL("../worker/index.js", import.meta.url);
const temporaryModule = new URL("../.netlify-worker-source.mjs", import.meta.url);

const workerSource = await readFile(workerFile, "utf8");
const exportableSource = workerSource.replace(
  "export default {",
  "export { updatedPage, updatedStyles, imageBase64 };\n\nexport default {",
);

if (exportableSource === workerSource) {
  throw new Error("Could not prepare the portfolio source for Netlify.");
}

await writeFile(temporaryModule, exportableSource);

try {
  const { updatedPage, updatedStyles, imageBase64 } = await import(
    `${pathToFileURL(temporaryModule.pathname).href}?build=${Date.now()}`,
  );

  await rm(publishDir, { recursive: true, force: true });
  await mkdir(new URL("images/", publishDir), { recursive: true });
  await writeFile(new URL("index.html", publishDir), updatedPage);
  await writeFile(new URL("styles.css", publishDir), updatedStyles);
  await writeFile(
    new URL("images/avani.jpg", publishDir),
    Buffer.from(imageBase64, "base64"),
  );
} finally {
  await rm(temporaryModule, { force: true });
}
