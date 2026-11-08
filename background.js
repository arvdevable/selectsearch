// background.js

browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "OPEN_SEARCH") {
        return;
    }

    try {
        const url = new URL(message.url);

        if (!["https:", "http:", "mailto:"].includes(url.protocol)) {
            throw new Error("Unsupported URL protocol");
        }

        return browser.tabs.create({
            url: url.href
        });
        
    } catch (error) {
        console.error("SelectSearch:", error);
    }
});
