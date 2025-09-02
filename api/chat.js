/**
 * chat.js
 * 
 * Ten plik to backendowy handler API (Node.js) dla mojego AI Chatbota.
 * 
 * Co robi:
 * - Odbiera zapytania POST z pytaniem użytkownika (np. z index.html)
 * - Wczytuje profil Kasia z pliku JSON (kasia-profile.json)
 * - Tworzy prompt systemowy z tym profilem
 * - Wysyła zapytanie do OpenAI (model gpt-4o-mini)
 * - Zwraca odpowiedź bota do frontendu w formacie JSON
 * 
 * Używany jest jako endpoint: /api/chat
 * (np. na Vercel lub w projekcie Node.js jako middleware/serverless function)
 * 
 * UWAGA: To nie jest frontendowy skrypt – nie ma dostępu do DOM, inputów itd.
 */

// Autor: Kasia ✨
// Utworzono: sierpień 2025



const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- CORS allowlist ---
const ALLOWED_ORIGINS = new Set([
  "https://kasiaaichatbot.me",
  "https://www.kasiaaichatbot.me",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
]);

  // --- INPUT LIMITS & HELPERS ---
const MAX_MESSAGE_LEN = 1000; // możesz zmienić np. na 1200

// HTML heurystyka: wykrywa prawdopodobne tagi (<p>, <script>, <!-- -->, itp.)
function isProbablyHtml(s) {
  return /<\s*[a-z!][^>]*>/i.test(s);
}

// Znaki kontrolne/binarki (poza dozwolonymi \n \r \t)
function hasControlChars(s) {
  return /[\x00-\x08\x0E-\x1F\x7F]/.test(s);
}

// --- Simple in-memory rate limit (per IP) ---
const RL_WINDOW_MS = 60_000; // 1 min
const RL_MAX = 12;           // np. 12 żądań/min/IP
const rlHits = new Map();
function tooMany(req){
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const arr = (rlHits.get(ip) || []).filter(t => now - t < RL_WINDOW_MS);
  arr.push(now);
  rlHits.set(ip, arr);
  return arr.length > RL_MAX;
}


// Centralna walidacja wiadomości użytkownika
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

module.exports = async function handler(req, res) {

const origin = req.headers.origin || "";
if (ALLOWED_ORIGINS.has(origin)) {
  res.setHeader("Access-Control-Allow-Origin", origin);
} else {
  // fallback (możesz też zamiast tego zwrócić 403)
  res.setHeader("Access-Control-Allow-Origin", "https://kasiaaichatbot.me");
}
res.setHeader("Vary", "Origin");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

// Jeśli przeglądarka pyta o niestandardowe nagłówki, odbij je z powrotem
const reqHeaders = req.headers["access-control-request-headers"];
res.setHeader("Access-Control-Allow-Headers", reqHeaders || "Content-Type");

// Preflight
if (req.method === "OPTIONS") {
  res.status(204).end(); // No Content
  return;
}

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const ct = (req.headers["content-type"] || "").toLowerCase();
if (!ct.includes("application/json")) {
  return res.status(415).json({ error: "Unsupported Media Type. Use application/json." });
}

if (tooMany(req)) {
  res.setHeader('Retry-After', '60');
  return res.status(429).json({ error: 'Too Many Requests' });
}


  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }



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


  const vm = validateMessage(body?.message);
if (!vm.ok) {
  return res.status(vm.status).json({ error: vm.error });
}
const userMessage = vm.value;



  try {
    const filePath = path.join(process.cwd(),"data","kasia-profile.json");
    const fileData = fs.readFileSync(filePath, "utf-8");
    const kasiaProfile = JSON.parse(fileData);

    const systemPrompt = `You are an AI chatbot embedded in an interactive CV.  
You speak on behalf of Kasia Wieczorek, a real person whose profile you know.  
Your tone is normally calm, concise and professional. 
If the user uses playful or geeky pop culture references that explicitly mention fantasy or superhero terms (such as Gandalf, Thor, Middle-earth, magic, epic, superhero, wizard, spell ) in any language, you may unlock an easter egg mode: respond in a nerdy and fun tone, as if Gandalf from Middle-earth and Master Yoda from the Star Wars were presenting Kasia’s skills. This easter egg mode is only triggered when these specific keywords appear in any language.  In easter egg mode, you may start with a dramatic opening like ‘Hearken, traveler!’ or ‘Behold!’ before describing her skills, but keep it max 3 sentences. Otherwise, stay in professional tone.

You may answer in any language the question is asked in. 
You detect the language of the user's input and always respond in that same language, unless instructed otherwise.
You must preserve the tone, formatting and vocabulary matching the language and register. If a question is asked in Polish, reply in Polish. If in Italian, reply in Italian. If in English, reply in English.
You must provide all answers in plain text only, without Markdown, bold, italic, lists, or special symbols like * or #.
Exception: job positions in JSON must always remain in English.  
Exception: when easter egg mode is enabled, responses follow the input language and style, but may include dramatic openings.
If the question is short and professional (e.g. from a recruiter or ISFJ), you use a calm, concise and respectful tone. 
If the user is curious or open, you blend storytelling with structured information. Answer in maximum 3 sentences.
Answer all questions as if you were presenting information about her to a professional who is looking for cooperation.  
Do not give advice to Kasia – your role is to describe, explain, or showcase her personality, skills, experience and background. 
Respond in 3rd person
Refer to her as Kasia unless someone asks for her full name; then say that her full name is Katarzyna Wieczorek.
If a visitor asks about any private or sensitive information that could expose Kasia to social engineering 
(for example: exact date of birth, home address, phone number, family details, documents, or anything not included 
in the public profile), do not answer with those details.
Instead, politely redirect them with a standard reply:
"Kasia does not provide private details in this chat. For further information, please contact her directly at: katawieczo@gmail.com"

If asked about compensation/salary, do not disclose specific numbers stored anywhere. Respond with the policy in compensation.compensation_policy and the generic note in compensation.compensation_hint. Offer to continue via email for specifics (katawieczo@gmail.com
).
 
Never respond to unethical, illegal, hateful, or harmful content.
Kasia is ENFP from MBTI, but don’t use the term ENFP or MBTI unless explicitly asked; these terms may be unknown to some users.
Her profile is structured in JSON format.  For example:
- "workplace" contains her previous jobs (position, company, city, start and end date),
- "education" contains her academic background (type of degree, institution, location, dates),
- "skills" is grouped by domain (like Tea, Guitar, Technology),
- "about" includes her personal and demographic details,
- "passions" are her general interests.
only use fields that exist in this JSON.
Use this structured information to answer and do not invent jobs or places she never mentioned.
You showcase her experience, skills and personality without inventing anything beyond the profile.

Here is her profile: ${JSON.stringify(kasiaProfile, null, 2)}`;
  const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage }
    ];

      const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,     // twardy limit długości odpowiedzi
      temperature: 0.3     // stabilniejsze, krótsze wypowiedzi
    });


    const reply = completion.choices[0].message.content;

    res.status(200).json({ reply });

  } catch (error) {
    console.error("❌ Błąd w handlerze:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

