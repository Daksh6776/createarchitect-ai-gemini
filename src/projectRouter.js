// projectRouter.js — simple project API

import express from "express";
import { listProjects, loadProject, saveProject } from "./memory.js";

const router = express.Router();

// GET /api/projects
router.get("/", (req, res) => {
  try {
    const files = listProjects();
    const projects = files.map((f) => ({
      id: f.replace(/\.json$/, ""),
      file: f
    }));
    res.json({ ok: true, projects });
  } catch (err) {
    console.error("List projects error:", err);
    res.status(500).json({ ok: false, error: "Failed to list projects" });
  }
});

// POST /api/projects
router.post("/", (req, res) => {
  try {
    const { name } = req.body || {};
    const projectName = name || "default-project";

    const existing = loadProject(projectName);
    const project =
      existing ||
      {
        name: projectName,
        conversation: [],
        schematics: []
      };

    saveProject(projectName, project);
    res.json({ ok: true, project });
  } catch (err) {
    console.error("Save project error:", err);
    res.status(500).json({ ok: false, error: "Failed to save project" });
  }
});

// GET /api/projects/:name
router.get("/:name", (req, res) => {
  try {
    const name = req.params.name;
    const project = loadProject(name);
    if (!project) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }
    res.json({ ok: true, project });
  } catch (err) {
    console.error("Load project error:", err);
    res.status(500).json({ ok: false, error: "Failed to load project" });
  }
});

export default router;
