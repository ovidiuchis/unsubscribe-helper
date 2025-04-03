chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateBadge") {
    chrome.action.setBadgeText({
      text: message.count > 0 ? message.count.toString() : "",
    });
    chrome.action.setBadgeBackgroundColor({ color: "#007bff" });
  }
});
