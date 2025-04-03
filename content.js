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
const DEBUG = true;

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// 🚀 Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMutationObserver);
} else {
  setupMutationObserver();
}

// 👀 Watch for DOM changes (Gmail/Outlook SPA)
function setupMutationObserver() {
  try {
    const debouncedScan = debounce(() => {
      if (DEBUG)
        console.log("[Unsubscribe Helper] DOM changed — waiting to scan...");
      scanForUnsubscribeLinks();
    }, 500); // wait 500ms after last change

    const observer = new MutationObserver(debouncedScan);

    // Start with the most general target: document.body
    let targetNode = document.body;

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });

    // Initial scan after short delay
    setTimeout(scanForUnsubscribeLinks, 2000); // Increased delay
  } catch (err) {
    if (DEBUG)
      console.warn("[Unsubscribe Helper] MutationObserver setup failed:", err);
  }
}

// 🔎 Scan for unsubscribe links and merge into storage
function scanForUnsubscribeLinks() {
  try {
    const foundLinks = [];
    const anchors = document.querySelectorAll("a");

    anchors.forEach((a) => {
      const text = a.textContent?.toLowerCase() ?? "";
      const href = a.href?.toLowerCase() ?? "";

      for (const keyword of KEYWORDS) {
        if (text.includes(keyword) || href.includes(keyword)) {
          const alreadyInFound = foundLinks.some(
            (link) => link.href === a.href
          );
          if (!alreadyInFound) {
            let context = extractFooterContext(a); // Try footer first
            if (!context) {
              context = extractDomain(href); // Fallback to domain
            }
            foundLinks.push({
              text: a.textContent.trim(),
              href: a.href,
              context: context, // Store the context
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
          (existing) => existing.href === newLink.href
        );
        if (!alreadyExists) {
          mergedLinks.push(newLink);
        }
      });

      chrome.storage.local.set({ unsubscribeLinks: mergedLinks }, () => {
        const count = mergedLinks.length.toString();

        // ✅ Set badge text and color
        chrome.runtime.sendMessage({
          type: "updateBadge",
          count: mergedLinks.length,
        });
        if (DEBUG)
          console.log(
            "[Unsubscribe Helper] Stored",
            count,
            "unsubscribe link(s). Badge updated."
          );
      });
    });
  } catch (err) {
    if (err?.message === "Extension context invalidated.") return;
    if (DEBUG)
      console.warn(
        "[Unsubscribe Helper] scanForUnsubscribeLinks() failed:",
        err
      );
  }
}

// 🌐 Extract the domain from a URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.replace(/^www\./, ""); // Remove "www."
    if (domain.length > 50) {
      domain = domain.substring(0, 50) + "...";
    }
    return domain;
  } catch (e) {
    return "Unknown";
  }
}

// 🦶 Extract context from the email footer
function extractFooterContext(anchor) {
  // Try to find the footer
  let currentElement = anchor;
  for (let i = 0; i < 5; i++) {
    if (currentElement.parentElement) {
      currentElement = currentElement.parentElement;
    } else {
      break;
    }
  }

  const footer = currentElement;

  if (!footer) return null;

  // Look for common patterns in the footer
  const patterns = [
    /©\s*(.+?)\s+\d{4}/i, // Copyright notice (e.g., © Company Name 2023)
    /All rights reserved by\s*(.+)/i, // All rights reserved (e.g., All rights reserved by Company Name)
    /from\s*(.+)/i, // from (e.g., from Company Name)
    /sent by\s*(.+)/i, // sent by (e.g., sent by Company Name)
    /powered by\s*(.+)/i, // powered by (e.g., powered by Company Name)
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(footer.textContent);
    if (match && match[1]) {
      let context = match[1].trim(); // Return the captured group
      if (context.length > 50) {
        context = context.substring(0, 50) + "...";
      }
      return context;
    }
  }

  return null; // No context found
}
