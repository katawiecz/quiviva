/**
 * chat-ui.js
 * 
 * Ten plik odpowiada za frontendową logikę UI mojego AI Chatbota.
 * 
 * Co robi:
 * - Obsługuje wpisywanie pytań przez użytkownika (Enter)
 * - Wyświetla wiadomości w oknie czatu (zarówno użytkownika, jak i bota)
 * - Pokazuje avatar bota i użytkownika
 * - Dodaje animację „Bot is typing...”
 * - Wysyła pytanie do backendu (fetch → /api/chat)
 * - Obsługuje tryb dzienny/nocny (ciemne tło)
 * 
 * Ten kod działa po stronie przeglądarki (frontend, JavaScript w HTML).
 * Nie ma dostępu do Node.js, plików lokalnych ani zmiennych środowiskowych.
 * 
 * Do załączenia w HTML: 
 * <script src=\"js/chat-ui.js\" defer></script>
 * 
 * ✨ UI by Kasia ✨
 */

// Autor: Kasia
// Utworzono: sierpień 2025
// Repozytorium: interactive_cv_project



document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");
  const log = document.getElementById("chat-log");
  const themeButton = document.getElementById("theme-toggle");

    function toggleTheme() {
    document.body.classList.toggle("dark-mode");
  }

  themeButton.addEventListener("click", toggleTheme);

  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.classList.add("message");
    const icon = document.createElement("span");
    icon.classList.add("icon", sender === "bot" ? "bot-icon" : "user-icon");
    const msg = document.createElement("div");
    msg.innerHTML = text;
    div.appendChild(icon);
    div.appendChild(msg);
    log.appendChild(div);
  }



  input.addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
      const question = input.value;
      if (!question) return;

      addMessage("user", `<strong>You:</strong> ${question}`);
      input.value = "";

      const typing = document.createElement("div");
      typing.classList.add("typing");
      typing.textContent = "Bot is typing...";
      log.appendChild(typing);
      log.scrollTop = log.scrollHeight;

      try {
        const response = await fetch("https://vercel-api-swart.vercel.app/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question })
        });
        const text = await response.text();
        const data = JSON.parse(text);
        typing.remove();
        const reply = data.reply || "(No response)";
        addMessage("bot", `<strong>Bot:</strong> ${reply}`);
      } catch (error) {
        typing.remove();
        addMessage("bot", `<strong>Bot:</strong> Error: ${error.message}`);
      }

      log.scrollTop = log.scrollHeight;
    }
  });
});