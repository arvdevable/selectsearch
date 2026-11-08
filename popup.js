const DEFAULT_ENGINE = "google";
const engineSelect = document.querySelector("#search-engine");
const defineSingleWords = document.querySelector("#define-single-words");

browser.storage.sync.get({
    searchEngine: DEFAULT_ENGINE,
    defineSingleWords: false
}).then((settings) => {
    engineSelect.value = settings.searchEngine;
    defineSingleWords.checked = settings.defineSingleWords;
});

engineSelect.addEventListener("change", () => {
    browser.storage.sync.set({
        searchEngine: engineSelect.value
    });
});

defineSingleWords.addEventListener("change", () => {
    browser.storage.sync.set({
        defineSingleWords: defineSingleWords.checked
    });
});
