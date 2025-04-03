document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("links");
  const clearBtn = document.getElementById("clearBtn");

  // 🔁 Render the list of unsubscribe links
  function renderLinks() {
    chrome.storage.local.get("unsubscribeLinks", (data) => {
      const links = data.unsubscribeLinks || [];

      if (links.length === 0) {
        container.textContent = "No unsubscribe links found.";
        return;
      }

      container.innerHTML = "";

      links.forEach(({ href, context }) => {
        const div = document.createElement("div");
        div.className = "link";

        const contextText = document.createElement("span");
        contextText.textContent = `(${context})`;
        contextText.style.color = "gray";

        const button = document.createElement("button");
        button.textContent = "Unsub \uD83D\uDEAB";

        button.addEventListener("click", () => {
          // ✅ Open the unsubscribe link
          window.open(href, "_blank");

          // ✅ Animate fade out
          div.classList.add("fade-out");

          // ✅ Remove the entry immediately
          chrome.storage.local.get("unsubscribeLinks", (data) => {
            const currentLinks = data.unsubscribeLinks || [];

            // Remove the clicked link using href match
            const updatedLinks = currentLinks.filter(
              (link) => link.href !== href
            );

            chrome.storage.local.set({ unsubscribeLinks: updatedLinks }, () => {
              // 🔄 Update the badge count
              chrome.runtime.sendMessage({
                type: "updateBadge",
                count: updatedLinks.length,
              });

              // 🔁 Refresh the UI
              // renderLinks(); // Removed this line
              div.remove(); // Remove the div directly
            });
          });
        });

        div.appendChild(contextText);
        div.appendChild(button);
        container.appendChild(div);
      });
    });
  }

  // 🧹 Clear all links + reset badge
  clearBtn.addEventListener("click", () => {
    chrome.storage.local.set({ unsubscribeLinks: [] }, () => {
      chrome.runtime.sendMessage({
        type: "updateBadge",
        count: 0,
      });

      container.textContent = "Unsubscribe list cleared.";
    });
  });

  // 🚀 Initial render
  renderLinks();
});
