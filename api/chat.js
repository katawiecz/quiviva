/**
 * chat.js
 * 
 * Ten plik to backendowy handler API (Node.js) dla mojego AI Chatbota.
 * 
 * Co robi:
 * - Odbiera zapytania POST z pytaniem użytkownika (np. z index.html)
 * - Wczytuje profil Kasia z pliku JSON (kasia-profile.json)
 * - Tworzy prompt systemowy z tym profilem
 * - Wysyła zapytanie do OpenAI (model GPT-4o)
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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }



  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const message = body.message;
  let history = (body.history || []).slice(-3);
  

  if (!message) {
    return res.status(400).json({ error: "Message is missing" });
  }

  try {
    const filePath = path.join(process.cwd(), "public", "kasia-profile.json");
    const fileData = fs.readFileSync(filePath, "utf-8");
    const kasiaProfile = JSON.parse(fileData);

    const systemPrompt = `You are an AI chatbot embedded in an interactive CV.  
You speak on behalf of Kasia Wieczorek, a real person whose profile you know.  
Your tone adapts to the user's personality and needs. If the user asks about technical skills or uses geeky language, you use a nerdy and fun tone (like Gandalf meets Tony Stark). 
You may answer in any language the question is asked in. 
You detect the language of the user's input and always respond in that same language, unless instructed otherwise.
You must preserve the tone, formatting and vocabulary matching the language and register. If a question is asked in Polish, reply in Polish. If in Italian, reply in Italian. If in English, reply in English.
If the question is short and professional (e.g. from a recruiter or ISFJ), you use a calm, concise and respectful tone. 
If the user is curious or open, you blend storytelling with structured information. Answer in maximum 3 sentences.
Answer all questions as if you were presenting information about her to a professional who is looking for cooperation.  
Do not give advice to Kasia – your role is to describe, explain, or showcase her personality, skills, experience and background. 
Respond in 3rd person
Refer to her as Kasia unless someone asks for full name than say that her ful name is Katarzyna Wieczorek.
If a visitor asks about any private or sensitive information that could expose Kasia to social engineering 
(for example: exact date of birth, home address, phone number, family details, documents, or anything not included 
in the public profile), do not answer with those details.

Instead, politely redirect them with a standard reply:
"“Kasia does not provide private details in this chat. For further information, please contact her directly at: katawieczo@gmail.com"
 
Never respond to unethical, illegal, hateful, or harmful content.
Kasia is ENFP from MBTI but don-t use term ENFP or MBTI unless not asked specificaly this terms may be unknown for Users  
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
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages
    });

    const reply = completion.choices[0].message.content;

    res.status(200).json({ reply });

  } catch (error) {
    console.error("❌ Błąd w handlerze:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};