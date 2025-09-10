/**
 * chat-ui.js – Frontend logic for the AI Chatbot
 * ------------------------------------------------
 * Features:
 * - Handles message sending via Enter (Shift+Enter = newline).
 * - Maintains a conversation history (limited to the last 3 turns).
 * - Displays user and bot messages in the chat log.
 * - Shows a "Bot is typing..." indicator while awaiting responses.
 * - Sends/receives JSON { message, history } to the backend API.
 * - Provides theme toggle (dark/light).
 * - Smooth scroll to chatbox on mobile.
 */

const API_BASE = "https://vercel-api-swart.vercel.app"; // Backend deployed on Vercel

let conversation = []; // Holds conversation turns; only the last 3 are sent to the API

/**
 * Sanitize text to prevent XSS by escaping HTML.
 * Converts input into plain text nodes.
 */
function sanitize(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");   // Chat input field
  const log = document.getElementById("chat-log");       // Chat log container
  const themeButton = document.getElementById("theme-toggle"); // Theme toggle button

  /**
   * Toggle dark mode theme by adding/removing a class on <body>.
   */
  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
  }
  themeButton?.addEventListener("click", toggleTheme);

  /**
   * Append a chat message row to the log.
   * @param {string} sender - "user" or "bot"
   * @param {string} html   - Sanitized HTML string to display
   */
  function addMessage(sender, html) {
    const row = document.createElement("div");
    row.classList.add("message");

    const icon = document.createElement("span");
    icon.classList.add("icon", sender === "bot" ? "bot-icon" : "user-icon");

    const msg = document.createElement("div");
    msg.innerHTML = html;

    row.append(icon, msg);
    log.appendChild(row);

    // Auto-scroll to the latest message
    log.scrollTop = log.scrollHeight;
  }

  /**
   * Send a message to the backend API and return the bot's reply.
   * @param {string} message - The user's input
   * @param {Array} history  - Slice of recent conversation turns
   * @returns {Promise<string>} Bot reply
   */
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

  /**
   * Optional: trigger the visits counter endpoint.
   * Fires on page load; errors are ignored silently.
   */
  fetch(`${API_BASE}/api/visits`, { method: "GET" }).catch(() => {});

  /**
   * Input handler:
   * - Enter sends the message
   * - Shift+Enter inserts a newline
   */
  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();

    const question = input.value.trim();
    if (!question) return;

    // Show user's message in the chat log
    addMessage("user", `<strong>You:</strong> ${sanitize(question)}`);
    input.value = "";

    // Push user turn into conversation history
    conversation.push({ role: "user", content: question });

    // Show "typing…" indicator
    const typing = document.createElement("div");
    typing.classList.add("typing");
    typing.textContent = "Bot is typing...";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    try {
      // Send to backend, only keep last 3 conversation turns
      const reply = await sendMessage(question, conversation.slice(-3));

      typing.remove();
      conversation.push({ role: "assistant", content: reply });

      // Show bot reply
      addMessage("bot", `<strong>Bot:</strong> ${sanitize(reply)}`);
    } catch (err) {
      typing.remove();

      // Show error message as a bot reply
      addMessage("bot", `<strong>Bot:</strong> ${sanitize(err.message)}`);
    }
  });

  /**
   * Mobile enhancement:
   * Smoothly scroll to the chatbox when the "scroll down" hint is clicked.
   */
  const hint = document.querySelector(".mobile-chat-hint");
  if (hint) {
    hint.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector("#chatbox")?.scrollIntoView({ behavior: "smooth" });
    });
  }
});
