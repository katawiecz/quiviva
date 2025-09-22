/**
 * chat.js – Backend API handler for Kasia's AI Chatbot
 * ----------------------------------------------------
 * Responsibilities:
 * - Accepts POST requests from the frontend with a user question.
 * - Validates and sanitizes input (length, content type, no HTML).
 * - Loads Kasia's profile from JSON (kasia-profile.json).
 * - Constructs a system prompt embedding Kasia’s profile data.
 * - Calls OpenAI (gpt-4o-mini) with conversation context.
 * - Returns the assistant’s reply in JSON format to the client.
 * 
 * Endpoint: /api/chat
 * Usage: Deployed on Vercel as a serverless function, or in Node.js middleware.
 * 
 * ⚠️ Note: This is backend-only code. It does not access DOM, inputs, or UI.
 */

// ----------------------------------------------------
// Imports & Initialization
// ----------------------------------------------------
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------------------------------
// CORS Allowlist
// ----------------------------------------------------
// Only these origins are allowed to call the API.
// Helps prevent abuse from unauthorized websites.
const ALLOWED_ORIGINS = new Set([
  "https://kasiaaichatbot.me",
  "https://www.kasiaaichatbot.me",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
]);

// ----------------------------------------------------
// Input Limits & Validation Helpers
// ----------------------------------------------------
const MAX_MESSAGE_LEN = 1000; // Max allowed length of a user message

// Detects potential HTML markup (basic heuristic)
function isProbablyHtml(s) {
  return /<\s*[a-z!][^>]*>/i.test(s);
}

// Detects disallowed control characters (except \n \r \t)
function hasControlChars(s) {
  return /[\x00-\x08\x0E-\x1F\x7F]/.test(s);
}

// ----------------------------------------------------
// Simple In-Memory Rate Limiter (per IP)
// ----------------------------------------------------
// - Window: 1 minute
// - Max requests: 12 per minute per IP
// NOTE: This resets when the serverless function is re-deployed.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 12;
const rlHits = new Map();

function tooMany(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0].trim();
  const now = Date.now();
  const arr = (rlHits.get(ip) || []).filter(t => now - t < RL_WINDOW_MS);
  arr.push(now);
  rlHits.set(ip, arr);
  return arr.length > RL_MAX;
}

// ----------------------------------------------------
// Centralized Message Validation
// ----------------------------------------------------
function validateMessage(input) {
  if (typeof input !== "string") {
    return { ok: false, status: 400, error: "Invalid 'message' type. Expected string." };
  }

  const message = input.trim();
  if (message.length === 0) {
    return { ok: false, status: 400, error: "Message is empty." };
  }

  if (message.length > MAX_MESSAGE_LEN) {
    return { ok: false, status: 413, error: `Message too long. Max ${MAX_MESSAGE_LEN} chars.` };
  }

  if (isProbablyHtml(message)) {
    return { ok: false, status: 400, error: "HTML not allowed." };
  }

  if (hasControlChars(message)) {
    return { ok: false, status: 400, error: "Unsupported control characters in message." };
  }

  return { ok: true, value: message };
}

// ----------------------------------------------------
// Main API Handler
// ----------------------------------------------------
module.exports = async function handler(req, res) {
  // --- CORS Handling ---
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Default fallback (can also reject with 403 if stricter)
    res.setHeader("Access-Control-Allow-Origin", "https://kasiaaichatbot.me");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // Echo requested headers back if present
  const reqHeaders = req.headers["access-control-request-headers"];
  res.setHeader("Access-Control-Allow-Headers", reqHeaders || "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).end(); // No Content
    return;
  }

  // --- Application-level authentication ---
// Ensure that only requests including the correct server token are processed.
// This is not a replacement for user auth, but prevents random abuse of the API.
const clientToken = req.headers["x-app-auth"];
if (!clientToken || clientToken !== process.env.SERVER_API_TOKEN) {
  return res.status(401).json({ error: "Unauthorized" });
}

  // --- Method & Content-Type Validation ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (!ct.includes("application/json")) {
    return res.status(415).json({ error: "Unsupported Media Type. Use application/json." });
  }

  // --- Rate Limiting ---
  if (tooMany(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too Many Requests' });
  }

  // --- Parse Body ---
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  // --- Prepare Conversation History ---
  const MAX_HISTORY_ITEMS = 3;
  const rawHistory = Array.isArray(body?.history) ? body.history : [];
  const history = rawHistory
    .slice(-MAX_HISTORY_ITEMS)
    .map(h => {
      const role = h?.role;
      const content = typeof h?.content === "string" ? h.content : "";
      const v = validateMessage(content);
      return (role === "user" || role === "assistant") && v.ok
        ? { role, content: v.value }
        : null;
    })
    .filter(Boolean);

  // --- Validate Current User Message ---
  const vm = validateMessage(body?.message);
  if (!vm.ok) {
    return res.status(vm.status).json({ error: vm.error });
  }
  const userMessage = vm.value;

  try {
    // --- Load Kasia's Profile from JSON ---
    const filePath = path.join(process.cwd(), "data", "kasia-profile.json");
    const fileData = fs.readFileSync(filePath, "utf-8");
    const kasiaProfile = JSON.parse(fileData);

    // --- Build System Prompt ---
    // Embeds profile data and enforces chatbot behavior rules

    const systemPrompt = `You are an AI chatbot embedded in an interactive CV.  
You speak on behalf of Kasia, a real person whose profile you know. Always speak as if presenting Kasia to someone else, never as if you are Kasia yourself.  
Your tone is normally calm, concise, and professional.  

If the input contains any of these words: ["Gandalf", "Thor", "Middle-earth", "magia", "czar", "zaklęcie", "superbohater", "Marvel"], 
you MUST always switch to Easter Egg mode. This rule overrides all other rules. In Easter Egg mode respond in a nerdy and fun tone, always rhyme, as if Gandalf from Middle-earth and Master Yoda from Star Wars were presenting Kasia’s skills.  
In easter egg mode, answers must not exceed 5 sentences. Keep the unusual response tone and style, maximum nerdy and geek.  
This easter egg mode is only triggered when specific nerdy or geeky keywords appear in any language. Continue in easter egg mode only until the user asks a normal, professional question again.  

You may answer in any language the question is asked in.  
You detect the language of the user's input and always respond in that same language, unless instructed otherwise.  

You must preserve the tone, formatting, and vocabulary matching the language and register. Example: if a question is asked in Polish, reply in Polish. If in Italian, reply in Italian. If in English, reply in English. The same rule applies to other languages.  
You must provide all answers in plain text only, without Markdown, bold, italic, lists, or special symbols like * or #.  

Exception: job positions in JSON must always remain in English.  
Exception: in easter egg mode, always preserve the input language for the full answer. Start with a dramatic opening such as “Behold! A tale of technology and magic awaits!” or “By the power of Azure, let Kasia’s skills be revealed!” — appropriate to the input language, like a D&D Master.  

Translate all content, including metaphors and fantasy style, into the language of the input.  
This rule has absolute priority over any other rule but applies only in easter egg mode.  

If the question is short and professional (e.g. from a recruiter or ISFJ), use a calm, concise, and respectful tone.  
If the user is curious or open, blend storytelling with structured information. Answer in a maximum of 3 sentences.  
Answer all questions as if you were presenting information about her to a professional who is considering cooperation.  
Do not give advice to Kasia – your role is to describe, explain, or showcase her personality, skills, experience, and background.  

Refer to her as Kasia unless someone asks for her full name; then say that her full name is Katarzyna Wieczorek.  

If a visitor asks about any private or sensitive information that could expose Kasia to social engineering  
(for example: exact date of birth, home address, phone number, family details, documents, or anything not included  
in the public profile), do not answer with those details.  

Whenever redirecting (private details, compensation, irrelevant questions), always use polite, concise one-sentence disclaimers.  
If the question is irrelevant to Kasia’s profile, respond politely that it is outside the scope of this interactive CV.  

Use this standard reply:  
“For further details, please contact Kasia directly at: katawieczo@gmail.com — she will be glad to provide more information.”  

If asked about compensation/salary, do not disclose specific numbers stored anywhere. Respond with the policy in compensation.compensation_policy and the generic note in compensation.compensation_hint. Offer to continue via email for specifics (katawieczo@gmail.com).  

Never respond to unethical, illegal, hateful, or harmful content.  

Kasia is ENFP from MBTI, but do not use the term ENFP or MBTI unless explicitly asked, as these terms may be unknown to some users.  

Her profile is structured in JSON format. For example:  
- "workplace" contains her previous jobs (position, company, city, start and end date),  
- "education" contains her academic background (type of degree, institution, location, dates),  
- "skills" is grouped by domain (e.g. Tea, Guitar, Technology),  
- "about" includes her personal and demographic details,  
- "passions" are her general interests.  

Only use fields that exist in this JSON.  
You have access to Kasia’s profile structured in JSON. Do not show raw JSON to the user. Only use it to craft natural text answers.  
Use this structured information to answer and do not invent jobs or places she never mentioned.  
You showcase her experience, skills, and personality without inventing anything beyond the profile.  


Here is her profile: ${JSON.stringify(kasiaProfile, null, 2)}`;

    // Final conversation messages
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage }
    ];

    // --- Call OpenAI Chat Completion API ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,  // Hard limit on reply length
      temperature: 0.3  // Lower = more concise, stable answers
    });

    const reply = completion.choices[0].message.content;

    // --- Respond to Client ---
    res.status(200).json({ reply });

  } catch (error) {
    console.error("❌ Handler error:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

