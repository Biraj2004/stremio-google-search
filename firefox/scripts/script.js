/***********************************************************************/
/*    Common Helper Functions
/***********************************************************************/
const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isFirefox = typeof browser !== "undefined" && typeof browser.runtime !== "undefined";
const IMAGE_PATH = "images/stremio-logo-small.png";

const getExtensionImageUrl = (path) => {
  try {
    if (typeof browser !== "undefined" && browser?.runtime?.getURL) {
      return browser.runtime.getURL(path);
    }
    if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
  } catch (e) {
    // Fallback if accessed outside extension context
  }
  return path;
};

const STREMIO_IMG = getExtensionImageUrl(IMAGE_PATH);

/* Function to get imdb code from DOM */
const getImdbCodeFromDom = (root = document) => {
  if (!root || !root.querySelectorAll) return null;
  const imdbLinks = root.querySelectorAll("a[href*='imdb.com/title/']");
  for (const a of imdbLinks) {
    const match = a.href?.match(/title\/(tt\d+)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
};

/* Function to add a long press event-listener to remove stremio icon */
const addLongPressListener = (fabStremio) => {
  let pressTimer = null;
  let isLongPress = false;

  const handleLongPress = () => {
    isLongPress = true;
    fabStremio.style.display = "none";
  };

  const start = (e) => {
    if (e.type === "mousedown" && e.button !== 0) return;
    isLongPress = false;

    pressTimer = setTimeout(() => {
      handleLongPress();
    }, 1000);
  };

  const cancel = () => {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  fabStremio.addEventListener("click", (e) => {
    if (isLongPress) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });

  fabStremio.addEventListener("mousedown", start);
  fabStremio.addEventListener("mouseup", cancel);
  fabStremio.addEventListener("mouseleave", cancel);
  fabStremio.addEventListener("touchstart", start, { passive: true });
  fabStremio.addEventListener("touchend", cancel);
  fabStremio.addEventListener("touchcancel", cancel);

  if (typeof window !== "undefined") {
    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
              fabStremio.classList.add("fab-hidden");
            } else {
              fabStremio.classList.remove("fab-hidden");
            }
            lastScrollY = currentScrollY;
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true },
    );
  }
};

/* Function to add Common Floating action button to search */
const addFabStremio = (contentType, imdbCode) => {
  if (typeof document === "undefined") return;
  if (document.getElementById("floating-btn")) {
    return;
  }

  const fabStremio = document.createElement("a");
  fabStremio.id = "floating-btn";
  fabStremio.href = `stremio:///detail/${encodeURIComponent(contentType)}/${encodeURIComponent(imdbCode)}`;
  fabStremio.title = "Watch on Stremio";
  fabStremio.setAttribute("aria-label", "Watch on Stremio");

  const img = document.createElement("img");
  img.style.width = "30px";
  img.style.height = "30px";
  img.src = STREMIO_IMG;
  img.alt = "Stremio";

  fabStremio.appendChild(img);
  document.body.appendChild(fabStremio);
  addLongPressListener(fabStremio);
};

/*****************************************************************/
/*    Search Engine: Google Specific Functions
/*****************************************************************/

// Function to work with mobile view
const addMobileStremioGoogle = (imdbCode, contentType) => {
  const stremioHref = `stremio:///detail/${encodeURIComponent(contentType)}/${encodeURIComponent(imdbCode)}`;
  try {
    const watchNowMain = document.querySelector(
      "div[role='list'][data-ved][lang]",
    );
    if (watchNowMain) {
      const mainTag = watchNowMain.querySelector("a[ping]");
      if (mainTag) {
        const img = mainTag.querySelector("img");
        if (img) img.src = STREMIO_IMG;
        mainTag.href = stremioHref;
      }
      const secTagContainer = watchNowMain.lastChild;
      const firstTag = secTagContainer?.querySelector?.("a[ping]");
      const firstTagDiv = firstTag?.parentElement;
      if (firstTagDiv) {
        const divImg = firstTagDiv.querySelector("img");
        if (divImg) divImg.src = STREMIO_IMG;

        const divAnchor = firstTagDiv.querySelector("a");
        if (divAnchor) divAnchor.href = stremioHref;

        const textSection = firstTagDiv.firstChild?.querySelector?.("div:nth-child(2)");
        if (textSection?.firstChild) {
          textSection.firstChild.textContent = "Stremio";
        }
        if (textSection?.lastChild) {
          textSection.lastChild.textContent = "Freedom to stream";
        }
        return;
      }
    }
    // Fallback to FAB if specific mobile watch-now container is not matched
    addFabStremio(contentType, imdbCode);
  } catch (error) {
    addFabStremio(contentType, imdbCode);
  }
};

// Main function for Google implementation
const addStremioButtonToGoogle = () => {
  if (typeof document === "undefined") return;

  const imdbCode = getImdbCodeFromDom();
  if (imdbCode === null) {
    return;
  }

  const seriesReviewContainer = document.querySelector(
    "div[data-attrid^='kc:/tv/tv_program:']",
  );
  const filmReviewContainer = document.querySelector(
    "div[data-attrid^='kc:/film/film:']",
  );

  let contentType = "movie";
  if (seriesReviewContainer !== null) {
    contentType = "series";
  }

  if (isMobile) {
    addMobileStremioGoogle(imdbCode, contentType);
    return;
  }

  const seriesOptions = document.querySelectorAll(
    "div[data-attrid='kc:/tv/tv_program:media_actions_wholepage']",
  );
  const movieOptions = document.querySelectorAll(
    "div[data-attrid='kc:/film/film:media_actions_wholepage']",
  );

  let watchOptions = [];
  if (seriesOptions.length !== 0) {
    watchOptions = [...seriesOptions];
  } else if (movieOptions.length !== 0) {
    watchOptions = [...movieOptions];
  }

  // Fallback to FAB if review container or search result has IMDb but no direct watchOptions row
  if (watchOptions.length === 0) {
    addFabStremio(contentType, imdbCode);
    return;
  }

  const stremioHref = `stremio:///detail/${encodeURIComponent(contentType)}/${encodeURIComponent(imdbCode)}`;

  watchOptions.forEach((watchOption) => {
    const container = watchOption.firstElementChild?.firstElementChild;
    if (!container) {
      return;
    }

    const stremioHref = `stremio:///detail/${encodeURIComponent(contentType)}/${encodeURIComponent(imdbCode)}`;
    const existingStremio = watchOption.querySelector(".stremio-cta__href");

    const isWatchlistButton = (el) => {
      const text = (el?.textContent || "").toLowerCase();
      return text.includes("already watched") || text.includes("want to watch") || text.includes("watchlist");
    };

    if (existingStremio) {
      existingStremio.href = stremioHref;
      // Remove any default watch provider that might still be present alongside Stremio
      const children = [...container.children];
      for (const child of children) {
        if (!child.querySelector(".stremio-cta__href") && !isWatchlistButton(child)) {
          child.remove();
        }
      }
      return;
    }

    const divEle = document.createElement("div");

    const anchor = document.createElement("a");
    anchor.className = "stremio-cta__href";
    anchor.href = stremioHref;

    const ctaContainer = document.createElement("div");
    ctaContainer.className = "streamio-cta__container";

    const img = document.createElement("img");
    img.style.width = "40px";
    img.style.height = "40px";
    img.src = STREMIO_IMG;
    img.alt = "Stremio";

    const titleDiv = document.createElement("div");
    titleDiv.textContent = "Stremio";

    const subTitleDiv = document.createElement("div");
    subTitleDiv.textContent = "Freedom to stream";

    ctaContainer.appendChild(img);
    ctaContainer.appendChild(titleDiv);
    ctaContainer.appendChild(subTitleDiv);
    anchor.appendChild(ctaContainer);
    divEle.appendChild(anchor);

    const firstAction = container.firstElementChild;
    if (firstAction) {
      if (!isWatchlistButton(firstAction)) {
        // Replace the default provider button (e.g. Netflix "Watch now") with Stremio
        if (typeof firstAction.replaceWith === "function") {
          firstAction.replaceWith(divEle);
        } else if (container.replaceChild) {
          container.replaceChild(divEle, firstAction);
        } else {
          container.insertBefore(divEle, firstAction);
          firstAction.remove();
        }
      } else {
        // Only watchlist buttons exist (e.g. "Already watched" & "Want to watch")
        container.insertBefore(divEle, firstAction);
      }
    } else {
      container.appendChild(divEle);
    }

    // Clean up any remaining non-watchlist default provider buttons
    const remainingChildren = [...container.children];
    for (const child of remainingChildren) {
      if (!child.querySelector(".stremio-cta__href") && !isWatchlistButton(child)) {
        child.remove();
      }
    }
  });
};

/*******************************************************/
/* Search Engine: DuckDuckGo Specific Functions
/*******************************************************/
const addStremioButtonToDuckDuckGo = () => {
  if (typeof document === "undefined") return;

  const titleSection = document.querySelector(
    'div[data-react-module-id="titles"]',
  );
  if (!titleSection) return;

  const imdbCode = getImdbCodeFromDom(titleSection) || getImdbCodeFromDom();
  if (imdbCode === null) {
    return;
  }

  const sectionText = (titleSection.innerText || titleSection.textContent || "").toLowerCase();
  const contentType =
    sectionText.includes("tv series") || sectionText.includes("television series")
      ? "series"
      : "movie";

  const stremioHref = `stremio:///detail/${encodeURIComponent(contentType)}/${encodeURIComponent(imdbCode)}`;

  try {
    const xpath = ".//span[text()='Quick links']";
    const quickLinksSpan = document.evaluate(
      xpath,
      titleSection,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;

    // Add stremio to that imdb card if available
    if (quickLinksSpan) {
      const quickLinksDiv = quickLinksSpan.parentElement?.parentElement?.lastChild;
      if (quickLinksDiv) {
        if (quickLinksDiv.querySelector("a[href^='stremio:///detail/']")) {
          return;
        }
        const linksText = (quickLinksDiv.textContent || "").toLowerCase();
        if (linksText.includes("imdb") && quickLinksDiv.childElementCount <= 7) {
          const firstChild = quickLinksDiv.firstElementChild;
          if (firstChild) {
            const stremioLinkCopy = firstChild.cloneNode(true);
            stremioLinkCopy.href = stremioHref;
            const img = stremioLinkCopy.querySelector("img");
            if (img) img.src = STREMIO_IMG;
            const span = stremioLinkCopy.querySelector("span");
            if (span) span.textContent = "Stremio";
            quickLinksDiv.insertBefore(stremioLinkCopy, firstChild);
            return;
          }
        }
      }
    }
    // Fallback to add floating action button if imdb card quick links is not available
    addFabStremio(contentType, imdbCode);
  } catch (error) {
    addFabStremio(contentType, imdbCode);
  }
};

/*******************************************************/
/* Execution & Dynamic Mutation Observer
/*******************************************************/
let debounceTimer = null;
const debounced = (fn, delay = 250) => {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
};

const init = () => {
  if (typeof window === "undefined" || !window.location) return;
  const searchEngine = window.location.hostname;

  if (searchEngine.includes("google.")) {
    addStremioButtonToGoogle();
    if (typeof MutationObserver !== "undefined" && document.body) {
      const observer = new MutationObserver(debounced(addStremioButtonToGoogle, 250));
      observer.observe(document.body, { childList: true, subtree: true });
    }
  } else if (searchEngine.includes("duckduckgo.")) {
    addStremioButtonToDuckDuckGo();
    if (typeof MutationObserver !== "undefined" && document.body) {
      const observer = new MutationObserver(debounced(addStremioButtonToDuckDuckGo, 250));
      observer.observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener(
      "animationstart",
      function (event) {
        if (event.animationName === "quickLinkAppeared") {
          addStremioButtonToDuckDuckGo();
        }
      },
      true,
    );
  }
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getImdbCodeFromDom,
    addLongPressListener,
    addFabStremio,
    addMobileStremioGoogle,
    addStremioButtonToGoogle,
    addStremioButtonToDuckDuckGo,
    init,
  };
}
