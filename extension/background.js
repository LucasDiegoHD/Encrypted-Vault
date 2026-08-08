// LockPy Vault Background Service Worker (Manifest V3)
const HOST_NAME = "com.lockpy.vault";
const LOCAL_DAEMON_URL = "http://127.0.0.1:54321";

// Register Right-Click Context Menu on Editable Inputs
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "lockpy-autofill-context",
      title: "🔑 Fill with Encrypted Vault",
      contexts: ["editable"]
    });
  });
});

// Send message to tab with automatic script injection if tab wasn't ready
function sendTabMessageWithFallback(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    }).then(() => {
      chrome.tabs.sendMessage(tabId, message).catch(() => {});
    }).catch(() => {});
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "lockpy-autofill-context" && tab && tab.id && tab.url) {
    try {
      const domain = new URL(tab.url).hostname.replace(/^www\./, '');
      const response = await fetch(`${LOCAL_DAEMON_URL}/get-credentials?domain=${encodeURIComponent(domain)}`);
      const data = await response.json();

      if (data.status === 'ok' && data.credentials) {
        sendTabMessageWithFallback(tab.id, {
          action: "autofill",
          username: data.credentials.username,
          password: data.credentials.password
        });
      } else {
        sendTabMessageWithFallback(tab.id, {
          action: "show_toast",
          message: data.message || "Desbloqueie o aplicativo Encrypted Vault"
        });
      }
    } catch (err) {
      sendTabMessageWithFallback(tab.id, {
        action: "show_toast",
        message: "Abra o aplicativo Encrypted Vault para conectar"
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetch_credentials") {
    chrome.runtime.sendNativeMessage(
      HOST_NAME,
      {
        action: "get_credentials",
        master_password: request.masterPassword,
        service: request.domain
      },
      (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            status: "error",
            message: chrome.runtime.lastError.message
          });
        } else {
          sendResponse(response);
        }
      }
    );
    return true; // Keep message channel open
  } else if (request.action === "ping_host") {
    chrome.runtime.sendNativeMessage(HOST_NAME, { action: "ping" }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
      } else {
        sendResponse(response);
      }
    });
    return true;
  }
});
