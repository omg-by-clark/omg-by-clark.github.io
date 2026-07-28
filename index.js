/* index.js */
/*
    omg-by-clark.github.io: A website for sharing daily stories.
    Copyright (C) 2026  Chi (Clark) Zhang

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
*/
let currentPage = 0;
const PAGE_SIZE = 15;
let globalUserMap = {};
let isFetching = false;
let hasMore = true;
let observer;

// 新增的搜索全局变量
const keywords = [
    '#学校 School',
    '#老师 Teachers',
    '#作业 Homework',
    '#家人 Family',
    '#避雷 Avoid',
    '#奸商 Scammer',
    '#编程 Coding',
    '#上课 Class',
    '#旅游 Travel',
    '#奇葩 Weird',
    '#食物 Food',
    '#生活 Life',
    '#宠物 Pets',
    '#科技 Tech',
    '#娱乐 Fun',
    '#体育 Sport',
    '#其他 Others'
];
let currentSearchKeywords = [];
let currentSearchText = '';
let searchTimeout = null;
let currentSearchId = 0; // 用于避免搜索频率过快导致的数据请求冲突

/* pageshow
用途：处理 iOS/Safari 浏览器前进后退缓存恢复页面时的旧投票状态。
原理：Safari 会把旧 DOM 从 BFCache 里直接恢复；如果检测到这种恢复，就立刻刷新可见帖子的投票计数，严格浏览器上直接重载页面以避免继续使用冻结状态。
*/
window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (window.omgVote && window.omgVote.isStrictBrowser()) {
        window.location.reload();
        return;
    }
    refreshVisibleVotes();
});

// 首页是站点入口：如果浏览器本地没有语言记录，就明确写成中文，避免其它页面出现中英默认值不一致。
if (!localStorage.getItem('lang')) {
    localStorage.setItem('lang', 'zh');
}

/* initSearch
用途：初始化搜索模块。
说明：初始化搜索框的事件监听，包括输入检测和点击外部关闭下拉框。
原理：监听 input 事件，如果是 # 开头则展示关键词列表；否则执行防抖的文本搜索。
*/
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const keywordDropdown = document.getElementById('keywordDropdown');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const command = getSearchCommand(val);
        if (command) {
            clearTimeout(searchTimeout);
            keywordDropdown.classList.remove('visible');
            showSearchCommandPopover(command);
            return;
        }

        hideSearchCommandPopover();
        if (val.startsWith('#')) {
            const filterText = val.toLowerCase();
            const matcheds = keywords.filter(t => t.toLowerCase().includes(filterText));
            renderKeywordDropdown(matcheds);
        } else {
            keywordDropdown.classList.remove('visible');
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchText = val.trim();
                triggerSearch();
            }, 500); // 防抖：停止输入500毫秒后触发查询
        }
    });

    // 输入完整隐藏指令后按 Enter，效果与点击确认框中的“是”完全一致。
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && getSearchCommand(searchInput.value)) {
            event.preventDefault();
            executePendingSearchCommand();
        }
    });

    // 点击外部隐藏下拉框
    document.addEventListener('click', (e) => {
        if (!document.querySelector('.search-container').contains(e.target)) {
            keywordDropdown.classList.remove('visible');
            hideSearchCommandPopover();
        }
    });
}

let pendingSearchCommand = null;

/* getSearchCommand
用途：识别搜索框隐藏指令，并解析冒号后的参数。
原理：统一去掉首尾空格、小写化命令名；带参数的 /trc: 和 /dm: 会把冒号后的内容拆出来。
*/
function getSearchCommand(value) {
    const raw = String(value || '').trim();
    const lower = raw.toLowerCase();
    const renderingCommandMatch = raw.match(/^\/(?:toggle_rendering_command|trc):\s*([a-z0-9_-]+)$/i);
    const displayModeMatch = raw.match(/^\/(?:display_mode|dm):\s*([a-z0-9_-]+)$/i);

    if (lower === '/toggle_verification_mode' || lower === '/tvm') return { type: 'verification' };
    if (lower === '/toggle_text_rendering_mode' || lower === '/ttrm') return { type: 'textRendering' };
    if (lower === '/toggle_localstorage_using_mode' || lower === '/tlum') return { type: 'localStorageUsing' };
    if (renderingCommandMatch) return { type: 'renderingCommand', command: renderingCommandMatch[1].toLowerCase() };
    if (displayModeMatch) return { type: 'displayMode', mode: normalizeDisplayMode(displayModeMatch[1]) };
    if (lower === '/offline_test_mode' || lower === '/otm') return { type: 'offlineMode', offline: true };
    if (lower === '/normal_mode' || lower === '/nm') return { type: 'offlineMode', offline: false };
    return null;
}

/* normalizeDisplayMode
用途：把 /dm: 后的简写转换成 settings.html 使用的主题值。
原理：cpm、catppuccin、macchiato 都归一为 catppuccin；其它只接受 dark 和 light。
*/
function normalizeDisplayMode(mode) {
    const normalized = String(mode || '').toLowerCase();
    if (normalized === 'cpm' || normalized === 'catppuccin' || normalized === 'macchiato') return 'catppuccin';
    if (normalized === 'dark') return 'dark';
    if (normalized === 'light') return 'light';
    return '';
}

function getLocalDataModeCookie() {
    const prefix = 'omg_local_data_mode=';
    const item = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
    const value = item ? decodeURIComponent(item.slice(prefix.length)) : '';
    return value === 'all' || value === 'necessary' ? value : 'necessary';
}

function setLocalDataModeCookie(mode) {
    document.cookie = `omg_local_data_mode=${encodeURIComponent(mode)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function getCommandMessage(command) {
    const lang = localStorage.getItem('lang') || 'zh';
    const disabledCommands = typeof getDisabledRenderingCommands === 'function' ? getDisabledRenderingCommands() : [];

    if (command.type === 'verification') {
        const isFullVerification = localStorage.getItem('verificationMode100') === 'true';
        return isFullVerification
            ? (lang === 'zh'
                ? '/tvm 会把此浏览器中登录和注册的数学验证概率从 100% 恢复为默认的 5%。确定继续吗？'
                : '/tvm will restore the login and sign-up math verification chance in this browser from 100% to the default 5%. Continue?')
            : (lang === 'zh'
                ? '/tvm 会把此浏览器中登录和注册的数学验证概率从默认的 5% 提高到 100%。确定继续吗？'
                : '/tvm will raise the login and sign-up math verification chance in this browser from the default 5% to 100%. Continue?');
    }

    if (command.type === 'textRendering') {
        const nextRaw = localStorage.getItem('textRenderingMode') !== 'raw';
        return nextRaw
            ? (lang === 'zh' ? '/ttrm 会让帖子和评论显示原始文本，不解析 \\link、\\b 等渲染指令。确定继续吗？' : '/ttrm will show raw post and comment text instead of rendering commands like \\link or \\b. Continue?')
            : (lang === 'zh' ? '/ttrm 会恢复帖子和评论的渲染指令解析。确定继续吗？' : '/ttrm will restore rendering commands in posts and comments. Continue?');
    }

    if (command.type === 'localStorageUsing') {
        const nextMode = getLocalDataModeCookie() === 'all' ? 'necessary' : 'all';
        return nextMode === 'all'
            ? (lang === 'zh' ? '/tlum 会切换为允许全部本地数据访问，并刷新页面。确定继续吗？' : '/tlum will switch to allowing all local data access and reload the page. Continue?')
            : (lang === 'zh' ? '/tlum 会切换为仅访问必要本地数据，并刷新页面。确定继续吗？' : '/tlum will switch to necessary-only local data access and reload the page. Continue?');
    }

    if (command.type === 'renderingCommand') {
        const valid = ['link', 'b', 'italic', 'code', 'subt'].includes(command.command);
        if (!valid) {
            return lang === 'zh'
                ? `/trc: ${command.command} 不是可切换的渲染指令。可用：link、b、italic、code、subt。`
                : `/trc: ${command.command} is not a toggleable rendering command. Available: link, b, italic, code, subt.`;
        }
        const willDisable = !disabledCommands.includes(command.command);
        return willDisable
            ? (lang === 'zh' ? `/trc: ${command.command} 会禁用 ${command.command} 渲染指令。确定继续吗？` : `/trc: ${command.command} will disable the ${command.command} rendering command. Continue?`)
            : (lang === 'zh' ? `/trc: ${command.command} 会重新启用 ${command.command} 渲染指令。确定继续吗？` : `/trc: ${command.command} will re-enable the ${command.command} rendering command. Continue?`);
    }

    if (command.type === 'displayMode') {
        if (!command.mode) {
            return lang === 'zh'
                ? '/dm 后面的模式不认识。可用：cpm、dark、light。'
                : 'Unknown /dm mode. Available: cpm, dark, light.';
        }
        const modeName = command.mode === 'catppuccin' ? 'Catppuccin Macchiato' : command.mode;
        return lang === 'zh'
            ? `/dm 会把显示模式切换为 ${modeName}。确定继续吗？`
            : `/dm will switch the display mode to ${modeName}. Continue?`;
    }

    if (command.type === 'offlineMode') {
        return command.offline
            ? (lang === 'zh' ? '/otm 会进入离线测试模式，不连接 Supabase 数据库，并刷新页面。确定继续吗？' : '/otm will enter offline test mode without connecting to the Supabase database, then reload. Continue?')
            : (lang === 'zh' ? '/nm 会回到普通数据库连接模式，并刷新页面。确定继续吗？' : '/nm will return to normal database mode and reload. Continue?');
    }

    return '';
}

/* showSearchCommandPopover
用途：在搜索框下方显示双语确认浮层，并说明本次隐藏指令会执行什么。
原理：把解析后的命令暂存到 pendingSearchCommand；Enter 或“是”都会执行同一个对象，避免输入框变化导致误操作。
*/
function showSearchCommandPopover(command) {
    const popover = document.getElementById('verification-command-popover');
    const message = document.getElementById('verification-command-message');
    pendingSearchCommand = command;
    message.innerText = getCommandMessage(command);
    popover.hidden = false;
    popover.classList.add('visible');
}

/* hideSearchCommandPopover 用途：隐藏搜索框隐藏命令确认框。 */
function hideSearchCommandPopover() {
    const popover = document.getElementById('verification-command-popover');
    popover.classList.remove('visible');
    popover.hidden = true;
    pendingSearchCommand = null;
}

/* cancelSearchCommand
用途：处理确认框中的高亮“否”，安全退出并清除可能误输入的命令。
原理：不修改 localStorage，只清空搜索框、关闭浮层并把焦点还给搜索框。
*/
function cancelSearchCommand() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    hideSearchCommandPopover();
    searchInput.focus();
}

/* executePendingSearchCommand
用途：执行搜索框中已经确认的隐藏指令。
原理：根据命令类型写入 localStorage 或 Cookie；需要重建数据客户端的模式会刷新页面，其它模式直接刷新当前列表。
*/
function executePendingSearchCommand() {
    const command = pendingSearchCommand || getSearchCommand(document.getElementById('searchInput').value);
    if (!command) return;

    const lang = localStorage.getItem('lang') || 'zh';
    const searchInput = document.getElementById('searchInput');
    let message = '';
    let shouldReload = false;
    let shouldRefreshList = false;

    if (command.type === 'verification') {
        const enableFullVerification = localStorage.getItem('verificationMode100') !== 'true';
        if (enableFullVerification) {
            localStorage.setItem('verificationMode100', 'true');
        } else {
            localStorage.removeItem('verificationMode100');
        }
        message = enableFullVerification
            ? (lang === 'zh' ? '数学验证概率已切换为 100%。' : 'Math verification chance is now 100%.')
            : (lang === 'zh' ? '数学验证概率已恢复为 5%。' : 'Math verification chance is back to 5%.');
    }

    if (command.type === 'textRendering') {
        const enableRaw = localStorage.getItem('textRenderingMode') !== 'raw';
        if (enableRaw) {
            localStorage.setItem('textRenderingMode', 'raw');
        } else {
            localStorage.removeItem('textRenderingMode');
        }
        message = enableRaw
            ? (lang === 'zh' ? '已切换为原始文本显示。' : 'Raw text rendering is now enabled.')
            : (lang === 'zh' ? '已恢复渲染指令显示。' : 'Rendering commands are enabled again.');
        shouldRefreshList = true;
    }

    if (command.type === 'localStorageUsing') {
        const nextMode = getLocalDataModeCookie() === 'all' ? 'necessary' : 'all';
        setLocalDataModeCookie(nextMode);
        message = nextMode === 'all'
            ? (lang === 'zh' ? '已切换为允许全部本地数据访问。' : 'All local data access is now allowed.')
            : (lang === 'zh' ? '已切换为仅访问必要本地数据。' : 'Local data access is now necessary-only.');
        shouldReload = true;
    }

    if (command.type === 'renderingCommand') {
        if (!['link', 'b', 'italic', 'code', 'subt'].includes(command.command)) {
            alert(lang === 'zh' ? '未知渲染指令。可用：link、b、italic、code、subt。' : 'Unknown rendering command. Available: link, b, italic, code, subt.');
            return;
        }
        let disabledCommands = typeof getDisabledRenderingCommands === 'function' ? getDisabledRenderingCommands() : [];
        const willDisable = !disabledCommands.includes(command.command);
        disabledCommands = willDisable
            ? [...disabledCommands, command.command]
            : disabledCommands.filter(item => item !== command.command);
        localStorage.setItem('disabledRenderingCommands', JSON.stringify(disabledCommands));
        message = willDisable
            ? (lang === 'zh' ? `${command.command} 渲染指令已禁用。` : `${command.command} rendering command is disabled.`)
            : (lang === 'zh' ? `${command.command} 渲染指令已启用。` : `${command.command} rendering command is enabled.`);
        shouldRefreshList = true;
    }

    if (command.type === 'displayMode') {
        if (!command.mode) {
            alert(lang === 'zh' ? '未知显示模式。可用：cpm、dark、light。' : 'Unknown display mode. Available: cpm, dark, light.');
            return;
        }
        localStorage.setItem('theme', command.mode);
        document.documentElement.dataset.theme = command.mode;
        document.body.classList.toggle('dark', command.mode === 'dark');
        document.body.classList.toggle('catppuccin', command.mode === 'catppuccin');
        message = lang === 'zh' ? '显示模式已切换。' : 'Display mode switched.';
    }

    if (command.type === 'offlineMode') {
        if (command.offline) {
            localStorage.setItem('offlineTestMode', 'true');
            message = lang === 'zh' ? '已进入离线测试模式。' : 'Offline test mode enabled.';
        } else {
            localStorage.removeItem('offlineTestMode');
            message = lang === 'zh' ? '已回到普通数据库连接模式。' : 'Normal database mode enabled.';
        }
        shouldReload = true;
    }

    searchInput.value = '';
    currentSearchText = '';
    hideSearchCommandPopover();
    if (shouldRefreshList) triggerSearch();
    alert(message);

    if (shouldReload) {
        window.location.reload();
    }
}

/* renderKeywordDropdown
用途：渲染搜索下拉提示。
说明：渲染并显示下拉的关键词选项。
原理：接收匹配的关键词数组，生成对应的 div 列表并注入到 keywordDropdown 容器中。
*/
function renderKeywordDropdown(tags) {
    const keywordDropdown = document.getElementById('keywordDropdown');
    if (tags.length === 0) {
        keywordDropdown.classList.remove('visible');
        return;
    }
    keywordDropdown.innerHTML = tags.map(tag =>
        `<div class="tag-dropdown-item" onclick="addSearchKeyword('${tag}')">${tag}</div>`
    ).join('');
    keywordDropdown.classList.add('visible');
}

/* addSearchKeyword
用途：添加筛选标签。
说明：将用户点击的关键词加入到筛选列表，并触发重新搜索。
原理：将选中的关键词压入 currentSearchKeywords 数组，清空输入框，隐藏下拉列表并调用 triggerSearch。
*/
function addSearchKeyword(keyword) {
    if (!currentSearchKeywords.includes(keyword)) {
        currentSearchKeywords.push(keyword);
        updateSelectedKeywordsUI();
        triggerSearch();
    }
    document.getElementById('searchInput').value = '';
    document.getElementById('keywordDropdown').classList.remove('visible');
    document.getElementById('searchInput').focus();
}

/* removeSearchKeyword
用途：移除筛选标签。
说明：从已选关键词列表中移除某个关键词，并触发重新搜索。
原理：过滤掉被点击的关键词，更新 UI 并调用 triggerSearch。
*/
function removeSearchKeyword(keyword) {
    currentSearchKeywords = currentSearchKeywords.filter(t => t !== keyword);
    updateSelectedKeywordsUI();
    triggerSearch();
}

/* updateSelectedKeywordsUI
用途：更新已选标签视图。
说明：更新搜索框下方的已选关键词气泡显示。
原理：遍历 currentSearchKeywords，渲染带有删除图标的 HTML 并插入容器。
*/
function updateSelectedKeywordsUI() {
    const selectedKeywordsDiv = document.getElementById('selectedKeywords');
    selectedKeywordsDiv.innerHTML = currentSearchKeywords.map(keyword =>
        `<div class="selected-keyword-chip">${keyword} <span onclick="removeSearchKeyword('${keyword}')">×</span></div>`
    ).join('');
}

/* triggerSearch
用途：触发列表检索。
说明：重置所有分页状态并清空当前列表，以新的搜索条件重新加载帖子。
原理：将 currentPage 置 0，设 hasMore 为 true，恢复加载动画的显示状态，最后调用 loadNextPage。
*/
function triggerSearch() {
    currentPage = 0;
    hasMore = true;
    document.getElementById('list-all').innerHTML = '';
    document.getElementById('end-message').style.display = 'none';
    document.getElementById('scroll-sentinel').style.display = 'flex';
    currentSearchId++; // 让仍在进行中的旧请求失效
    isFetching = false;
    loadNextPage();
}

/* escapeHTML
用途：安全处理字符串。
说明：将用户输入的字符串转换为安全的 HTML 代码，避免网页执行恶意代码。
原理：创建一个内存中的 div 元素，将文本设为 textContent，然后读取 innerHTML，由浏览器原生完成转义。
*/
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* formatRelativeTime
用途：把数据库里的绝对时间转换成更容易理解的相对时间。
说明：传入 created_at 等时间字符串，返回“刚刚 / 1 分钟前 / 昨天 / 2 天前 / 1 个月前 / 1 年前”等文案。
原理：先计算目标时间和当前时间的毫秒差，再按分钟、小时、天、月、年逐级取整；页面语言为英文时返回对应英文文案。
注意：这个函数只用于展示时间，不影响热榜排序、库存过期判断等需要精确 Date 的业务逻辑。
*/
function formatRelativeTime(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';

    const lang = localStorage.getItem('lang') || 'zh';
    const diffMs = Date.now() - date.getTime();
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (lang === 'en') {
        if (seconds < 60) return 'just now';
        if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
        if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        if (days === 1) return 'yesterday';
        if (days < 30) return `${days} days ago`;
        if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
        return years === 1 ? '1 year ago' : `${years} years ago`;
    }

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days === 1) return '昨天';
    if (days < 30) return `${days} 天前`;
    if (months < 12) return `${months} 个月前`;
    return `${years} 年前`;
}

/* getNicknameStyle
用途：个性化用户名展示。
说明：根据数据库中用户的库存物品（inventory）返回对应的专属昵称 CSS 样式。
原理：判断 inventory 中的特定道具 ID 及过期时间，返回预设的内联 CSS 字符串（如渐变色或特定文字发光）。
*/
function getNicknameStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();
    if (inventory['100'] && new Date(inventory['100']) > now) return 'background: linear-gradient(to right, #d20f39, #fe640b, #df8e1d, #40a02b, #04a5e5, #8839ef); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    if (inventory['101'] && new Date(inventory['101']) > now) return 'color: #04a5e5; font-weight: bold;';
    if (inventory['102'] && new Date(inventory['102']) > now) return 'color: #ffa600; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); font-weight: bold;';
    return '';
}

/* updateLanguage
用途：前端国际化显示。
说明：根据本地浏览器存储（localStorage）中的语言偏好动态切换网页显示语言。
原理：遍历带有 data-zh 或 data-en 属性的 DOM 元素，根据当前选定的语言标识替换其 innerText。
*/
function updateLanguage() {
    const lang = localStorage.getItem('lang') || 'zh';
    document.querySelectorAll('[data-zh]').forEach(el => {
        el.innerText = (lang === 'zh') ? el.getAttribute('data-zh') : el.getAttribute('data-en');
    });
}

/* goRandom
用途：随机阅读功能。
说明：触发时计算并随机跳转到数据库中的某一篇吐槽帖子。
原理：先查询 posts 表获取总行数，生成随机索引，再利用 range 方法查出对应行的 ID，最后拼接 URL 跳转。
*/
async function goRandom() {
    if (isFetching) return;
    isFetching = true;
    try {
        const { count, error: countErr } = await _supabase.from('posts').select('*', { count: 'exact', head: true });
        if (countErr) throw countErr;
        let noPostsMessage = localStorage.getItem("lang") === 'zh' ? "广场还是空荡荡的..." : "The square is still empty...";
        if (count === 0) return alert(noPostsMessage);
        const fetchUntilFound = async () => {
            const randomIndex = Math.floor(Math.random() * count);
            const { data, error } = await _supabase.from('posts').select('id').range(randomIndex, randomIndex).maybeSingle();
            if (!data || error) return await fetchUntilFound();
            return data.id;
        };
        const validId = await fetchUntilFound();
        location.href = `content.html?id=${validId}`;
    } catch (error) {
        let errCode = localStorage.getItem("lang") === 'zh' ? `随机失败，原因: ${error}` : `Random failure. Reason: ${error}`;
        alert(errCode);
        console.error("[随机失败]", error);
    } finally {
        isFetching = false;
    }
}

/* handleVote
用途：点赞与点踩交互。
说明：处理用户在前端界面点击帖子的“赞”或“踩”按钮的具体逻辑。
原理：读取 localStorage 判断是否已操作，计算新的赞踩数量并更新 UI 类名，最后通过 Supabase API 更新后端。
*/
async function handleVote(event, postId, type) {
    if (window.requireLocalDataConsent && !window.requireLocalDataConsent()) return;
    event.stopPropagation();
    const card = event.currentTarget.closest('.card');
    const voteButtons = card ? card.querySelectorAll('.like-btn, .dislike-btn') : [];
    voteButtons.forEach(button => { button.disabled = true; });

    try {
        const result = await window.omgVote.applyPostVote(postId, type);
        if (result) syncVoteCards(postId, result.likes, result.dislike, result.hasLiked, result.hasDisliked);
    } catch (err) {
        console.error("同步失败", err);
    } finally {
        voteButtons.forEach(button => { button.disabled = false; });
    }
}

function syncVoteCards(postId, likes, dislike, hasLiked, hasDisliked) {
    const postIdStr = String(postId);

    document.querySelectorAll(`.card[data-post-id="${postIdStr}"]`).forEach(card => {
        const votePill = card.querySelector('.vote-pill');
        const likeSpan = card.querySelector('.like-btn .count');
        const dislikeSpan = card.querySelector('.dislike-btn .count');

        if (likeSpan) likeSpan.innerText = likes;
        if (dislikeSpan) dislikeSpan.innerText = dislike;
        if (votePill) {
            votePill.classList.toggle('is-liked', hasLiked);
            votePill.classList.toggle('is-disliked', hasDisliked);
        }
    });
}

/* refreshVisibleVotes
用途：刷新当前页面已经显示出来的投票计数。
原理：Safari/iOS 使用浏览器返回/前进时可能恢复旧 DOM；这里逐个按帖子 id 重新读取数据库最新票数和本地投票状态，避免用户继续基于旧数字刷票。
*/
async function refreshVisibleVotes() {
    const ids = [...new Set([...document.querySelectorAll('.card[data-post-id]')].map(card => card.dataset.postId).filter(Boolean))];
    await Promise.all(ids.map(async postId => {
        try {
            const result = await window.omgVote.refreshPostVote(postId);
            syncVoteCards(postId, result.likes, result.dislike, result.hasLiked, result.hasDisliked);
        } catch (error) {
            console.warn('刷新投票状态失败：', error);
        }
    }));
}

/* toggleNSFW
用途：敏感内容控制。
说明：在用户点击特定的 NSFW 关键词时，切换对应帖子的模糊显示状态。
原理：获取帖子内容容器，通过 classList 增加或移除 blur-content 和 revealed-content 类，实现 CSS 滤镜切换。
*/
function toggleNSFW(event, element) {
    event.stopPropagation();
    const card = element.closest('.card');
    const contentArea = card.querySelector('.post-body');
    const isBlurry = contentArea.classList.contains('blur-content');

    if (isBlurry) {
        contentArea.classList.remove('blur-content');
        contentArea.classList.add('revealed-content');
        element.classList.remove('nsfw-keyword');
    } else {
        contentArea.classList.add('blur-content');
        contentArea.classList.remove('revealed-content');
        element.classList.add('nsfw-keyword');
    }
}

/* createCardHTML
用途：帖子卡片组件渲染。
说明：将从数据库抓取的单条帖子 JSON 数据，转换成可在页面上直接渲染的 HTML 结构。
原理：拼接作者信息、点赞状态、关键词标签和正文的 HTML 字符串，支持基于特殊端点命令强制截断逻辑。
*/
function createCardHTML(postData, userMap) {
    const author = userMap ? userMap[postData.nickname] : null;
    const userLevel = getLevelInfo(author ? author.points : 0);
    const nickStyle = getNicknameStyle(author ? author.inventory : null);
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

    const hasNSFW = postData.keywords && postData.keywords.includes('#NSFW');

    let kwHtml = '';
    if (postData.keywords && postData.keywords.length > 0) {
        const kwItems = postData.keywords.map(kw => {
            if (kw === '#NSFW') {
                return `<span class="nsfw-keyword" onclick="toggleNSFW(event, this)">${kw}</span>`;
            }
            if (kw === '#疑似搬运 Suspected Repost' || kw === '#搬运 Reposted') {
                return `<span class="repost-keyword">${kw}</span>`;
            }
            return `<span>${kw}</span>`;
        });
        kwHtml = `<span class="kw-display">关键词 Keyword(s)：${kwItems.join('&nbsp;&nbsp;&nbsp;')}</span>`;
    }

    let pillClass = 'vote-pill';
    if (likedPosts.some(id => String(id) === String(postData.id))) pillClass += ' is-liked';
    if (dislikedPosts.some(id => String(id) === String(postData.id))) pillClass += ' is-disliked';

    const renderedPost = window.omgRender.renderPost(postData.content || '');
    let displayContent = '';

    // 全局解析正文；首页预览遇到 Markdown 标题或代码块时停在块前，避免卡片被复杂内容撑长。
    let fullParsed = renderedPost.html;
    let previewParsed = window.omgRender.renderPost(postData.content || '', {
        previewLength: 200,
        stopPreviewAtBlocks: true
    });

    // 预览可能因为字数、标题或代码块而截断，统一由 previewTruncated 判断是否显示阅读全文入口。
    if (previewParsed.previewTruncated) {
        displayContent = previewParsed.html.replace(/\n/g, '&nbsp;&nbsp;') +
            `...<span class="read-more" data-zh="点击以查看全文" data-en="Click to read more">点击以查看全文</span>`;
    } else {
        displayContent = fullParsed.replace(/\n/g, '&nbsp;&nbsp;');
    }

    let dateStr = '';
    if (postData.created_at) {
        dateStr = formatRelativeTime(postData.created_at);
    }

    return `
            <div class="card" data-post-id="${postData.id}" onclick="location.href='content.html?id=${postData.id}'">
                <div style="width: 100%;">
                    <b>${escapeHTML(postData.title)}</b>
                    ${kwHtml}
                    <p class="post-body ${hasNSFW ? 'blur-content' : ''}" style="font-size:0.9em; color: var(--body-text); margin:8px 0;">${displayContent}</p>

                    <div class="post-footer">
                        <div class="${pillClass}">
                            <button class="like-btn" onclick="handleVote(event, ${postData.id}, 'like')">
                                👍 <span class="count">${postData.likes || 0}</span>
                            </button>
                            <div class="vote-divider"></div>
                            <button class="dislike-btn" onclick="handleVote(event, ${postData.id}, 'dislike')">
                                👎 <span class="count">${postData.dislike || 0}</span>
                            </button>
                        </div>
                        <div class="post-meta">
                            👤 <span class="author-link" style="${nickStyle}; margin-left: 4px;" onclick="event.stopPropagation(); location.href='user.html?user=${encodeURIComponent(postData.nickname)}'">${escapeHTML(postData.nickname)}</span> <span class="lv-badge ${userLevel.class}">${userLevel.name}</span>${getModeratorBadgeHTML(postData.nickname)} &nbsp;|&nbsp; 📅 ${dateStr}
                        </div>
                    </div>
                </div>
            </div>`;
}

/* loadNextPage
用途：数据分页加载与搜索过滤。
说明：执行触底后的自动加载动作（实现无限下拉滚动列表的核心业务逻辑），支持多条件搜索组合。
原理：计算偏移量，构建 Supabase 查询（包含标签与文本匹配），获取数据后调用 createCardHTML 渲染并追加到列表中。
*/
async function loadNextPage() {
    if (isFetching || !hasMore) return;
    isFetching = true;
    document.getElementById('scroll-sentinel').style.display = 'flex';
    document.getElementById('scroll-sentinel').classList.add('visible');
    let fetchId = currentSearchId;

    try {
        const from = currentPage * PAGE_SIZE;
        const to = (currentPage + 1) * PAGE_SIZE - 1;

        let query = _supabase.from('posts').select('*').order('created_at', { ascending: false });

        if (currentSearchKeywords.length > 0) {
            query = query.contains('keywords', JSON.stringify(currentSearchKeywords));
        }

        if (currentSearchText) {
            query = query.or(`title.ilike.%${currentSearchText}%,content.ilike.%${currentSearchText}%`);
        }

        const { data, error } = await query.range(from, to);

        if (error) throw error;

        if (fetchId !== currentSearchId) {
            isFetching = false;
            return;
        }

        if (data.length > 0) {
            document.getElementById('list-all').insertAdjacentHTML('beforeend', data.map(postData => createCardHTML(postData, globalUserMap)).join(''));
            currentPage++;
        }
        if (data.length < PAGE_SIZE) {
            hasMore = false;
            document.getElementById('scroll-sentinel').style.display = 'none';
            document.getElementById('end-message').style.display = 'block';
        }
        updateLanguage();
    } catch (err) {
        console.error("列表加载失败", err);

        document.getElementById('scroll-sentinel').style.display = 'none';

        document.getElementById('list-all').insertAdjacentHTML('beforeend',
            `<p style="text-align:center; color:var(--brand); margin-top: 30px; font-weight: bold;">
                        搜索出错拉闸了：${err.message || '查询解析失败'}
                    </p>`
        );
    } finally {
        if (fetchId === currentSearchId) {
            isFetching = false;
        }
    }
}

/* setupIntersectionObserver
用途：无限滚动监听。
说明：设置滚动监听器，以便在用户刷到页面底端时触发下翻页。
原理：利用浏览器的 IntersectionObserver API，当底部的 sentinel 元素进入视口时调用 loadNextPage。
*/
function setupIntersectionObserver() {
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) loadNextPage();
    }, { rootMargin: '100px' });
    observer.observe(document.getElementById('scroll-sentinel'));
}

/* init
用途：页面初始化入口。
说明：作为应用的主要入口文件，当页面完成基本渲染后负责拉取底层数据。
原理：加载主题、绑定搜索、鉴权检查显示特定按钮、并一次性拉取用户和热榜数据进行首页的初始渲染加载。
*/
async function init() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
    const listHotEl = document.getElementById('list-hot');

    initSearch();

    /* 检查用户是否已登录。如果已登录，将“登录”按钮改为“退出登录”并绑定退出逻辑 */
    const authBtn = document.getElementById('btn-auth');
    const username = localStorage.getItem('username');
    if (username) {
        authBtn.setAttribute('data-zh', '🚪 退出登录');
        authBtn.setAttribute('data-en', '🚪 Sign Out');
        authBtn.href = "javascript:void(0)"; // 阻止默认的页面跳转
        authBtn.onclick = function () {
            localStorage.removeItem('username'); // 核心：清理本地的用户名凭证
            alert(localStorage.getItem('lang') === 'zh' ? '已成功退出登录！' : 'Successfully signed out!');
            window.location.reload(); // 刷新页面以恢复未登录状态
        };
    }

    try {
        const [postsRes, usersRes] = await Promise.all([
            _supabase.from('posts').select('*'),
            fetchPublicUserProfilesWithRpc()
        ]);
        if (usersRes.data) globalUserMap = usersRes.data.reduce((acc, user) => {
            acc[user.username] = user;
            return acc;
        }, {});

        /* 新增：登录后在顶部显示个性化问候语 */
        if (username) {
            const greetingEl = document.getElementById('user-greeting');
            const hour = new Date().getHours();
            let greetingText = '';

            // 根据时间范围设置不同的问候语
            if (localStorage.getItem('lang') === 'zh') {
                if (hour >= 6 && hour <= 9) greetingText = '☀️ 早上好';
                else if (hour >= 10 && hour <= 11) greetingText = '☀️ 上午好';
                else if (hour >= 12 && hour <= 13) greetingText = '⛱️ 中午好';
                else if (hour >= 14 && hour <= 17) greetingText = '🌻 下午好';
                else greetingText = '🌙 晚上好'; // 覆盖 18:00 - 05:59
            } else {
                if (hour >= 6 && hour <= 9) greetingText = '☀️ Good morning';
                else if (hour >= 10 && hour <= 11) greetingText = '☀️ Good morning';
                else if (hour >= 12 && hour <= 13) greetingText = '⛱️ Good afternoon';
                else if (hour >= 14 && hour <= 17) greetingText = '🌻 Good afternoon';
                else if (hour >= 18 && hour <= 19) greetingText = '🌇 Good evening'; // 英语多加一个傍晚的问候语
                else greetingText = '🌙 Good night'; // 覆盖 20:00 - 05:59
            }

            // 获取该用户的个性化变色样式
            const nickStyle = getNicknameStyle(globalUserMap[username] ? globalUserMap[username].inventory : null);

            // 渲染问候语和加粗的变色用户名
            greetingEl.innerHTML = `${greetingText}，<b style="${nickStyle}">${escapeHTML(username)}</b>`;
            greetingEl.style.display = 'inline-flex';
        }

        const now = Date.now();

        const weightedPosts = postsRes.data.map(post => {
            const likes = post.likes || 0;
            const dislikes = post.dislike || 0;
            let netVotes = likes - dislikes;

            if (post.keywords && post.keywords.includes('#疑似搬运 Suspected Repost')) {
                netVotes -= 5;
            } else if (post.keywords && post.keywords.includes('#搬运 Reposted')) {
                netVotes -= 2;
            }

            const postTime = new Date(post.created_at).getTime();
            const ageInHours = (now - postTime) / (1000 * 60 * 60);

            let hotScore = 0;
            if (netVotes > 0) {
                hotScore = netVotes / Math.pow((ageInHours + 225), 1.0001);
            } else if (netVotes < 0) {
                hotScore = netVotes;
            }

            return { ...post, hotScore };
        });

        const hotPosts = weightedPosts
            .sort((a, b) => b.hotScore - a.hotScore)
            .slice(0, 5);

        listHotEl.innerHTML = hotPosts.map(postData => createCardHTML(postData, globalUserMap)).join('');

        setupIntersectionObserver();
    } catch (err) {
        listHotEl.innerHTML = "<p>数据加载失败</p>";
    }
    updateLanguage(); // 这里会自动将前面设置的 data-zh 或 data-en 渲染到按钮文字上
}

init();
