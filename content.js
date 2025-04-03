// ✅ Multilingual unsubscribe keywords
const KEYWORDS = [
  "unsubscribe",
  "opt out",
  "unsubscribe here",
  "unsub",
  "renunță",
  "dezabonare",
  "dezabonează-te",
  "oprește notificările",
];

// 🔍 Extract sender info from Gmail/Outlook UI
function getSenderInfo() {
  const senderEl = document.querySelector("[email], [data-hovercard-id]");
  if (senderEl) {
    return (
      senderEl.getAttribute("email") ||
      senderEl.getAttribute("data-hovercard-id")
    );
  }

  const fallbackEl =
    document.querySelector("span[email]") ||
    document.querySelector("span[role='link']");
  return fallbackEl?.textContent?.trim() || "Unknown sender";
}

// 🕒 Wait until sender and unsubscribe links are available before scanning
function waitForSenderAndScan(retries = 10) {
  const sender = getSenderInfo();
  const hasSender = sender && sender !== "Unknown sender";

  const anchors = Array.from(document.querySelectorAll("a"));
  const hasUnsubLink = anchors.some((a) => {
    const text = a.textContent?.toLowerCase() ?? "";
    const href = a.href?.toLowerCase() ?? "";
    return KEYWORDS.some(
      (keyword) => text.includes(keyword) || href.includes(keyword)
    );
  });

  console.log(
    `[Unsubscribe Helper] Scan attempt — sender: ${sender}, hasSender: ${hasSender}, hasUnsubLink: ${hasUnsubLink}`
  );

  if (hasSender && hasUnsubLink) {
    console.log(
      "[Unsubscribe Helper] ✅ Found sender + unsubscribe link. Scanning..."
    );
    scanForUnsubscribeLinks(sender);
  } else if (retries > 0) {
    setTimeout(() => waitForSenderAndScan(retries - 1), 300);
  } else {
    console.warn(
      "[Unsubscribe Helper] ❌ Could not find valid sender or links."
    );
  }
}

// 🔎 Scan for unsubscribe links and merge into storage
function scanForUnsubscribeLinks(sender) {
  try {
    const foundLinks = [];
    const anchors = document.querySelectorAll("a");

    anchors.forEach((a) => {
      const text = a.textContent?.toLowerCase() ?? "";
      const href = a.href?.toLowerCase() ?? "";

      for (const keyword of KEYWORDS) {
        if (text.includes(keyword) || href.includes(keyword)) {
          if (!foundLinks.find((link) => link.sender === sender)) {
            foundLinks.push({
              text: a.textContent.trim(),
              href: a.href,
              sender,
            });
            a.style.border = "2px solid red"; // Optional: visual indicator
          }
          break;
        }
      }
    });

    // ✅ Merge with existing links in storage
    chrome.storage?.local?.get("unsubscribeLinks", (data) => {
      const existingLinks = data.unsubscribeLinks || [];
      const mergedLinks = [...existingLinks];

      foundLinks.forEach((newLink) => {
        const alreadyExists = existingLinks.some(
          (existing) =>
            existing.href === newLink.href && existing.sender === newLink.sender
        );
        if (!alreadyExists) {
          mergedLinks.push(newLink);
        }
      });

      chrome.storage.local.set({ unsubscribeLinks: mergedLinks }, () => {
        console.log(
          "[Unsubscribe Helper] Stored",
          mergedLinks.length,
          "unsubscribe link(s)."
        );
      });
    });
  } catch (err) {
    if (err?.message === "Extension context invalidated.") {
      return;
    }
    console.warn("[Unsubscribe Helper] scanForUnsubscribeLinks() failed:", err);
  }
}

// 👀 Watch for DOM changes (Gmail/Outlook SPA)
function setupMutationObserver() {
  try {
    const observer = new MutationObserver(() => {
      console.log("[Unsubscribe Helper] DOM changed — waiting to scan...");
      waitForSenderAndScan(); // wait for valid DOM state
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(waitForSenderAndScan, 1000); // first scan after delay
  } catch (err) {
    console.warn("[Unsubscribe Helper] MutationObserver setup failed:", err);
  }
}

// 🚀 Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMutationObserver);
} else {
  setupMutationObserver();
}
