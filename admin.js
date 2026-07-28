const SUSPECTED_REPOST_TAG = '#疑似搬运 Suspected Repost';

const TRANS = {
    confirm: { zh: '确认', en: 'Confirm' },
    cancel: { zh: '取消', en: 'Cancel' },
    loadingPosts: { zh: '帖子加载中...', en: 'Loading posts...' },
    loadingUsers: { zh: '用户加载中...', en: 'Loading users...' },
    noPosts: { zh: '还没有帖子。', en: 'No posts yet.' },
    noUsers: { zh: '还没有用户。', en: 'No users yet.' },
    postAuthor: { zh: '作者', en: 'Author' },
    postCreated: { zh: '发布时间', en: 'Created' },
    postStats: { zh: '互动数据', en: 'Stats' },
    postTags: { zh: '标签', en: 'Tags' },
    noTags: { zh: '暂无标签', en: 'No tags yet' },
    userPoints: { zh: '积分', en: 'Points' },
    userLevel: { zh: '等级', en: 'Level' },
    userStatus: { zh: '状态', en: 'Status' },
    userBanInfo: { zh: '封禁信息', en: 'Ban Info' },
    normalStatus: { zh: '正常', en: 'Normal' },
    activeBan: { zh: '封禁中', en: 'Banned' },
    expiredBan: { zh: '封禁已过期', en: 'Ban expired' },
    permanentBan: { zh: '永久封禁', en: 'Permanent ban' },
    noBanRecord: { zh: '暂无封禁记录', en: 'No ban record' },
    utcLabel: { zh: 'UTC', en: 'UTC' },
    deletePost: { zh: '🗑️ 删除帖子', en: '🗑️ Delete Post' },
    flagPost: { zh: '🏷️ 设为搬运', en: '🏷️ Flag as Repost' },
    flaggedPost: { zh: '✅ 已标记搬运', en: '✅ Already Flagged' },
    deleteUser: { zh: '🧨 删除用户', en: '🧨 Delete User' },
    banUser: { zh: '🔒 封禁用户', en: '🔒 Ban User' },
    deductPoints: { zh: '💸 扣除积分', en: '💸 Deduct Points' },
    renameUser: { zh: '✏️ 修改名称', en: '✏️ Rename User' },
    deletePostTitle: { zh: '🗑️ 删除这篇帖子？', en: '🗑️ Delete this post?' },
    deletePostDesc: { zh: '这会删除帖子本体，并尝试一起清理该帖评论和附带图片。', en: 'This deletes the post itself and also tries to remove its comments and attached image.' },
    deleteUserTitle: { zh: '🧨 删除这个用户？', en: '🧨 Delete this user?' },
    deleteUserDesc: { zh: '这会删除 users 表里的用户记录，不会自动清理历史帖子和评论。', en: 'This deletes the user row from the users table and does not automatically purge old posts or comments.' },
    banTitle: { zh: '🔒 封禁用户', en: '🔒 Ban User' },
    banDesc: { zh: '封禁信息会写入 ban_info，并使用 UTC 时间。', en: 'The ban info will be written to ban_info and uses UTC timestamps.' },
    deductTitle: { zh: '💸 扣除积分', en: '💸 Deduct Points' },
    deductDesc: { zh: '输入要扣除的积分数，最低扣到 0。', en: 'Enter how many points to deduct. The value bottoms out at 0.' },
    renameTitle: { zh: '✏️ 修改用户名', en: '✏️ Rename Username' },
    renameDesc: { zh: '会同步更新这名用户已发布的帖子和评论作者名。', en: 'This also updates the author name on this user’s posts and comments.' },
    permanentBanLabel: { zh: '永久封禁', en: 'Permanent ban' },
    permanentBanHint: { zh: '打开后不再输入持续时间。', en: 'When enabled, the duration fields disappear.' },
    durationLabel: { zh: '封禁时长', en: 'Ban duration' },
    durationPlaceholder: { zh: '输入数字', en: 'Enter a number' },
    hours: { zh: '小时', en: 'Hours' },
    days: { zh: '天', en: 'Days' },
    utcHint: { zh: '封禁起始时间会按当前 UTC 时间写入数据库。', en: 'The ban start time is written to the database using the current UTC time.' },
    confirmBan: { zh: '确认封禁', en: 'Apply Ban' },
    pointsLabel: { zh: '扣除积分', en: 'Points to deduct' },
    confirmDeduct: { zh: '确认扣分', en: 'Deduct Points' },
    renameLabel: { zh: '新用户名', en: 'New username' },
    confirmRename: { zh: '确认改名', en: 'Rename User' },
    adminRequired: { zh: '当前会话不是管理员身份。', en: 'This session is not in admin mode.' },
    postsLoaded: { zh: '帖子列表已刷新。', en: 'Post list refreshed.' },
    usersLoaded: { zh: '用户列表已刷新。', en: 'User list refreshed.' },
    dashboardLoaded: { zh: '管理员数据已刷新。', en: 'Admin data refreshed.' },
    postDeleted: { zh: '帖子已删除。', en: 'Post deleted.' },
    postFlagged: { zh: '已追加疑似搬运标签。', en: 'The suspected repost tag was added.' },
    userDeleted: { zh: '用户已删除。', en: 'User deleted.' },
    userBanned: { zh: '封禁信息已更新。', en: 'Ban info updated.' },
    pointsDeducted: { zh: '积分已扣除。', en: 'Points deducted.' },
    userRenamed: { zh: '用户名已更新。', en: 'Username updated.' },
    renamePartialWarning: { zh: '用户名已修改，但帖子或评论作者名同步时有部分失败。', en: 'The username changed, but syncing the author name to posts or comments partly failed.' },
    operationFailed: { zh: '操作失败，请稍后重试。', en: 'The operation failed. Please try again later.' },
    invalidDuration: { zh: '请输入大于 0 的封禁时长。', en: 'Enter a ban duration greater than 0.' },
    invalidPoints: { zh: '请输入大于 0 的整数积分。', en: 'Enter a positive whole number of points.' },
    invalidName: { zh: '请输入新的用户名。', en: 'Enter a new username.' },
    unchangedName: { zh: '新用户名和旧用户名相同。', en: 'The new username matches the current one.' },
    duplicatedName: { zh: '这个用户名已经被占用了。', en: 'That username is already taken.' },
    unexpectedError: { zh: '出现了一个意外错误。', en: 'An unexpected error occurred.' },
    lastKnownBan: { zh: '最近一次封禁', en: 'Latest ban' }
};

const state = {
    posts: [],
    users: [],
    modalConfig: null
};

function getLang() {
    return localStorage.getItem('lang') || 'zh';
}

function t(key) {
    const entry = TRANS[key];
    return entry ? entry[getLang()] : key;
}

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function formatUtc(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return escapeHTML(String(isoString));
    return `${date.toISOString().replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC')}`;
}

function formatPostPreview(content) {
    const text = String(content || '').replace(/\s+/g, ' ').trim();
    if (!text) return getLang() === 'zh' ? '这篇帖子没有正文。' : 'This post has no body content.';
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function applyStaticI18n() {
    document.querySelectorAll('[data-zh]').forEach(el => {
        el.innerText = getLang() === 'zh' ? el.getAttribute('data-zh') : el.getAttribute('data-en');
    });
    document.querySelectorAll('[data-zh-ph]').forEach(el => {
        el.placeholder = getLang() === 'zh' ? el.getAttribute('data-zh-ph') : el.getAttribute('data-en-ph');
    });
}

function showToast(message, tone = 'success') {
    const region = document.getElementById('toast-region');
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
    }, 2600);
    setTimeout(() => toast.remove(), 3000);
}

function ensureAdminAccess() {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    document.getElementById('summary-admin').textContent = localStorage.getItem('username') || '-';

    if (!isAdmin) {
        document.getElementById('access-guard').hidden = false;
        document.getElementById('admin-main').hidden = true;
        return false;
    }

    document.getElementById('access-guard').hidden = true;
    document.getElementById('admin-main').hidden = false;
    return true;
}

function getPostById(postId) {
    return state.posts.find(post => String(post.id) === String(postId)) || null;
}

function getUserById(userId) {
    return state.users.find(user => String(user.id) === String(userId)) || null;
}

function parseBanInfo(rawBanInfo) {
    if (!rawBanInfo || typeof rawBanInfo !== 'object') {
        return { active: false, permanent: false, bannedAtUtc: '', expiresAtUtc: '', durationHours: null };
    }

    const bannedAtUtc = rawBanInfo.banned_at_utc || rawBanInfo.banned_at || rawBanInfo.started_at_utc || '';
    const permanent = Boolean(rawBanInfo.permanent);
    const durationHours = rawBanInfo.duration_hours == null ? null : Number(rawBanInfo.duration_hours);
    const computedExpiry = (!permanent && bannedAtUtc && Number.isFinite(durationHours))
        ? new Date(new Date(bannedAtUtc).getTime() + durationHours * 60 * 60 * 1000).toISOString()
        : '';
    const expiresAtUtc = rawBanInfo.expires_at_utc || computedExpiry || '';

    let active = false;
    if (permanent && bannedAtUtc) {
        active = true;
    } else if (expiresAtUtc) {
        const expiresMs = new Date(expiresAtUtc).getTime();
        active = Number.isFinite(expiresMs) && expiresMs > Date.now();
    }

    return { active, permanent, bannedAtUtc, expiresAtUtc, durationHours };
}

function renderPostTags(keywords) {
    if (!Array.isArray(keywords) || keywords.length === 0) {
        return `<span class="soft-note">${escapeHTML(t('noTags'))}</span>`;
    }
    return keywords.map(keyword => {
        const cls = keyword === SUSPECTED_REPOST_TAG ? 'tag-chip repost' : 'tag-chip';
        return `<span class="${cls}">${escapeHTML(keyword)}</span>`;
    }).join('');
}

function renderPostCard(post) {
    const authorName = escapeHTML(post.nickname || '-');
    const title = escapeHTML(post.title || '(Untitled)');
    const preview = escapeHTML(formatPostPreview(post.content));
    const keywords = Array.isArray(post.keywords) ? post.keywords : [];
    const isFlagged = keywords.includes(SUSPECTED_REPOST_TAG);
    const postId = escapeHTML(String(post.id));
    const moderatorBadge = typeof getModeratorBadgeHTML === 'function' ? getModeratorBadgeHTML(post.nickname) : '';

    return `
        <article class="admin-card">
            <div class="card-main">
                <div class="card-title-row">
                    <h3 class="card-title">${title}</h3>
                    ${isFlagged ? `<span class="status-chip active-ban">${escapeHTML(t('flaggedPost'))}</span>` : ''}
                </div>
                <p class="card-subtitle">${preview}</p>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('postAuthor'))}</span>
                        <span class="meta-value">${authorName}${moderatorBadge}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('postCreated'))}</span>
                        <span class="meta-value">${escapeHTML(formatUtc(post.created_at))}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('postStats'))}</span>
                        <span class="meta-value">👍 ${Number(post.likes || 0)} / 👎 ${Number(post.dislike || 0)} / 👀 ${Number(post.reads || 0)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('postTags'))}</span>
                        <div class="tag-list">${renderPostTags(keywords)}</div>
                    </div>
                </div>
                <div class="card-meta">ID: ${postId}</div>
            </div>
            <div class="card-actions">
                <button class="btn-danger" type="button" data-action="delete-post" data-post-id="${postId}">${escapeHTML(t('deletePost'))}</button>
                <button class="btn-warning" type="button" data-action="flag-post" data-post-id="${postId}" ${isFlagged ? 'disabled' : ''}>${escapeHTML(isFlagged ? t('flaggedPost') : t('flagPost'))}</button>
            </div>
        </article>
    `;
}

function renderUserStatus(user) {
    const parsed = parseBanInfo(user.ban_info);
    if (!parsed.bannedAtUtc) {
        return `<span class="status-chip idle-status">${escapeHTML(t('normalStatus'))}</span>`;
    }
    if (parsed.active && parsed.permanent) {
        return `<span class="status-chip active-ban">${escapeHTML(t('permanentBan'))}</span>`;
    }
    if (parsed.active) {
        return `<span class="status-chip active-ban">${escapeHTML(t('activeBan'))}</span>`;
    }
    return `<span class="status-chip expired-ban">${escapeHTML(t('expiredBan'))}</span>`;
}

function renderUserBanMeta(user) {
    const parsed = parseBanInfo(user.ban_info);
    if (!parsed.bannedAtUtc) return escapeHTML(t('noBanRecord'));
    if (parsed.permanent) {
        return `${escapeHTML(t('lastKnownBan'))}: ${escapeHTML(formatUtc(parsed.bannedAtUtc))} · ${escapeHTML(t('permanentBan'))}`;
    }
    if (parsed.expiresAtUtc) {
        return `${escapeHTML(t('lastKnownBan'))}: ${escapeHTML(formatUtc(parsed.bannedAtUtc))} → ${escapeHTML(formatUtc(parsed.expiresAtUtc))}`;
    }
    return `${escapeHTML(t('lastKnownBan'))}: ${escapeHTML(formatUtc(parsed.bannedAtUtc))}`;
}

function renderUserCard(user) {
    const userId = escapeHTML(String(user.id));
    const username = escapeHTML(user.username || '-');
    const points = Number(user.points || 0);
    const level = typeof getLevelInfo === 'function' ? getLevelInfo(points) : { name: '-', class: '' };
    const moderatorBadge = typeof getModeratorBadgeHTML === 'function' ? getModeratorBadgeHTML(user.username) : '';

    return `
        <article class="admin-card">
            <div class="card-main">
                <div class="card-title-row">
                    <h3 class="card-title">${username}${moderatorBadge}</h3>
                    ${renderUserStatus(user)}
                </div>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('userPoints'))}</span>
                        <span class="meta-value">${points}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('userLevel'))}</span>
                        <span class="meta-value"><span class="lv-badge ${escapeHTML(level.class)}">${escapeHTML(level.name)}</span></span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('userStatus'))}</span>
                        <div class="status-list">${renderUserStatus(user)}</div>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${escapeHTML(t('userBanInfo'))}</span>
                        <span class="meta-value">${renderUserBanMeta(user)}</span>
                    </div>
                </div>
                <div class="card-meta">ID: ${userId}</div>
            </div>
            <div class="card-actions">
                <button class="btn-danger" type="button" data-action="delete-user" data-user-id="${userId}">${escapeHTML(t('deleteUser'))}</button>
                <button class="btn-warning" type="button" data-action="ban-user" data-user-id="${userId}">${escapeHTML(t('banUser'))}</button>
                <button class="btn-soft" type="button" data-action="deduct-points" data-user-id="${userId}">${escapeHTML(t('deductPoints'))}</button>
                <button class="btn-common" type="button" data-action="rename-user" data-user-id="${userId}">${escapeHTML(t('renameUser'))}</button>
            </div>
        </article>
    `;
}

function renderPosts() {
    const grid = document.getElementById('post-grid');
    if (!state.posts.length) {
        grid.innerHTML = `<div class="empty-card"><p>${escapeHTML(t('noPosts'))}</p></div>`;
        return;
    }
    grid.innerHTML = state.posts.map(renderPostCard).join('');
}

function renderUsers() {
    const grid = document.getElementById('user-grid');
    if (!state.users.length) {
        grid.innerHTML = `<div class="empty-card"><p>${escapeHTML(t('noUsers'))}</p></div>`;
        return;
    }
    grid.innerHTML = state.users.map(renderUserCard).join('');
}

function updateSummary() {
    document.getElementById('summary-posts').textContent = String(state.posts.length);
    document.getElementById('summary-users').textContent = String(state.users.length);
    document.getElementById('summary-admin').textContent = localStorage.getItem('username') || '-';
}

async function loadDashboard(showLoadedToast = false) {
    document.getElementById('post-grid').innerHTML = `<div class="loading-card">${escapeHTML(t('loadingPosts'))}</div>`;
    document.getElementById('user-grid').innerHTML = `<div class="loading-card">${escapeHTML(t('loadingUsers'))}</div>`;

    try {
        const [postsRes, usersRes] = await Promise.all([
            fetchAdminPostsWithRpc(),
            fetchAdminUsersWithRpc()
        ]);

        if (postsRes.error) throw postsRes.error;
        if (usersRes.error) throw usersRes.error;

        state.posts = Array.isArray(postsRes.data) ? postsRes.data : [];
        state.users = Array.isArray(usersRes.data) ? usersRes.data : [];

        renderPosts();
        renderUsers();
        updateSummary();

        if (showLoadedToast) showToast(t('dashboardLoaded'), 'info');
    } catch (error) {
        console.error(error);
        document.getElementById('post-grid').innerHTML = `<div class="empty-card"><p>${escapeHTML(t('operationFailed'))}</p></div>`;
        document.getElementById('user-grid').innerHTML = `<div class="empty-card"><p>${escapeHTML(t('operationFailed'))}</p></div>`;
        showToast(t('operationFailed'), 'error');
    }
}

function showModal(config) {
    state.modalConfig = config;

    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const descEl = document.getElementById('modal-desc');
    const bodyEl = document.getElementById('modal-body');
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');

    titleEl.textContent = config.title || '';
    descEl.textContent = config.description || '';
    bodyEl.innerHTML = config.bodyHtml || '';
    cancelBtn.textContent = config.cancelText || t('cancel');
    confirmBtn.textContent = config.confirmText || t('confirm');
    confirmBtn.className = config.confirmClass || 'btn-common';
    cancelBtn.className = 'btn-soft';

    cancelBtn.onclick = closeModal;
    document.getElementById('modal-close').onclick = closeModal;
    overlay.hidden = false;

    if (typeof config.onMount === 'function') config.onMount();

    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        try {
            const result = config.onConfirm ? await config.onConfirm() : true;
            if (result !== false) closeModal();
        } catch (error) {
            console.error(error);
            showToast(error && error.message ? error.message : t('unexpectedError'), 'error');
        } finally {
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    };
}

function closeModal() {
    document.getElementById('modal-overlay').hidden = true;
    state.modalConfig = null;
}

function showConfirmModal(title, description, confirmClass, onConfirm) {
    showModal({
        title,
        description,
        confirmText: t('confirm'),
        confirmClass,
        onConfirm
    });
}

function handleDeletePost(postId) {
    const post = getPostById(postId);
    if (!post) return;

    showConfirmModal(t('deletePostTitle'), t('deletePostDesc'), 'btn-danger', async () => {
        const result = await deletePostWithRpc(post.id);
        if (result.error) throw result.error;

        state.posts = state.posts.filter(item => String(item.id) !== String(post.id));
        renderPosts();
        updateSummary();
        showToast(t('postDeleted'));
        return true;
    });
}

function handleFlagPost(postId) {
    const post = getPostById(postId);
    if (!post) return;

    showConfirmModal(t('flagPost'), `${post.title || ''}`, 'btn-warning', async () => {
        const result = await markPostSuspectedRepostWithRpc(post.id);
        if (result.error) throw result.error;

        const nextKeywords = Array.isArray(result.data && result.data.keywords)
            ? result.data.keywords
            : [...(Array.isArray(post.keywords) ? post.keywords : []), SUSPECTED_REPOST_TAG];
        post.keywords = [...new Set(nextKeywords)];
        renderPosts();
        showToast(t('postFlagged'));
        return true;
    });
}

function handleDeleteUser(userId) {
    const user = getUserById(userId);
    if (!user) return;

    showConfirmModal(t('deleteUserTitle'), t('deleteUserDesc'), 'btn-danger', async () => {
        const result = await deleteUserWithRpc(user.id);
        if (result.error) throw result.error;

        state.users = state.users.filter(item => String(item.id) !== String(user.id));
        renderUsers();
        updateSummary();

        if (localStorage.getItem('username') === user.username) {
            localStorage.removeItem('username');
            localStorage.removeItem('userPoints');
        }

        showToast(t('userDeleted'));
        return true;
    });
}

function openBanModal(userId) {
    const user = getUserById(userId);
    if (!user) return;

    showModal({
        title: `${t('banTitle')} @${user.username}`,
        description: t('banDesc'),
        confirmText: t('confirmBan'),
        confirmClass: 'btn-danger',
        bodyHtml: `
            <div class="switch-row">
                <div class="switch-copy">
                    <div class="switch-title">${escapeHTML(t('permanentBanLabel'))}</div>
                    <div class="switch-desc">${escapeHTML(t('permanentBanHint'))}</div>
                </div>
                <label class="switch">
                    <input id="ban-permanent" type="checkbox">
                    <span class="slider"></span>
                </label>
            </div>
            <div id="ban-duration-box">
                <label class="form-label" for="ban-duration-value">${escapeHTML(t('durationLabel'))}</label>
                <div class="form-row">
                    <input class="form-field" id="ban-duration-value" type="number" min="1" step="1" value="1" data-zh-ph="${t('durationPlaceholder')}" data-en-ph="${t('durationPlaceholder')}">
                    <select class="form-select" id="ban-duration-unit">
                        <option value="hours">${escapeHTML(t('hours'))}</option>
                        <option value="days">${escapeHTML(t('days'))}</option>
                    </select>
                </div>
                <p class="soft-note">${escapeHTML(t('utcHint'))}</p>
            </div>
        `,
        onMount: () => {
            const toggle = document.getElementById('ban-permanent');
            const durationBox = document.getElementById('ban-duration-box');
            const syncVisibility = () => {
                durationBox.style.display = toggle.checked ? 'none' : 'block';
            };
            toggle.addEventListener('change', syncVisibility);
            syncVisibility();
        },
        onConfirm: async () => {
            const permanent = document.getElementById('ban-permanent').checked;
            let durationHours = null;

            if (!permanent) {
                const value = Number(document.getElementById('ban-duration-value').value);
                const unit = document.getElementById('ban-duration-unit').value;
                if (!Number.isFinite(value) || value <= 0) {
                    showToast(t('invalidDuration'), 'error');
                    return false;
                }
                durationHours = unit === 'days' ? value * 24 : value;
            }

            const bannedAtUtc = new Date().toISOString();
            const banInfo = {
                banned_at_utc: bannedAtUtc,
                duration_hours: permanent ? null : durationHours,
                permanent
            };

            if (!permanent && durationHours !== null) {
                banInfo.expires_at_utc = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
            }

            const result = await banUserWithRpc(user.id, banInfo);
            if (result.error) throw result.error;

            user.ban_info = result.data && result.data.ban_info ? result.data.ban_info : banInfo;
            renderUsers();
            showToast(t('userBanned'));
            return true;
        }
    });
}

function openDeductPointsModal(userId) {
    const user = getUserById(userId);
    if (!user) return;

    showModal({
        title: `${t('deductTitle')} @${user.username}`,
        description: t('deductDesc'),
        confirmText: t('confirmDeduct'),
        confirmClass: 'btn-warning',
        bodyHtml: `
            <label class="form-label" for="deduct-points-value">${escapeHTML(t('pointsLabel'))}</label>
            <input class="form-field" id="deduct-points-value" type="number" min="1" step="1" value="1">
        `,
        onMount: () => {
            document.getElementById('deduct-points-value').focus();
            document.getElementById('deduct-points-value').select();
        },
        onConfirm: async () => {
            const raw = Number(document.getElementById('deduct-points-value').value);
            if (!Number.isInteger(raw) || raw <= 0) {
                showToast(t('invalidPoints'), 'error');
                return false;
            }

            const result = await deductUserPointsWithRpc(user.id, raw);
            if (result.error) throw result.error;

            const nextPoints = Number(result.data && result.data.points);
            user.points = Number.isFinite(nextPoints) ? nextPoints : Math.max(0, Number(user.points || 0) - raw);
            renderUsers();

            if (localStorage.getItem('username') === user.username) {
                localStorage.setItem('userPoints', String(user.points));
            }

            showToast(t('pointsDeducted'));
            return true;
        }
    });
}

function openRenameModal(userId) {
    const user = getUserById(userId);
    if (!user) return;

    showModal({
        title: `${t('renameTitle')} @${user.username}`,
        description: t('renameDesc'),
        confirmText: t('confirmRename'),
        confirmClass: 'btn-common',
        bodyHtml: `
            <label class="form-label" for="rename-user-value">${escapeHTML(t('renameLabel'))}</label>
            <input class="form-field" id="rename-user-value" type="text" value="${escapeHTML(user.username || '')}">
        `,
        onMount: () => {
            const input = document.getElementById('rename-user-value');
            input.focus();
            input.select();
        },
        onConfirm: async () => {
            const newName = document.getElementById('rename-user-value').value.trim();
            const oldName = user.username;

            if (!newName) {
                showToast(t('invalidName'), 'error');
                return false;
            }
            if (newName === oldName) {
                showToast(t('unchangedName'), 'error');
                return false;
            }

            const duplicateCheck = await _supabase.from('users').select('id, username').eq('username', newName).maybeSingle();
            if (duplicateCheck.error) throw duplicateCheck.error;
            if (duplicateCheck.data && String(duplicateCheck.data.id) !== String(user.id)) {
                showToast(t('duplicatedName'), 'error');
                return false;
            }

            const renameResult = await renameUserWithRpc(user.id, newName);
            if (renameResult.error) throw renameResult.error;

            user.username = newName;
            state.posts.forEach(post => {
                if (post.nickname === oldName) post.nickname = newName;
            });

            if (localStorage.getItem('username') === oldName) {
                localStorage.setItem('username', newName);
            }

            renderPosts();
            renderUsers();
            updateSummary();

            showToast(t('userRenamed'));

            return true;
        }
    });
}

function handleActionClick(event) {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;

    const { action, postId, userId } = actionButton.dataset;
    if (action === 'delete-post') return handleDeletePost(postId);
    if (action === 'flag-post') return handleFlagPost(postId);
    if (action === 'delete-user') return handleDeleteUser(userId);
    if (action === 'ban-user') return openBanModal(userId);
    if (action === 'deduct-points') return openDeductPointsModal(userId);
    if (action === 'rename-user') return openRenameModal(userId);
}

function bindEvents() {
    document.addEventListener('click', handleActionClick);

    document.getElementById('btn-refresh').addEventListener('click', () => {
        loadDashboard(true);
    });

    document.getElementById('btn-jump-users').addEventListener('click', () => {
        document.getElementById('user-management').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('modal-overlay').addEventListener('click', event => {
        if (event.target.id === 'modal-overlay') closeModal();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !document.getElementById('modal-overlay').hidden) {
            closeModal();
        }
    });
}

async function initAdminPage() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }

    applyStaticI18n();
    bindEvents();

    if (!ensureAdminAccess()) {
        showToast(t('adminRequired'), 'error');
        return;
    }

    await loadDashboard(false);
}

initAdminPage();
