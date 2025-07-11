# Vercel API for Kasia's AI Chatbot

## What is this?

This is the backend for the AI chatbot in Kasia Wieczorek’s Interactive CV.
It handles API requests securely and sends them to OpenAI, embedding Kasia’s profile.

## Files included

- `api/chat.js` – the backend logic
- `kasia-profile.json` – user profile included in the system prompt

## How to deploy

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project" → "Import manually"
3. Upload this folder
4. Add environment variable:

```
Name: OPENAI_API_KEY
Value: your OpenAI API key
```

5. Click "Deploy"
6. Use the generated endpoint, like:
```
https://your-project-name.vercel.app/api/chat
```

Now your chatbot is live! 🚀