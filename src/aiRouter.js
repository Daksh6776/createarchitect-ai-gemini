// aiRouter.js — main AI engine using Groq (chat) + Gemini (schematics)

import express from "express";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  CREATE_MODE_PROMPT,
  PRO_MODE_PROMPT,
  GENERAL_MODE_PROMPT,
  AUTO_ROUTER_PROMPT
} from "./prompts.js";

import { loadUserProfile, saveUserProfile } from "./userProfile.js";
import {
  appendConversation,
  saveSchematic,
  loadProject
} from "./memory.js";
import { saveBlueprintFile } from "./schematicGenerator.js";
import { estimateStress } from "./tools/createSim.js";

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// models
const CHAT_MODEL = process.env.CHAT_MODEL || "llama-3.1-70b-versatile";
const BLUEPRINT_MODEL = process.env.BLUEPRINT_MODEL || "gemini-1.5-flash";

function styleInstruction(profile) {
  return `
User style settings:
- tone: ${profile.tone}
- detail: ${profile.detail}
- emojis: ${profile.emojis}
- formatting: ${profile.formatting}

Respect these settings while answering.
`.trim();
}

function basePromptForMode(mode) {
  if (mode === "create") return CREATE_MODE_PROMPT;
  if (mode === "pro") return PRO_MODE_PROMPT;
  return GENERAL_MODE_PROMPT;
}

async function groqChat(messages) {
  const completion = await groq.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.4,
    messages
  });
  return completion.choices[0]?.message?.content ?? "(no reply)";
}

async function autoMode(message) {
  try {
    const raw = await groqChat([
      { role: "system", content: AUTO_ROUTER_PROMPT },
      { role: "user", content: message }
    ]);
    const parsed = JSON.parse(raw);
    if (parsed.mode === "create" || parsed.mode === "pro" || parsed.mode === "general") {
      return parsed.mode;
    }
  } catch (err) {
    console.warn("Auto router failed; falling back:", err?.message || err);
  }
  const lower = message.toLowerCase();
  if (lower.includes("create ") || lower.includes("factory") || lower.includes("kinetic"))
    return "create";
  if (lower.includes("forge") || lower.includes("fabric") || lower.includes("gradle"))
    return "pro";
  return "general";
}

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  try {
    const { message, mode = "auto", projectName } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ ok: false, error: "Missing 'message' string" });
    }

    const profile = loadUserProfile();
    const chosenMode = mode === "auto" ? await autoMode(message) : mode;
    const modePrompt = basePromptForMode(chosenMode);
    const styleText = styleInstruction(profile);

    let historyText = "";
    if (projectName) {
      const project = loadProject(projectName);
      if (project?.conversation?.length) {
        const last = project.conversation.slice(-4);
        historyText =
          "Recent project messages:\n" +
          last
            .map((m) => `[${m.role}] ${m.content.slice(0, 200)}`)
            .join("\n");
      }
    }

    const systemContent = [modePrompt, styleText, historyText].filter(Boolean).join("\n\n");

    const reply = await groqChat([
      { role: "system", content: systemContent },
      { role: "user", content: message }
    ]);

    if (projectName) {
      appendConversation(projectName, "user", message);
      appendConversation(projectName, "assistant", reply);
    }

    res.json({ ok: true, mode: chosenMode, reply });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ ok: false, error: "AI error", details: String(err) });
  }
});

// GET /api/ai/style
router.get("/style", (req, res) => {
  try {
    const profile = loadUserProfile();
    res.json({ ok: true, profile });
  } catch (err) {
    console.error("Load style error:", err);
    res.status(500).json({ ok: false, error: "Failed to load style" });
  }
});

// POST /api/ai/style
router.post("/style", (req, res) => {
  try {
    const { tone, detail, emojis, formatting } = req.body || {};
    const updated = saveUserProfile({ tone, detail, emojis, formatting });
    res.json({ ok: true, profile: updated });
  } catch (err) {
    console.error("Save style error:", err);
    res.status(500).json({ ok: false, error: "Failed to save style" });
  }
});

// POST /api/ai/schematic — uses Gemini Flash
router.post("/schematic", async (req, res) => {
  try {
    const { instructions, projectName } = req.body || {};
    if (!instructions || typeof instructions !== "string") {
      return res.status(400).json({ ok: false, error: "Missing 'instructions' string" });
    }

    const prompt = `
User wants a Create/Minecraft contraption. Convert into STRICT JSON:

{
  "name": "short_name",
  "description": "what it does",
  "materials": ["key blocks/items"],
  "size": "WxHxL in blocks",
  "steps": [
    "Step 1 ...",
    "Step 2 ..."
  ],
  "stress": {
    "machines": 4,
    "baseStress": 256
  }
}

No markdown, ONLY JSON.

User instructions: ${instructions}
`.trim();

    const model = genAI.getGenerativeModel({ model: BLUEPRINT_MODEL });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let blueprint;
    try {
      blueprint = JSON.parse(text);
    } catch (err) {
      blueprint = { parseError: String(err), raw: text };
    }

    if (blueprint?.stress?.machines) {
      blueprint.stressEstimate = estimateStress(
        blueprint.stress.machines,
        blueprint.stress.baseStress || 256
      );
    }

    if (projectName) {
      saveSchematic(projectName, blueprint);
      saveBlueprintFile(projectName, blueprint);
    }

    res.json({ ok: true, schematic: blueprint });
  } catch (err) {
    console.error("Schematic error:", err);
    res.status(500).json({ ok: false, error: "Schematic AI error", details: String(err) });
  }
});

export default router;
