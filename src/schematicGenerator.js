// schematicGenerator.js — save schematic blueprint files

import fs from "fs";
import path from "path";

const PROJECTS_DIR = path.join("data", "projects");

if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });

export function saveBlueprintFile(projectName, blueprint) {
  const safeName = projectName?.replace(/[^a-z0-9_\-]/gi, "_") || "global";
  const fileName = `${safeName}_schematic_${Date.now()}.json`;
  const filePath = path.join(PROJECTS_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(blueprint, null, 2));

  return {
    fileName,
    path: filePath,
    relative: `data/projects/${fileName}`
  };
}
