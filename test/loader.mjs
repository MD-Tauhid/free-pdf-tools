import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    let resolvedPath = path.resolve("./src", subpath);

    if (fs.existsSync(resolvedPath + ".ts")) {
      resolvedPath = resolvedPath + ".ts";
    } else if (fs.existsSync(resolvedPath + ".tsx")) {
      resolvedPath = resolvedPath + ".tsx";
    } else if (fs.existsSync(path.join(resolvedPath, "index.ts"))) {
      resolvedPath = path.join(resolvedPath, "index.ts");
    }

    return {
      url: pathToFileURL(resolvedPath).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}
