document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("links");
  const clearBtn = document.getElementById("clearBtn");

  function renderLinks() {
    chrome.storage.local.get("unsubscribeLinks", (data) => {
      const links = data.unsubscribeLinks || [];

      if (links.length === 0) {
        container.textContent = "No unsubscribe links found.";
        return;
      }

      container.innerHTML = "";

      links.forEach(({ text, href, sender }) => {
        const div = document.createElement("div");
        div.className = "link";

        const displayText = text?.trim() || href;

        const linkText = document.createElement("span");
        linkText.textContent = `${displayText} ${sender ? `(${sender})` : ""}`;

        const button = document.createElement("button");
        button.textContent = "Unsub";

        button.addEventListener("click", () => {
          // Open the unsubscribe link
          window.open(href, "_blank");

          // Fade out animation
          div.classList.add("fade-out");

          // After animation, remove from storage
          setTimeout(() => {
            chrome.storage.local.get("unsubscribeLinks", (data) => {
              const allLinks = data.unsubscribeLinks || [];

              const updatedLinks = allLinks.filter(
                (link) => !(link.sender === sender)
              );

              chrome.storage.local.set(
                { unsubscribeLinks: updatedLinks },
                () => {
                  renderLinks(); // Re-render UI
                }
              );
            });
          }, 300); // match CSS fade
        });

        div.appendChild(linkText);
        div.appendChild(button);
        container.appendChild(div);
      });
    });
  }

  clearBtn.addEventListener("click", () => {
    chrome.storage.local.set({ unsubscribeLinks: [] }, () => {
      container.textContent = "Unsubscribe list cleared.";
    });
  });

  renderLinks();
});
