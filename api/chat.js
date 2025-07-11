import { Configuration, OpenAIApi } from "openai";
import fs from "fs";
import path from "path";



export default async function handler(req, res) {
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

    const { message } = body || {};
  if (!message) {
    return res.status(400).json({ error: "Message is missing" });
  }


  const filePath = path.join(process.cwd(), "public", "kasia-profile.json");
  const fileData = fs.readFileSync(filePath, "utf-8");
  const kasiaProfile = JSON.parse(fileData);

  const systemPrompt = `You are an AI chatbot embedded in an interactive CV.  
You speak on behalf of Kasia Wieczorek, a real person whose profile you know.  
Answer all questions as if you were presenting information about her to a curious visitor.  
Do not give advice to Kasia – your role is to describe, explain, or showcase her personality, skills, experience and background.  
You may answer in any language the question is asked in. Use analogies or metaphors if it fits the tone of the question.  
Refer to her as Kasia unless someone asks for full name. Never respond to unethical, illegal, hateful, or harmful content.

Her profile is structured in JSON format. For example:
- "workplace" contains her previous jobs (position, company, city, start and end date),
- "education" contains her academic background (type of degree, institution, location, dates),
- "skills" is grouped by domain (like Tea, Guitar, Technology),
- "about" includes her personal and demographic details,
- "passions" are her general interests.

Use this structured information to answer precisely and do not invent jobs or places she never mentioned.

Here is her profile: ${JSON.stringify(kasiaProfile, null, 2)}`;

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ]
  });

  const reply = completion.data.choices[0].message.content;
  res.status(200).json({ reply });
}
