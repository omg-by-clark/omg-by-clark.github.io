let lang = localStorage.getItem('lang') || 'zh';
let currentGame = null;
let allGames = [];
let currentGameStartedAt = 0;
let recommendationPlayInfo = {};

function enableTestMode() {
    sessionStorage.setItem('omg-games-test-mode', 'true');
    window.__omgGamesTestMode = true;
    console.info('OMG Games test mode is on. This play session will not be saved.');
    return 'Test mode on: this play session will not be saved.';
}

Object.defineProperty(window, 'testMode', {
    configurable: true,
    get() {
        enableTestMode();
        return enableTestMode;
    }
});

function isTestMode() {
    return window.__omgGamesTestMode || sessionStorage.getItem('omg-games-test-mode') === 'true';
}

function getGameWindow() {
    const frame = document.getElementById('game-frame');
    return frame && frame.contentWindow;
}

window.setScore = function(points) {
    enableTestMode();
    const gameWindow = getGameWindow();
    if (gameWindow && typeof gameWindow.setScore === 'function') {
        return gameWindow.setScore(points);
    }
    console.warn('setScore() is only available after Chrome Dino 3D has loaded.');
    return false;
};

window.win = function() {
    enableTestMode();
    const gameWindow = getGameWindow();
    if (gameWindow && typeof gameWindow.win === 'function') {
        return gameWindow.win();
    }
    console.warn('win() is only available after 2048 has loaded.');
    return false;
};

if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

function escapeHTML(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function t(zh, en) {
    return lang === 'en' ? en : zh;
}

function applyI18n() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    if (!currentGame) document.title = t('游戏运行中 • omg-by-Clark', 'Playing • omg-by-Clark');
    document.querySelectorAll('[data-zh][data-en]').forEach(element => {
        element.textContent = element.dataset[lang];
    });
    document.querySelectorAll('[data-title-zh][data-title-en]').forEach(element => {
        element.title = element.dataset[`title${lang === 'en' ? 'En' : 'Zh'}`];
    });
    document.querySelectorAll('[data-label-zh][data-label-en]').forEach(element => {
        element.setAttribute('aria-label', element.dataset[`label${lang === 'en' ? 'En' : 'Zh'}`]);
    });
    updateFullscreenButton();
    renderUser();
    if (currentGame) renderLoadedGame(currentGame);
}

function stripQuote(value) {
    const text = String(value || '').trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        return text.slice(1, -1);
    }
    return text;
}

function parseYamlValue(value) {
    const text = stripQuote(value);
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text.startsWith('[') && text.endsWith(']')) {
        return text.slice(1, -1).split(',').map(item => stripQuote(item.trim())).filter(Boolean);
    }
    return text;
}

function parseGameMap(yamlText) {
    const games = [];
    let currentGame = null;

    yamlText.split(/\r?\n/).forEach(line => {
        const trimmed = line.replace(/\t/g, '    ').trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const itemMatch = trimmed.match(/^-\s*([^:]+)?(?::\s*(.*))?$/);
        if (itemMatch) {
            if (currentGame) games.push(currentGame);
            currentGame = {};
            if (itemMatch[1]) currentGame[itemMatch[1].trim()] = parseYamlValue(itemMatch[2] || '');
            return;
        }

        const pairMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
        if (pairMatch && currentGame) currentGame[pairMatch[1].trim()] = parseYamlValue(pairMatch[2] || '');
    });

    if (currentGame) games.push(currentGame);
    return games.filter(game => Object.keys(game).length > 0);
}

function getSafeFileName(username) {
    return btoa(encodeURIComponent(username)).replace(/=/g, "");
}

function getAvatarUrl(username) {
    const safeName = getSafeFileName(username);
    const { data } = _supabase.storage.from('avatars').getPublicUrl(`${safeName}.webp`);
    return data.publicUrl + "?t=" + Date.now();
}

function renderUser() {
    const username = localStorage.getItem('username');
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    if (!username) {
        userNameEl.textContent = t('未登录', 'Not signed in');
        userNameEl.dataset.zh = '未登录';
        userNameEl.dataset.en = 'Not signed in';
        userAvatarEl.textContent = '?';
        const currentPath = `games/play.html${window.location.search}`;
        document.querySelector('.user-chip').onclick = () => {
            window.location.href = `../sign-in.html?redirect=${encodeURIComponent(currentPath)}`;
        };
        return;
    }

    userNameEl.textContent = username;
    document.querySelector('.user-chip').onclick = () => {
        const currentPath = `games/play.html${window.location.search}`;
        window.location.href = `../info.html?from=games&redirect=${encodeURIComponent(currentPath)}`;
    };
    userAvatarEl.textContent = username.charAt(0).toUpperCase();
    const img = new Image();
    img.alt = t(`${username} 的头像`, `${username}'s avatar`);
    img.src = getAvatarUrl(username);
    img.onload = () => {
        userAvatarEl.innerHTML = '';
        userAvatarEl.appendChild(img);
    };
}

function getGameName(game) {
    return lang === 'en'
        ? (game['name-en'] || game.name_en || game.name || game['name-zh'] || game.name_zh || 'Untitled Game')
        : (game['name-zh'] || game.name_zh || game.name || game['name-en'] || game.name_en || '未命名游戏');
}

function getGameDesc(game) {
    return lang === 'en'
        ? (game['desc-en'] || game.desc_en || game.desc || game['desc-zh'] || game.desc_zh || 'No description yet.')
        : (game['desc-zh'] || game.desc_zh || game.desc || game['desc-en'] || game.desc_en || '这个游戏还没有介绍。');
}

function getGameControls(game) {
    return lang === 'en'
        ? (game['controls-en'] || game.controls_en || game.controls || game['controls-zh'] || game.controls_zh || 'No controls yet.')
        : (game['controls-zh'] || game.controls_zh || game.controls || game['controls-en'] || game.controls_en || '这个游戏还没有操作方法。');
}

function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags;
    if (!tags) return [];
    return String(tags).split(/[，,]/).map(tag => tag.trim()).filter(Boolean);
}

function normalizeCategories(game) {
    const raw = game.categories || game.category || game.kind || '';
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    return String(raw).split(/[，,]/).map(category => category.trim()).filter(Boolean);
}

function isDesktopPlatform() {
    const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
    return platform.includes('win') || platform.includes('mac') || platform.includes('linux');
}

function isGameSupported(game) {
    return !(game['desktop-only'] === true || game['desktop-only'] === 'true') || isDesktopPlatform();
}

function getCoverText(name) {
    const chars = Array.from(name.replace(/\s/g, ''));
    return chars.slice(0, 2).join('') || '🎮';
}

function isSafeGamePath(path) {
    return /^code\/[A-Za-z0-9._/-]+\.html$/.test(path || '') && !path.includes('..');
}

function focusGameFrame() {
    const frame = document.getElementById('game-frame');
    requestAnimationFrame(() => {
        frame.focus();
        try {
            frame.contentWindow.focus();
        } catch (error) {
            // Cross-origin games may reject this; same-site games will accept it.
        }
    });
}

function isPlayerFullscreen() {
    const playerCard = document.getElementById('player-card');
    return document.fullscreenElement === playerCard || playerCard.classList.contains('is-pseudo-fullscreen');
}

function updateFullscreenButton() {
    const button = document.getElementById('fullscreen-toggle');
    if (!button) return;
    const fullscreen = isPlayerFullscreen();
    button.dataset.zh = fullscreen ? '📱 窗口' : '🖥 全屏';
    button.dataset.en = fullscreen ? '📱 Window' : '🖥 Fullscreen';
    button.textContent = t(button.dataset.zh, button.dataset.en);
}

async function togglePlayerFullscreen() {
    const playerCard = document.getElementById('player-card');
    const fallbackFullscreen = playerCard.classList.contains('is-pseudo-fullscreen');
    if (document.fullscreenElement === playerCard || fallbackFullscreen) {
        if (document.fullscreenElement === playerCard) {
            await document.exitFullscreen();
        }
        playerCard.classList.remove('is-pseudo-fullscreen');
        document.body.style.overflow = '';
    } else {
        try {
            await playerCard.requestFullscreen();
        } catch (error) {
            playerCard.classList.add('is-pseudo-fullscreen');
            document.body.style.overflow = 'hidden';
        }
    }
    updateFullscreenButton();
    resizeGameFrameContent();
    focusGameFrame();
}

function handleFullscreenShortcut(event) {
    if (!event.ctrlKey || event.key !== 'Enter') return;
    event.preventDefault();
    togglePlayerFullscreen();
}

function setupFrameKeyboardShortcuts() {
    const frame = document.getElementById('game-frame');
    try {
        frame.contentWindow.removeEventListener('keydown', handleFullscreenShortcut);
        frame.contentWindow.addEventListener('keydown', handleFullscreenShortcut);
    } catch (error) {
        // Same-site games can receive this shortcut; external frames may not.
    }
}

function resizeGameFrameContent() {
    const gameWindow = getGameWindow();
    if (!gameWindow) return;
    const notify = () => {
        try {
            gameWindow.dispatchEvent(new Event('resize'));
            if (typeof gameWindow.fitEmbedded2048 === 'function') gameWindow.fitEmbedded2048();
        } catch (error) {
            // Same-site games can be resized directly; external frames may reject it.
        }
    };
    requestAnimationFrame(notify);
    setTimeout(notify, 120);
}

function createDetailRow(labelZh, labelEn, value) {
    return value
        ? `<div class="detail-row"><strong data-zh="${labelZh}" data-en="${labelEn}">${t(labelZh, labelEn)}</strong><span>${escapeHTML(value)}</span></div>`
        : '';
}

function wantsFullDetails() {
    return localStorage.getItem('omg-games-show-details') === 'true';
}

function getGameKey(game) {
    return window.omgGameStats?.normalizeGameKey
        ? window.omgGameStats.normalizeGameKey(game)
        : String(game.path || game.name || '');
}

function getPlayedEntries(playInfo = recommendationPlayInfo) {
    return Object.entries(playInfo || {})
        .map(([gameKey, stats]) => ({
            gameKey,
            plays: Number(stats?.plays) || 0
        }))
        .filter(item => item.plays > 0)
        .sort((a, b) => b.plays - a.plays);
}

function getRelatedRecommendations(game, playInfo = recommendationPlayInfo) {
    const currentCategories = normalizeCategories(game);
    const playedEntries = getPlayedEntries(playInfo);
    const topPlayed = playedEntries.slice(0, 3);
    const playedKeys = new Set(playedEntries.map(item => item.gameKey));
    const sourceByKey = new Map(topPlayed.map(item => [item.gameKey, item]));
    const sourceCategories = new Map();

    allGames.forEach(item => {
        const source = sourceByKey.get(getGameKey(item));
        if (source) sourceCategories.set(source.gameKey, normalizeCategories(item));
    });

    return allGames
        .map(item => {
            if (item.path === game.path) return null;
            const gameKey = getGameKey(item);
            if (playedKeys.has(gameKey)) return null;
            const categories = normalizeCategories(item);
            const currentWeight = currentCategories.some(category => categories.includes(category)) ? 1 : 0;
            const historyWeight = topPlayed.reduce((sum, source) => {
                const relatedCategories = sourceCategories.get(source.gameKey) || [];
                return relatedCategories.some(category => categories.includes(category))
                    ? sum + source.plays
                    : sum;
            }, 0);
            const weight = currentWeight + historyWeight;
            return weight > 0 ? { item, weight, randomRank: Math.random() / weight } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.randomRank - b.randomRank)
        .map(entry => entry.item)
        .concat(
            allGames
                .filter(item => item.path !== game.path)
                .filter(item => !playedKeys.has(getGameKey(item)))
                .sort(() => Math.random() - 0.5)
        )
        .filter((item, index, list) => list.findIndex(other => other.path === item.path) === index)
        .slice(0, 6);
}

function renderNextGames(game) {
    const nextList = document.getElementById('next-list');
    const nextEmpty = document.getElementById('next-empty');
    const related = getRelatedRecommendations(game);

    nextList.innerHTML = '';
    if (!related.length) {
        nextEmpty.classList.remove('hidden');
        return;
    }

    nextEmpty.classList.add('hidden');
    related.forEach(item => {
        const name = getGameName(item);
        const icon = item.icon || item.photo || item.cover || item.image || '';
        const href = `play.html?path=${encodeURIComponent(item.path)}`;
        const link = document.createElement('a');
        link.className = `next-game ${item.path.includes('chrome-dino-3d') ? 'dino-next' : ''}`;
        link.href = href;
        link.setAttribute('aria-label', t(`开始 ${name}`, `Play ${name}`));
        link.title = name;
        link.innerHTML = `
            ${icon ? `<img src="${escapeHTML(icon)}" alt="${escapeHTML(name)}">` : `<div class="next-fallback">${escapeHTML(getCoverText(name))}</div>`}
            <div>
                <p class="next-name">${escapeHTML(name)}</p>
                <p class="next-desc">${escapeHTML(getGameDesc(item))}</p>
            </div>
        `;
        nextList.appendChild(link);
    });
}

function renderLoadedGame(game) {
    const name = getGameName(game);
    const icon = game.icon || game.photo || game.cover || game.image || 'logo.svg';
    const categories = normalizeCategories(game);
    document.title = `${name} • omg-by-Clark Games`;
    document.getElementById('top-game-title').textContent = name;
    document.getElementById('game-name').textContent = name;
    document.getElementById('game-icon').src = icon;
    document.getElementById('game-icon').alt = name;
    document.getElementById('game-icon').classList.toggle('dino-icon', game.path.includes('chrome-dino-3d'));
    document.getElementById('player-card').classList.toggle('compact-frame', game['compact-frame'] === 'true' || game['compact-frame'] === true);
    document.getElementById('game-meta').textContent = categories[0] || '';
    document.getElementById('game-desc').textContent = getGameDesc(game);
    document.getElementById('game-controls').textContent = getGameControls(game);
    const infoCard = document.querySelector('.info-card');
    const moreDetails = document.getElementById('more-details');
    const showAllDetails = wantsFullDetails();
    infoCard.classList.toggle('details-expanded', showAllDetails);
    moreDetails.open = showAllDetails;
    document.getElementById('detail-list').innerHTML = [
        createDetailRow('分类', 'Category', categories.join(' / ')),
        createDetailRow('作者', 'Author', game.author || ''),
        createDetailRow('许可证', 'License', game.license || '')
    ].filter(Boolean).join('');

    const sourceLink = document.getElementById('source-link');
    if (game.source) {
        sourceLink.href = game.source;
        sourceLink.classList.remove('hidden');
    } else {
        sourceLink.classList.add('hidden');
    }
    renderNextGames(game);
}

async function refreshPlayRecommendationStats(game = currentGame) {
    if (!game || !window.omgGameStats) return;
    try {
        const stats = await window.omgGameStats.getCurrentUserStats();
        recommendationPlayInfo = stats?.play_info || {};
        renderNextGames(game);
    } catch (error) {
        console.warn('Could not load play recommendations:', error);
    }
}

function getCurrentDurationSeconds() {
    return currentGameStartedAt ? (Date.now() - currentGameStartedAt) / 1000 : 0;
}

async function saveGameStats(event = {}) {
    if (isTestMode()) return;
    if (!currentGame || !window.omgGameStats) return;
    try {
        await window.omgGameStats.update(currentGame, {
            ...event,
            durationSeconds: event.durationSeconds ?? getCurrentDurationSeconds()
        });
    } catch (error) {
        console.warn('Could not save game stats:', error);
    }
}

window.addEventListener('message', (event) => {
    if (event.source !== document.getElementById('game-frame').contentWindow) return;
    const data = event.data || {};
    if (data.type !== 'omg-game-event') return;

    if (data.event === 'start') {
        currentGameStartedAt = Date.now();
        saveGameStats({ countPlay: false, durationSeconds: 0 });
    }

    if (data.event === 'finish') {
        saveGameStats({
            score: data.score,
            won: data.won,
            countPlay: true
        });
        currentGameStartedAt = Date.now();
    }
});

document.getElementById('fullscreen-toggle').addEventListener('click', togglePlayerFullscreen);
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) document.getElementById('player-card').classList.remove('is-pseudo-fullscreen');
    if (!document.fullscreenElement) document.body.style.overflow = '';
    updateFullscreenButton();
    resizeGameFrameContent();
    focusGameFrame();
});
window.addEventListener('keydown', handleFullscreenShortcut);

async function loadGame() {
    const params = new URLSearchParams(location.search);
    const requestedPath = params.get('path') || '';
    const messageEl = document.getElementById('message');

    if (!isSafeGamePath(requestedPath)) {
        messageEl.dataset.zh = '游戏路径无效。';
        messageEl.dataset.en = 'Invalid game path.';
        messageEl.textContent = t(messageEl.dataset.zh, messageEl.dataset.en);
        return;
    }

    try {
        const response = await fetch('game-map.yaml', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        allGames = parseGameMap(await response.text());
        const game = allGames.find(item => item.path === requestedPath);
        if (!game) {
            messageEl.dataset.zh = 'game-map.yaml 中没有找到这个游戏。';
            messageEl.dataset.en = 'This game is not in game-map.yaml.';
            messageEl.textContent = t(messageEl.dataset.zh, messageEl.dataset.en);
            return;
        }

        currentGame = game;
        if (!isGameSupported(game)) {
            messageEl.dataset.zh = '这个游戏仅支持 Windows、Mac 或 Linux 电脑。';
            messageEl.dataset.en = 'This game only supports Windows, Mac, or Linux computers.';
            messageEl.textContent = t(messageEl.dataset.zh, messageEl.dataset.en);
            return;
        }
        currentGameStartedAt = Date.now();
        renderLoadedGame(game);
        refreshPlayRecommendationStats(game);
        const gameFrame = document.getElementById('game-frame');
        gameFrame.onload = () => {
            focusGameFrame();
            setupFrameKeyboardShortcuts();
        };
        gameFrame.src = requestedPath;
        document.getElementById('play-layout').classList.remove('hidden');
        messageEl.classList.add('hidden');
        focusGameFrame();
    } catch (error) {
        console.error(error);
        messageEl.dataset.zh = '读取游戏失败，请检查 game-map.yaml。';
        messageEl.dataset.en = 'Could not load this game. Check game-map.yaml.';
        messageEl.textContent = t(messageEl.dataset.zh, messageEl.dataset.en);
    }
}

applyI18n();
loadGame();
