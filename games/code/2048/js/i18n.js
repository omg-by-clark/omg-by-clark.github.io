(function () {
  var lang = localStorage.getItem("lang") === "en" ? "en" : "zh";
  var messages = {
    win: {
      zh: "你赢了！",
      en: "You win!"
    },
    gameOver: {
      zh: "游戏结束！",
      en: "Game over!"
    }
  };

  window.omg2048T = function (key) {
    return messages[key] ? messages[key][lang] : key;
  };

  function applyI18n() {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";

    document.querySelectorAll("[data-zh][data-en]").forEach(function (element) {
      element.textContent = element.getAttribute("data-" + lang);
    });

    document.querySelectorAll("[data-label-zh][data-label-en]").forEach(function (element) {
      element.setAttribute("data-label", element.getAttribute("data-label-" + lang));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyI18n);
  } else {
    applyI18n();
  }
}());
