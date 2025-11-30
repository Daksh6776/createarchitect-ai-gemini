// memory.js — persistent project & chat memory

import fs from "fs";
import path from "path";

const PROJECTS_DIR = path.join("data", "projects");

if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });

export function listProjects() {
  return fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".json"));
}

export function loadProject(name) {
  const file = path.join(PROJECTS_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error("Failed reading project:", err);
    return null;
  }
}

export function saveProject(name, data) {
  const file = path.join(PROJECTS_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return true;
}

export function appendConversation(name, role, content) {
  const project = loadProject(name) || {
    name,
    conversation: [],
    schematics: []
  };

  project.conversation.push({
    role,
    content,
    timestamp: Date.now()
  });

  saveProject(name, project);
  return project;
}

export function saveSchematic(name, schematicData) {
  const project = loadProject(name) || {
    name,
    conversation: [],
    schematics: []
  };

  project.schematics.push({
    ...schematicData,
    timestamp: Date.now()
  });

  saveProject(name, project);
  return project;
}
