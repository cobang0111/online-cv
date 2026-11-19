(function () {
  const storageKey = "cv-language";

  function normalizeLanguage(language) {
    return language === "ko" ? "ko" : "en";
  }

  function applyLanguage(root, language) {
    const normalizedLanguage = normalizeLanguage(language);

    root.querySelectorAll("[data-i18n-en][data-i18n-ko]").forEach((element) => {
      element.textContent = normalizedLanguage === "ko"
        ? element.dataset.i18nKo
        : element.dataset.i18nEn;
    });

    root.querySelectorAll("[data-language-content]").forEach((element) => {
      element.hidden = element.dataset.languageContent !== normalizedLanguage;
    });

    return normalizedLanguage;
  }

  function getLanguage() {
    return normalizeLanguage(document.documentElement.dataset.language);
  }

  function setLanguage(language, persist) {
    const normalizedLanguage = applyLanguage(document, language);
    const button = document.getElementById("languageButton");
    const buttonLabel = button && button.querySelector("[data-language-label]");

    document.documentElement.lang = normalizedLanguage;
    document.documentElement.dataset.language = normalizedLanguage;

    if (button && buttonLabel) {
      const isKorean = normalizedLanguage === "ko";
      buttonLabel.textContent = isKorean ? "English" : "한국어";
      button.setAttribute("aria-pressed", String(isKorean));
      button.setAttribute("aria-label", isKorean ? "Switch to English" : "한국어로 전환");
    }

    if (persist !== false) {
      try {
        window.localStorage.setItem(storageKey, normalizedLanguage);
      } catch (error) {
        // The language toggle still works when storage is unavailable.
      }
    }

    return normalizedLanguage;
  }

  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  let storedLanguage = "en";

  try {
    storedLanguage = window.localStorage.getItem(storageKey) || "en";
  } catch (error) {
    // Use English when storage is unavailable.
  }

  setLanguage(requestedLanguage || storedLanguage, false);

  const languageButton = document.getElementById("languageButton");
  if (languageButton) {
    languageButton.addEventListener("click", function () {
      setLanguage(getLanguage() === "ko" ? "en" : "ko");
    });
  }

  window.cvI18n = {
    applyLanguage,
    getLanguage,
    setLanguage,
  };
})();
