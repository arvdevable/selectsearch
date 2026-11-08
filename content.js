// content.js

(() => {
    const BUTTON_ID = "selectsearch-button";
    const MAX_TEXT_LENGTH = 150;
    const SEARCH_ENGINES = {
        google: "https://www.google.com/search?q={query}",
        ddg: "https://duckduckgo.com/?q={query}",
        bing: "https://www.bing.com/search?q={query}",
        yahoo: "https://search.yahoo.com/search?p={query}",
        yandex: "https://yandex.com/search/?text={query}"
    };
    const DEFINE_SUPPORTED_ENGINES = new Set(["google"]);

    let searchButton = null;
    let selectedText = "";

    function getNavigationTarget(text) {
        const value = text.trim();

        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return `mailto:${value}`;
        }

        try {
            const url = new URL(value);

            if (["http:", "https:", "mailto:"].includes(url.protocol)) {
                return url.href;
            }
        } catch {
            // The selection is not a complete URL.
        }

        if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#:]\S*)?$/i.test(value)) {
            return `https://${value}`;
        }

        return null;
    }

    function getSearchDetails(text, settings) {
        const engine = SEARCH_ENGINES[settings.searchEngine]
            ? settings.searchEngine
            : "google";
        const normalizedText = text.trim().replace(/\s+/g, " ");
        const isSingleWord = normalizedText.length > 0
            && !normalizedText.includes(" ");
        const shouldDefine = settings.defineSingleWords
            && isSingleWord
            && DEFINE_SUPPORTED_ENGINES.has(engine);

        return {
            engine,
            normalizedText,
            query: shouldDefine
                ? `define ${normalizedText}`
                : normalizedText,
            shouldDefine
        };
    }

    async function getSettings() {
        return browser.storage.sync.get({
            searchEngine: "google",
            defineSingleWords: false
        });
    }

    async function updateButtonText(text) {
        const normalizedText = text.trim().replace(/\s+/g, " ");

        if (getNavigationTarget(normalizedText)) {
            if (searchButton && selectedText === text) {
                searchButton.textContent = `Go to "${normalizedText}"`;
            }
            return;
        }

        const settings = await getSettings();
        const { shouldDefine } = getSearchDetails(text, settings);

        if (!searchButton || selectedText !== text) return;

        searchButton.textContent = shouldDefine
            ? `Define "${normalizedText}"`
            : `Search for "${normalizedText}"`;
    }

    function createButton() {
        const button = document.createElement("button");

        button.id = BUTTON_ID;
        button.type = "button";
        button.textContent = "Search selection";

        button.addEventListener("mousedown", (event) => {
            // Prevent the button from destroying the current selection.
            event.preventDefault();
        });

        button.addEventListener("click", async () => {
            if (!selectedText) return;

            const navigationTarget = getNavigationTarget(selectedText);

            if (navigationTarget) {
                browser.runtime.sendMessage({
                    type: "OPEN_SEARCH",
                    url: navigationTarget
                });
                hideButton();
                return;
            }

            const settings = await getSettings();
            const { engine, query } = getSearchDetails(selectedText, settings);
            const searchUrl = SEARCH_ENGINES[engine];

            if (!searchUrl.includes("{query}")) {
                console.error("SelectSearch: Search URL must contain {query}");
                return;
            }

            const url = searchUrl.replace(
                "{query}", encodeURIComponent(query)
            );

            browser.runtime.sendMessage({
                type: "OPEN_SEARCH",
                url
            });

            hideButton();
        });

        document.body.appendChild(button);

        return button;
    }

    function hideButton() {
        if (searchButton) {
            searchButton.remove();
            searchButton = null;
        }

        selectedText = "";
    }

    function showButton(selection) {
        const text = selection.toString().trim();

        if (!text || text.length > MAX_TEXT_LENGTH) {
            hideButton();
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (!rect.width && !rect.height) {
            hideButton();
            return;
        }

        selectedText = text;

        if (!searchButton) {
            searchButton = createButton();
        }

        searchButton.textContent = `Search for "${text}"`;
        updateButtonText(text).catch((error) => {
            console.error("SelectSearch: Could not update button label", error);
        });

        // Position below the selected text.
        const buttonRect = searchButton.getBoundingClientRect();

        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 8;

        // Keep the button within the viewport horizontally.
        left = Math.max(
        window.scrollX + 8,
        Math.min(
            left, window.scrollX + window.innerWidth - buttonRect.width - 8
        )
        );

        // If there's insufficient room below, put it above.
        if (
            rect.bottom + buttonRect.height + 16 > window.innerHeight
        ) {
            top = rect.top + window.scrollY - buttonRect.height - 8;
        }

        searchButton.style.left = `${left}px`;
        searchButton.style.top = `${top}px`;
    }

    document.addEventListener("mouseup", (event) => {
        // Ignore clicks on our own search button.
        if (event.target.closest(`#${BUTTON_ID}`)) {
            return;
        }

        const selection = window.getSelection();

        if (!selection || selection.isCollapsed) {
            hideButton();
            return;
        }

        showButton(selection);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            hideButton();
        }
    });

    window.addEventListener("scroll", hideButton, true);
})();
