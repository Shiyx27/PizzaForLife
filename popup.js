document.addEventListener("DOMContentLoaded", function() {
    const toggle = document.getElementById("pizza-toggle");
    const statusText = document.getElementById("status-text");
  
    // Retrieve the current toggle state from storage.
    chrome.storage.sync.get("toggleState", function(data) {
      // If toggleState is undefined, default to true (since checked by default).
      const currentState = data.toggleState !== undefined ? data.toggleState : true;
      toggle.checked = currentState;
      statusText.textContent = currentState ? "Yayyy!!! Pizza is freshly baked 🍕" : "Pizza party is over";
      // Save the default if not set.
      if (data.toggleState === undefined) {
        chrome.storage.sync.set({ toggleState: currentState });
      }
    });
  
    // When the toggle changes state.
    toggle.addEventListener("change", function() {
      const newState = toggle.checked;
      statusText.textContent = newState ? "Yayyy!!! Pizza is freshly baked 🍕" : "Pizza party is over";
  
      // Update the stored state.
      chrome.storage.sync.set({ toggleState: newState });
  
      // Notify the active tab's content script of the change.
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { pizzaEnabled: newState });
        }
      });
    });
  });
  