let lang = localStorage.getItem('lang') || 'zh';
let allGames = [];
let recommendationPlayInfo = {};
let recommendationRefreshTimer = null;
let pendingDetailsValue = false;

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
    document.title = t('游戏 • omg-by-Clark', 'Games • omg-by-Clark');
    document.querySelectorAll('[data-zh][data-en]').forEach(element => {
        element.textContent = element.dataset[lang];
    });
    document.querySelectorAll('[data-placeholder-zh][data-placeholder-en]').forEach(element => {
        element.placeholder = element.dataset[`placeholder${lang === 'en' ? 'En' : 'Zh'}`];
    });
    document.querySelectorAll('[data-title-zh][data-title-en]').forEach(element => {
        element.title = element.dataset[`title${lang === 'en' ? 'En' : 'Zh'}`];
    });
    document.querySelectorAll('[data-label-zh][data-label-en]').forEach(element => {
        element.setAttribute('aria-label', element.dataset[`label${lang === 'en' ? 'En' : 'Zh'}`]);
    });
    renderUser();
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
        const cleanLine = line.replace(/\t/g, '    ');
        const trimmed = cleanLine.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const itemMatch = trimmed.match(/^-\s*([^:]+)?(?::\s*(.*))?$/);
        if (itemMatch) {
            if (currentGame) games.push(currentGame);
            currentGame = {};
            if (itemMatch[1]) currentGame[itemMatch[1].trim()] = parseYamlValue(itemMatch[2] || '');
            return;
        }

        const pairMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
        if (pairMatch && currentGame) {
            currentGame[pairMatch[1].trim()] = parseYamlValue(pairMatch[2] || '');
        }
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
        document.querySelector('.user-chip').onclick = () => {
            window.location.href = `../sign-in.html?redirect=${encodeURIComponent('games/index.html')}`;
        };
        return;
    }

    userNameEl.textContent = username;
    document.querySelector('.user-chip').onclick = () => {
        window.location.href = `../info.html?from=games&redirect=${encodeURIComponent('games/index.html')}`;
    };
    const firstChar = username.charAt(0).toUpperCase();
    userAvatarEl.textContent = firstChar;
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

function filterSupportedGames(games) {
    return games.filter(isGameSupported);
}

function getCoverText(name) {
    const chars = Array.from(name.replace(/\s/g, ''));
    return chars.slice(0, 2).join('') || '🎮';
}

function createGameRow(game) {
    const name = getGameName(game);
    const desc = getGameDesc(game);
    const path = game.path || '#';
    const icon = game.icon || game.photo || game.cover || game.image || '';
    const playHref = path === '#' ? '#' : `play.html?path=${encodeURIComponent(path)}`;
    const isDino = path.includes('chrome-dino-3d');
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = playHref;
    card.setAttribute('aria-label', t(`开始 ${name}`, `Play ${name}`));
    card.dataset.labelZh = `开始 ${name}`;
    card.dataset.labelEn = `Play ${name}`;
    card.innerHTML = `
        <div class="game-cover ${isDino ? 'dino-cover' : ''}">
            ${icon ? `<img src="${escapeHTML(icon)}" alt="${escapeHTML(name)}">` : `<span>${escapeHTML(getCoverText(name))}</span>`}
        </div>
        <div class="game-body">
            <h3 class="game-title">${escapeHTML(name)}</h3>
            <p class="game-desc">${escapeHTML(desc)}</p>
        </div>
    `;
    return card;
}

function getSectionGames(games, sectionKey) {
    return games.filter(game => {
        const categories = normalizeCategories(game);
        const tags = normalizeTags(game.tags || game.tag || game.type);
        return categories.includes(sectionKey) || tags.includes(sectionKey);
    });
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

function getWeightedRecommendations(games, playInfo = recommendationPlayInfo, sourceLimit = 3, maxItems = 8) {
    const playedEntries = getPlayedEntries(playInfo);
    const topPlayed = playedEntries.slice(0, sourceLimit);
    if (!topPlayed.length) return [];

    const playedKeys = new Set(playedEntries.map(item => item.gameKey));
    const sourceByKey = new Map(topPlayed.map(item => [item.gameKey, item]));
    const sourceCategories = new Map();

    games.forEach(game => {
        const source = sourceByKey.get(getGameKey(game));
        if (source) sourceCategories.set(source.gameKey, normalizeCategories(game));
    });

    const weighted = games
        .map(game => {
            const gameKey = getGameKey(game);
            if (playedKeys.has(gameKey)) return null;
            const categories = normalizeCategories(game);
            const weight = topPlayed.reduce((sum, source) => {
                const relatedCategories = sourceCategories.get(source.gameKey) || [];
                return relatedCategories.some(category => categories.includes(category))
                    ? sum + source.plays
                    : sum;
            }, 0);
            return weight > 0 ? { game, weight, randomRank: Math.random() / weight } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.randomRank - b.randomRank);

    const recommended = weighted.slice(0, maxItems).map(item => item.game);
    if (recommended.length >= 2) return recommended;

    const usedPaths = new Set(recommended.map(game => game.path));
    const fallback = games
        .filter(game => !usedPaths.has(game.path))
        .filter(game => !playedKeys.has(getGameKey(game)))
        .sort(() => Math.random() - 0.5);

    return [...recommended, ...fallback].slice(0, Math.min(maxItems, Math.max(2, recommended.length)));
}

function renderGameSection(container, title, games) {
    const section = document.createElement('section');
    section.className = 'game-section';
    section.innerHTML = `
        <h2 class="section-title" data-zh="${escapeHTML(title.zh)}" data-en="${escapeHTML(title.en)}">${escapeHTML(t(title.zh, title.en))}</h2>
        <div class="game-list"></div>
    `;
    const list = section.querySelector('.game-list');
    games.forEach(game => list.appendChild(createGameRow(game)));
    if (!games.length) {
        list.remove();
        section.insertAdjacentHTML('beforeend', `<p class="section-empty" data-zh="暂无游戏" data-en="No games yet">${t('暂无游戏', 'No games yet')}</p>`);
    }
    container.appendChild(section);
}

function renderGames(games) {
    const sectionsContainer = document.getElementById('game-sections');
    const emptyMessage = document.getElementById('empty-message');
    const isSearching = document.getElementById('game-search').value.trim() !== '';

    sectionsContainer.innerHTML = '';

    if (!games.length) {
        emptyMessage.classList.remove('hidden');
        return;
    }
    emptyMessage.classList.add('hidden');

    if (isSearching) {
        renderGameSection(sectionsContainer, { zh: '🔎 搜索结果', en: '🔎 Search results' }, games);
        return;
    }

    const recommendedGames = getWeightedRecommendations(games);
    if (recommendedGames.length) {
        renderGameSection(sectionsContainer, { zh: '✨ 推荐', en: '✨ Recommended' }, recommendedGames);
    }

    [
        { title: { zh: '🎈 益智', en: '🎈 Puzzle' }, key: '益智' },
        { title: { zh: '🃏 卡牌', en: '🃏 Cards' }, key: '卡牌' },
        { title: { zh: '⚽️ 体育', en: '⚽️ Sports' }, key: '体育' },
        { title: { zh: '👥多人', en: '👥 Multiplayer' }, key: '多人' },
        { title: { zh: '🕹 动作', en: '🕹 Action' }, key: '动作' }
    ].forEach(section => {
        const sectionGames = getSectionGames(games, section.key);
        renderGameSection(sectionsContainer, section.title, sectionGames);
    });
}

function filterGames() {
    const keyword = document.getElementById('game-search').value.trim().toLowerCase();
    if (isDetailsCommand(keyword)) {
        showDetailsCommandPopover();
        return;
    }
    hideDetailsCommandPopover();
    if (!keyword) {
        renderGames(allGames);
        return;
    }

    renderGames(allGames.filter(game => {
        const haystack = [
            getGameName(game),
            getGameDesc(game),
            game.path,
            normalizeCategories(game).join(' '),
            normalizeTags(game.tags || game.tag || game.type).join(' ')
        ].join(' ').toLowerCase();
        return haystack.includes(keyword);
    }));
}

function isDetailsCommand(value) {
    return value === '/showdetails' || value === '/sd';
}

function showDetailsCommandPopover() {
    const isShowingAll = localStorage.getItem('omg-games-show-details') === 'true';
    pendingDetailsValue = !isShowingAll;
    const text = document.getElementById('details-command-text');
    if (isShowingAll) {
        text.dataset.zh = '是否确定隐藏游戏的详细信息（这会让游戏窗口更清爽）';
        text.dataset.en = 'Are you sure you want to hide detailed game information? This will keep the game window cleaner.';
    } else {
        text.dataset.zh = '是否确定展示游戏的所有信息（这将会使游戏窗口过大）';
        text.dataset.en = 'Are you sure you want to show all game information? This will make the game window too large.';
    }
    text.textContent = t(text.dataset.zh, text.dataset.en);
    document.getElementById('details-command-popover').classList.remove('hidden');
}

function hideDetailsCommandPopover() {
    document.getElementById('details-command-popover').classList.add('hidden');
}

function finishDetailsCommand(confirmed) {
    const enabled = confirmed ? pendingDetailsValue : !pendingDetailsValue;
    localStorage.setItem('omg-games-show-details', enabled ? 'true' : 'false');
    const search = document.getElementById('game-search');
    search.value = '';
    hideDetailsCommandPopover();
    renderGames(allGames);
    search.focus();
}

async function refreshRecommendationStats() {
    if (!window.omgGameStats) return;
    try {
        const stats = await window.omgGameStats.getCurrentUserStats();
        recommendationPlayInfo = stats?.play_info || {};
        if (!document.getElementById('game-search').value.trim()) renderGames(allGames);
    } catch (error) {
        console.warn('Could not load game recommendations:', error);
    }
}

function scheduleRecommendationRefresh() {
    clearTimeout(recommendationRefreshTimer);
    recommendationRefreshTimer = setTimeout(refreshRecommendationStats, 700);
}

async function loadGames() {
    try {
        const response = await fetch('game-map.yaml', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const yamlText = await response.text();
        allGames = filterSupportedGames(parseGameMap(yamlText));
        renderGames(allGames);
        refreshRecommendationStats();
    } catch (error) {
        console.error(error);
        const emptyMessage = document.getElementById('empty-message');
        emptyMessage.dataset.zh = 'game-map.yaml 读取失败，请检查路径或 YAML 格式。';
        emptyMessage.dataset.en = 'Could not read game-map.yaml. Check the path or YAML format.';
        emptyMessage.textContent = t(emptyMessage.dataset.zh, emptyMessage.dataset.en);
        document.getElementById('empty-message').classList.remove('hidden');
    }
}

document.getElementById('game-search').addEventListener('input', () => {
    filterGames();
    scheduleRecommendationRefresh();
});
document.getElementById('details-command-yes').addEventListener('click', () => finishDetailsCommand(true));
document.getElementById('details-command-no').addEventListener('click', () => finishDetailsCommand(false));
document.addEventListener('keydown', event => {
    if (document.getElementById('details-command-popover').classList.contains('hidden')) return;
    if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        finishDetailsCommand(true);
    }
    if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        finishDetailsCommand(false);
    }
});
applyI18n();
loadGames();
