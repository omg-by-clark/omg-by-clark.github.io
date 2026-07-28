const DICT = {
    "Start Game": { zh: "开始游戏", en: "Start Game" },
    "High Scores": { zh: "排行榜", en: "High Scores" },
    "Controls": { zh: "操作方法", en: "Controls" },
    "Game Over": { zh: "游戏结束", en: "Game Over" },
    "Your name:": { zh: "你的名字：", en: "Your name:" },
    "Ok": { zh: "确定", en: "Ok" },
    "New Game": { zh: "新游戏", en: "New Game" },
    "No scores available": { zh: "还没有分数", en: "No scores available" },
    "Restore": { zh: "清空", en: "Restore" },
    "Back": { zh: "返回", en: "Back" },
    "Use the arrows or WASD keys to move the blob.": { zh: "用方向键或 WASD 移动。", en: "Use the arrows or WASD keys to move the blob." },
    "Space or P will pause the game.": { zh: "按空格或 P 暂停。", en: "Space or P will pause the game." },
    "M will trigger the sound on or off.": { zh: "按 M 开关声音。", en: "M will trigger the sound on or off." },
    "Use the links or keys (underline letters) to navigate throught the screens.": { zh: "点链接或按菜单字母来切换页面。", en: "Use the links or keys (underline letters) to navigate through the screens." },
    "Ready!": { zh: "准备！", en: "Ready!" },
    "Paused!": { zh: "暂停！", en: "Paused!" },
    "Level": { zh: "关卡", en: "Level" },
    "Score": { zh: "分数", en: "Score" },
    "Lives": { zh: "生命", en: "Lives" },
    "name": { zh: "名字", en: "name" },
    "lvl": { zh: "关卡", en: "lvl" },
    "score": { zh: "分数", en: "score" }
};

export function getLang() {
    return localStorage.getItem("lang") === "en" ? "en" : "zh";
}

export function t(key) {
    return DICT[key]?.[getLang()] || key;
}

export function applyDomI18n() {
    document.documentElement.lang = getLang() === "en" ? "en" : "zh-CN";
    document.querySelectorAll("[data-zh][data-en]").forEach((element) => {
        element.textContent = element.dataset[getLang()];
    });
}
