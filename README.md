# AI Chatbot Demo – kasiaaichatbot.me

[![Status](https://img.shields.io/badge/status-active-brightgreen)](#)
[![Built with](https://img.shields.io/badge/built%20with-HTML%2FCSS%2FJS%20%2B%20Node.js-informational)](#)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black)](#)
[![License: Non-Commercial](https://img.shields.io/badge/license-Non--Commercial-important)](#license)

## 💡 What it is
A **standalone AI Chatbot** demo that powers [kasiaaichatbot.me](https://www.kasiaaichatbot.me).  
It showcases how an interactive, multilingual chatbot can present a professional profile in a recruiter-friendly way.  
Built with plain JavaScript, Node.js serverless functions on Vercel, and a structured JSON profile.  

Unlike a static CV PDF, this chatbot lets you **ask questions directly** and get multilingual, structured, recruiter-style answers.

---

## ✨ Demo
- Live: [https://www.kasiaaichatbot.me](https://www.kasiaaichatbot.me)  
- Screenshot:  

  ![Demo Screenshot](./public/assets/img/screenshot.png)  
 

---

## 🚀 Features
- 🌍 **Multilingual answers** – detects the question’s language (EN/PL/IT).  
- 📑 **Profile-driven** – grounded in `kasia-profile.json` data.  
- 🧑‍💼 **Recruiter-friendly tone** – structured, concise, professional.  
- 🔒 **Secure serverless backend** – API key only on server, never exposed to client.  

---

## 🧩 Project Structure

```

Ai_ChatBot/
├── api/ # Serverless backend (Vercel/Node.js)
│ ├── chat.js # Chatbot handler (OpenAI API + profile logic)
│ └── visits.js # Visit counter endpoint with rate limiting
│
├── data/ # Local structured data
│ ├── kasia-profile.json # Professional profile in JSON
│ └── counter.json # Visit counter (auto-updated)
│
├── public/ # Frontend (static assets)
│ ├── index.html # Landing page with chatbot UI
│ ├── style/
│ │ └── main.css # Styling (dark theme, layout, responsive)
│ ├── js/
│ │ └── chat-ui.js # Chat UI logic (fetch + display messages)
│ ├── assets/
│ │ ├── cv/
│ │ │ └── CV_EN_Katarzyna_Wieczorek.pdf # Downloadable CV
│ │ └── img/ # Backgrounds, icons, graphics
│ └── chat.ico # Favicon
│
├── vercel.json # Vercel config (headers, redirects)
├── package.json # Dependencies + metadata
├── package-lock.json # Dependency lockfile
├── README.md # Documentation (this file)
└── .gitignore # Ignore node_modules, env, cache, etc.

```
---

## 🔐 Environment Variables
These must be set in **Vercel Project Settings → Environment Variables**:

- `OPENAI_API_KEY` – server-side only (never commit it).  
- `ALLOWED_ORIGIN` – CORS allowlist for your frontend (e.g. `https://kasiaaichatbot.me`).  

> 🔑 Never commit `.env*` files. Always manage secrets via Vercel.  

---

## 🛠️ How to Run Locally

```bash
# Clone repository
git clone https://github.com/katawiecz/ai_chatbot.git
cd ai_chatbot

# Install dependencies
npm install

# Add local .env (not committed)
echo "OPENAI_API_KEY=sk-..." > .env
echo "ALLOWED_ORIGIN=http://localhost:3000" >> .env

# Run with Vercel dev (if installed globally)
vercel dev
```

## 🧪 How to Test

Open localhost
 (or your Vercel preview).

Ask in English, Polish, or Italian (e.g. “Who is Kasia and what does she do?”).

Expect clear, structured answers based on kasia-profile.json.

Fantasy trigger words (e.g. “Gandalf”, “magia”, “Thor”) enable Easter Egg mode.

##  📦 Tech Highlights

HTTP & CORS – safe request/response handling.

JSON – structured data profile & parsing.

Node.js – serverless backend functions.

Fetch – error handling with fallbacks.

File System – profile JSON served as static asset.

##  🤝 Work with Me

This project is published under a Non-Commercial license.

✅ Free to explore, fork, and learn from.

🚫 Not for commercial use.

💼 For commercial licensing, collaboration, or custom chatbot inquiries → contact me directly.

📧 Email: katawieczo@gmail.com

##  🔏 License

Code is under Non-Commercial license.
Non-code assets (images, texts, CV) are under CC BY-NC 4.0.
For details see [LICENSE](./LICENSE) and [LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md).

Cheers!!!

