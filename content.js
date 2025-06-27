// content.js

// List of pizza images.
const pizzaImages = [
    "pizza1.jpeg", "pizza2.jpeg", "pizza3.jpeg", "pizza4.jpeg", "pizza5.jpeg",
    "pizza6.jpeg", "pizza7.jpeg", "pizza8.jpeg", "pizza9.jpeg", "pizza10.jpeg",
    "pizza11.jpeg", "pizza12.jpeg", "pizza13.jpeg", "pizza14.jpeg", "pizza15.jpeg",
    "pizza16.jpeg", "pizza17.jpeg", "pizza18.jpeg", "pizza19.jpeg", "pizza20.jpeg",
    "pizza21.jpeg", "pizza22.jpeg", "pizza23.jpeg", "pizza24.jpeg", "pizza25.jpeg",
    "pizza26.jpeg"
  ];
  
  // Global toggle state.
  let pizzaEnabled = false;
  
  // Use a WeakMap to store a MutationObserver for each processed image.
  const pizzaObservers = new WeakMap();
  
  /**
   * Starts an observer on the image to ensure its pizza source stays in place.
   * If any change to the src occurs (for example, from lazy-loading logic),
   * the observer will reapply the expected pizza image.
   */
  function monitorPizzaImage(img) {
    const expectedSrc = chrome.runtime.getURL(img.dataset.pizzaAssigned);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "src" && img.src !== expectedSrc) {
          console.log("Reapplying pizza image for", img);
          img.src = expectedSrc;
        }
      });
    });
    observer.observe(img, { attributes: true });
    pizzaObservers.set(img, observer);
  }
  
  /**
   * Disconnects the MutationObserver for an image, if one exists.
   */
  function disconnectPizzaObserver(img) {
    if (pizzaObservers.has(img)) {
      const obs = pizzaObservers.get(img);
      obs.disconnect();
      pizzaObservers.delete(img);
    }
  }
  
  /**
   * Process a single image:
   * - If pizza mode is on and the image hasn’t been processed, store its original
   *   source, assign a random pizza image, and start monitoring it.
   * - If pizza mode is off and the image was processed, revert it back.
   */
  function processImage(img) {
    if (!img) return;
    
    if (pizzaEnabled) {
      // Save original src/srcset if not already saved.
      if (!img.dataset.originalSrc) {
        img.dataset.originalSrc = img.src;
        if (img.srcset) {
          img.dataset.originalSrcset = img.srcset;
        }
      }
      // Only process if not already replaced.
      if (!img.dataset.pizzaAssigned) {
        const randomImage = pizzaImages[Math.floor(Math.random() * pizzaImages.length)];
        img.dataset.pizzaAssigned = randomImage;
        const pizzaURL = chrome.runtime.getURL(randomImage);
        img.src = pizzaURL;
        img.srcset = "";
        img.loading = "eager";
        img.onerror = () => {
          console.error("Failed to load pizza image:", randomImage);
          img.src = chrome.runtime.getURL("pizza1.jpeg");
        };
        // Start monitoring to lock in the pizza image.
        monitorPizzaImage(img);
      }
    } else {
      // If pizza mode is off, revert to the original image (if stored).
      if (img.dataset.originalSrc) {
        disconnectPizzaObserver(img);
        img.src = img.dataset.originalSrc;
        if (img.dataset.originalSrcset) {
          img.srcset = img.dataset.originalSrcset;
        }
        delete img.dataset.originalSrc;
        delete img.dataset.originalSrcset;
        delete img.dataset.pizzaAssigned;
      }
    }
  }
  
  /**
   * IntersectionObserver callback:
   * Process an image when it enters (or is near) the viewport.
   * If pizza mode is on, unobserve it afterward to prevent reprocessing.
   */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        processImage(entry.target);
        if (pizzaEnabled) {
          io.unobserve(entry.target);
        }
      }
    });
  }, { rootMargin: "100px" });
  
  /**
   * Start observing all current images on the page.
   */
  function observeAllImages() {
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      io.observe(img);
    });
  }
  
  /**
   * Revert all images immediately to their original sources.
   */
  function revertAllImages() {
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      if (img.dataset.originalSrc) {
        disconnectPizzaObserver(img);
        img.src = img.dataset.originalSrc;
        if (img.dataset.originalSrcset) {
          img.srcset = img.dataset.originalSrcset;
        }
        delete img.dataset.originalSrc;
        delete img.dataset.originalSrcset;
        delete img.dataset.pizzaAssigned;
      }
    });
  }
  
  /**
   * MutationObserver to watch for new images added to the page.
   * When new images appear, have the IntersectionObserver process them.
   */
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "IMG") {
            io.observe(node);
          }
          node.querySelectorAll && node.querySelectorAll("img").forEach((img) => {
            io.observe(img);
          });
        }
      });
    });
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
  
  /**
   * Handle the toggle state:
   * - If enabling pizza mode, start observing images.
   * - If disabling, disconnect the IntersectionObserver, revert all images,
   *   then resume observing for newly added images.
   */
  function handleImageReplacement(isActive) {
    pizzaEnabled = isActive;
    if (pizzaEnabled) {
      observeAllImages();
    } else {
      io.disconnect();
      revertAllImages();
      // Resume observing new images if they are added.
      observeAllImages();
    }
  }
  
  /**
   * Listen for messages from the popup to toggle pizza mode.
   */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.hasOwnProperty("pizzaEnabled")) {
      handleImageReplacement(msg.pizzaEnabled);
    }
  });
  
  /**
   * On initial load, read the stored toggle state.
   */
  chrome.storage.sync.get("toggleState", (data) => {
    pizzaEnabled = data.toggleState || false;
    if (pizzaEnabled) {
      observeAllImages();
    } else {
      revertAllImages();
    }
  });
  