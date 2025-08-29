/**
 * chat-ui.js – frontend UI dla AI chatbota
 * - Enter wysyła wiadomość (Shift+Enter = nowa linia)
 * - Pokazuje historię i "Bot is typing..."
 * - Wysyła do backendu JSON { message, history }
 */

const API_BASE = "https://vercel-api-swart.vercel.app"; // backend na Vercel

let conversation = []; // będziemy wysyłać tylko końcówkę (slice -3)

// sanity escapowanie HTML
function sanitize(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");
  const log = document.getElementById("chat-log");
  const themeButton = document.getElementById("theme-toggle");

  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
  }
  themeButton?.addEventListener("click", toggleTheme);

  function addMessage(sender, html) {
    const row = document.createElement("div");
    row.classList.add("message");
    const icon = document.createElement("span");
    icon.classList.add("icon", sender === "bot" ? "bot-icon" : "user-icon");
    const msg = document.createElement("div");
    msg.innerHTML = html;
    row.append(icon, msg);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  async function sendMessage(message, history = []) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${txt || res.statusText}`);
    }
    const data = await res.json();
    return data.reply;
  }

  // (opcjonalnie) licznik wizyt
  fetch(`${API_BASE}/api/visits`, { method: "GET" }).catch(() => {});

  // Enter do wysyłki, Shift+Enter = nowa linia
  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();

    const question = input.value.trim();
    if (!question) return;

    addMessage("user", `<strong>You:</strong> ${sanitize(question)}`);
    input.value = "";

    conversation.push({ role: "user", content: question });

    const typing = document.createElement("div");
    typing.classList.add("typing");
    typing.textContent = "Bot is typing...";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    try {
      const reply = await sendMessage(question, conversation.slice(-3));
      typing.remove();
      conversation.push({ role: "assistant", content: reply });
      addMessage("bot", `<strong>Bot:</strong> ${sanitize(reply)}`);
    } catch (err) {
      typing.remove();
      addMessage("bot", `<strong>Bot:</strong> ${sanitize(err.message)}`);
    }
  });

  // Mobile: płynny scroll do chatboxa
  const hint = document.querySelector(".mobile-chat-hint");
  if (hint) {
    hint.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector("#chatbox")?.scrollIntoView({ behavior: "smooth" });
    });
  }
});
