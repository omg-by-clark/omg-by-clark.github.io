
const SUSPECTED_REPOST_TAG = '#疑似搬运 Suspected Repost';
const ADMIN_SESSION_STORAGE_KEY = 'omg_admin_session_v1';
const state = { posts: [], users: [], adminUsername: '', adminSession: null };

function lang() { return localStorage.getItem('lang') || 'zh'; }
function zh(cn, en) { return lang() === 'zh' ? cn : en; }
function esc(value) { const div = document.createElement('div'); div.textContent = value == null ? '' : String(value); return div.innerHTML; }
function row(data) { return Array.isArray(data) ? (data[0] || null) : (data || null); }
function bool(data, keys = []) {
    const value = row(data);
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object') {
        for (const key of keys) if (key in value) return Boolean(value[key]);
        const first = Object.keys(value)[0];
        if (first) return Boolean(value[first]);
    }
    return Boolean(value);
}
function isMissingRpcError(error) {
    if (!error) return false;
    const message = String(error.message || '');
    return error.code === 'PGRST202' || message.includes('Could not find') || message.includes('not found');
}
function toast(message, tone = 'success') {
    const region = document.getElementById('toast-region');
    const item = document.createElement('div');
    item.className = `toast ${tone}`;
    item.textContent = message;
    region.appendChild(item);
    setTimeout(() => { item.style.opacity = '0'; item.style.transform = 'translateY(8px)'; }, 2600);
    setTimeout(() => item.remove(), 3000);
}
function applyStaticI18n() {
    document.querySelectorAll('[data-zh]').forEach(el => { el.innerText = lang() === 'zh' ? el.getAttribute('data-zh') : el.getAttribute('data-en'); });
    document.querySelectorAll('[data-zh-ph]').forEach(el => { el.placeholder = lang() === 'zh' ? el.getAttribute('data-zh-ph') : el.getAttribute('data-en-ph'); });
}
function readAdminSession() {
    try {
        const raw = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && parsed.username && parsed.sessionToken ? parsed : null;
    } catch { return null; }
}
function saveAdminSession(session) {
    state.adminSession = session;
    sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}
function clearAdminSession() {
    state.adminSession = null;
    sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}
function updateSummary() {
    document.getElementById('summary-posts').textContent = String(state.posts.length || 0);
    document.getElementById('summary-users').textContent = String(state.users.length || 0);
    document.getElementById('summary-admin').textContent = state.adminUsername || '-';
}
function setAuthCopy(text, isError = false) {
    const el = document.getElementById('auth-copy');
    el.textContent = text;
    el.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}
function setAuthError(text = '') { document.getElementById('auth-error').textContent = text; }
function setAuthStatus(text = '') { document.getElementById('auth-status').textContent = text; }
function showCheckingGate() {
    document.getElementById('auth-gate').classList.add('visible');
    document.getElementById('auth-form').hidden = true;
    document.getElementById('admin-main').hidden = true;
    setAuthCopy(zh('正在检查数据库里的管理员身份。', 'Checking your admin flag in the database.'));
    setAuthStatus(zh('正在检查数据库里的管理员身份。', 'Checking your admin flag in the database.'));
    setAuthError('');
}
function showPasswordGate(message = '', isError = false) {
    document.getElementById('auth-gate').classList.add('visible');
    document.getElementById('auth-form').hidden = false;
    document.getElementById('admin-main').hidden = true;
    setAuthCopy(message || zh('已确认你是管理员，请再输入一次密码。', 'You are an admin. Enter your password again to continue.'), isError);
    setAuthStatus('');
    setAuthError('');
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password').focus();
}
function hidePasswordGate() {
    document.getElementById('auth-gate').classList.remove('visible');
    document.getElementById('auth-form').hidden = true;
    setAuthError('');
    setAuthStatus('');
}
async function hashPasswordCompat(password) {
    if (typeof hashPassword === 'function') return hashPassword(password);
    const buf = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map(item => item.toString(16).padStart(2, '0')).join('');
}
async function fetchAdminGateStatus(username) {
    if (!username) return { isAdmin: false, error: null };
    const { data, error } = await _supabase.rpc('get_admin_gate_status', { p_username: username });
    return { isAdmin: bool(data, ['is_admin', 'allowed', 'value']), error };
}
async function startAdminSession(username, password) {
    const passwordSha256 = await hashPasswordCompat(password);
    const { data, error } = await _supabase.rpc('start_admin_session', { p_username: username, p_password_sha256: passwordSha256 });
    const info = row(data);
    if (!info || !info.session_token) return { session: null, error };
    return { session: { username: info.username || username, sessionToken: String(info.session_token), expiresAt: info.expires_at || '' }, error: null };
}
async function verifyAdminSession(session) {
    if (!session || !session.username || !session.sessionToken) return { valid: false, error: null };
    const { data, error } = await _supabase.rpc('verify_admin_session', { p_username: session.username, p_session_token: session.sessionToken });
    return { valid: bool(data, ['valid', 'ok', 'value']), error };
}
function isSessionError(error) {
    const message = String(error && error.message ? error.message : '');
    return /admin session|required|expired|invalid session|not authorized|forbidden/i.test(message);
}
function handleSessionLoss() {
    clearAdminSession();
    showPasswordGate(zh('管理员会话已失效，请重新输入密码。', 'The admin session expired. Please enter your password again.'), true);
    toast(zh('管理员会话已失效，请重新输入密码。', 'The admin session expired. Please enter your password again.'), 'error');
}
async function adminRpc(name, payload = {}) {
    const session = state.adminSession || readAdminSession();
    if (!session) return { data: null, error: { message: zh('管理员会话不存在，请重新输入密码。', 'The admin session is missing. Please enter your password again.') }, sessionInvalid: true };
    const { data, error } = await _supabase.rpc(name, { p_username: session.username, p_session_token: session.sessionToken, ...payload });
    return { data, error, sessionInvalid: Boolean(error && isSessionError(error)) };
}
function formatUtc(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return String(isoString);
    return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC');
}
function formatPreview(content) {
    const text = String(content || '').replace(/\s+/g, ' ').trim();
    if (!text) return zh('这篇帖子没有正文。', 'This post has no body content.');
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}
function parseBanInfo(raw) {
    if (!raw || typeof raw !== 'object') return { active: false, permanent: false, bannedAtUtc: '', expiresAtUtc: '' };
    const bannedAtUtc = raw.banned_at_utc || raw.banned_at || raw.started_at_utc || '';
    const permanent = Boolean(raw.permanent);
    const hours = raw.duration_hours == null ? null : Number(raw.duration_hours);
    const expiresAtUtc = raw.expires_at_utc || (!permanent && bannedAtUtc && Number.isFinite(hours) ? new Date(new Date(bannedAtUtc).getTime() + hours * 3600000).toISOString() : '');
    const active = permanent ? Boolean(bannedAtUtc) : (expiresAtUtc ? new Date(expiresAtUtc).getTime() > Date.now() : false);
    return { active, permanent, bannedAtUtc, expiresAtUtc };
}
function renderUserStatus(user) {
    const ban = parseBanInfo(user.ban_info);
    if (!ban.bannedAtUtc) return `<span class="status-chip idle-status">${esc(zh('正常', 'Normal'))}</span>`;
    if (ban.active && ban.permanent) return `<span class="status-chip active-ban">${esc(zh('永久封禁', 'Permanent ban'))}</span>`;
    if (ban.active) return `<span class="status-chip active-ban">${esc(zh('封禁中', 'Banned'))}</span>`;
    return `<span class="status-chip expired-ban">${esc(zh('封禁已过期', 'Ban expired'))}</span>`;
}
function renderBanMeta(user) {
    const ban = parseBanInfo(user.ban_info);
    if (!ban.bannedAtUtc) return esc(zh('暂无封禁记录', 'No ban record'));
    if (ban.permanent) return `${esc(zh('最近一次封禁', 'Latest ban'))}: ${esc(formatUtc(ban.bannedAtUtc))} · ${esc(zh('永久封禁', 'Permanent ban'))}`;
    if (ban.expiresAtUtc) return `${esc(zh('最近一次封禁', 'Latest ban'))}: ${esc(formatUtc(ban.bannedAtUtc))} → ${esc(formatUtc(ban.expiresAtUtc))}`;
    return `${esc(zh('最近一次封禁', 'Latest ban'))}: ${esc(formatUtc(ban.bannedAtUtc))}`;
}
function renderPosts() {
    const grid = document.getElementById('post-grid');
    if (!state.posts.length) { grid.innerHTML = `<div class="empty-card">${esc(zh('还没有帖子。', 'No posts yet.'))}</div>`; return; }
    grid.innerHTML = state.posts.map(post => {
        const keywords = Array.isArray(post.keywords) ? post.keywords : [];
        const isFlagged = keywords.includes(SUSPECTED_REPOST_TAG);
        const moderatorBadge = typeof getModeratorBadgeHTML === 'function' ? getModeratorBadgeHTML(post.nickname) : '';
        const tags = keywords.length
            ? keywords.map(keyword => `<span class="${keyword === SUSPECTED_REPOST_TAG ? 'tag-chip repost' : 'tag-chip'}">${esc(keyword)}</span>`).join('')
            : `<span class="soft-note">${esc(zh('暂无标签', 'No tags yet'))}</span>`;
        return `
            <article class="admin-card">
                <div class="card-main">
                    <div class="card-title-row">
                        <h3 class="card-title">${esc(post.title || '(Untitled)')}</h3>
                        ${isFlagged ? `<span class="status-chip active-ban">${esc(zh('已标记', 'Already Flagged'))}</span>` : ''}
                    </div>
                    <p class="card-subtitle">${esc(formatPreview(post.content))}</p>
                    <div class="meta-grid">
                        <div class="meta-item"><span class="meta-label">${esc(zh('作者', 'Author'))}</span><span class="meta-value">${esc(post.nickname || '-')} ${moderatorBadge}</span></div>
                        <div class="meta-item"><span class="meta-label">${esc(zh('发布时间', 'Created'))}</span><span class="meta-value">${esc(formatUtc(post.created_at))}</span></div>
                        <div class="meta-item"><span class="meta-label">${esc(zh('互动数据', 'Stats'))}</span><span class="meta-value">👍 ${Number(post.likes || 0)} / 👎 ${Number(post.dislike || 0)} / 👀 ${Number(post.reads || 0)}</span></div>
                        <div class="meta-item"><span class="meta-label">${esc(zh('标签', 'Tags'))}</span><div class="tag-list">${tags}</div></div>
                    </div>
                    <div class="card-meta">ID: ${esc(String(post.id))}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-danger" type="button" data-action="delete-post" data-post-id="${esc(String(post.id))}">${esc(zh('删除帖子', 'Delete Post'))}</button>
                    <button class="btn-warning" type="button" data-action="flag-post" data-post-id="${esc(String(post.id))}" ${isFlagged ? 'disabled' : ''}>${esc(isFlagged ? zh('已标记', 'Already Flagged') : zh('标记疑似搬运', 'Flag as Repost'))}</button>
                </div>
            </article>`;
    }).join('');
}
function renderUsers() {
    const grid = document.getElementById('user-grid');
    if (!state.users.length) { grid.innerHTML = `<div class="empty-card">${esc(zh('还没有用户。', 'No users yet.'))}</div>`; return; }
    grid.innerHTML = state.users.map(user => {
        const level = typeof getLevelInfo === 'function' ? getLevelInfo(Number(user.points || 0)) : { name: '-', class: '' };
        const moderatorBadge = typeof getModeratorBadgeHTML === 'function' ? getModeratorBadgeHTML(user.username) : '';
        return `
            <article class="admin-card">
                <div class="card-main">
                    <div class="card-title-row">
                        <h3 class="card-title">${esc(user.username || '-')} ${moderatorBadge}</h3>
                        ${renderUserStatus(user)}
                    </div>
                    <div class="meta-grid">
                        <div class="meta-item"><span class="meta-label">${esc(zh('积分', 'Points'))}</span><span class="meta-value">${Number(user.points || 0)}</span></div>
                        <div class="meta-item"><span class="meta-label">${esc(zh('等级', 'Level'))}</span><span class="meta-value"><span class="lv-badge ${esc(level.class)}">${esc(level.name)}</span></span></div>
                        <div class="meta-item"><span class="meta-label">${esc(zh('状态', 'Status'))}</span><div class="status-list">${renderUserStatus(user)}</div></div>
                        <div class="meta-item"><span class="meta-label">${esc(zh('封禁信息', 'Ban Info'))}</span><span class="meta-value">${renderBanMeta(user)}</span></div>
                    </div>
                    <div class="card-meta">ID: ${esc(String(user.id))} · is_admin: ${user.is_admin ? 'true' : 'false'}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-danger" type="button" data-action="delete-user" data-user-id="${esc(String(user.id))}">${esc(zh('删除用户', 'Delete User'))}</button>
                    <button class="btn-warning" type="button" data-action="ban-user" data-user-id="${esc(String(user.id))}">${esc(zh('封禁用户', 'Ban User'))}</button>
                    <button class="btn-soft" type="button" data-action="deduct-points" data-user-id="${esc(String(user.id))}">${esc(zh('扣除积分', 'Deduct Points'))}</button>
                    <button class="btn-common" type="button" data-action="rename-user" data-user-id="${esc(String(user.id))}">${esc(zh('修改名称', 'Rename User'))}</button>
                </div>
            </article>`;
    }).join('');
}
async function loadDashboard(showNotice = false) {
    document.getElementById('post-grid').innerHTML = `<div class="loading-card">${esc(zh('正在加载帖子…', 'Loading posts...'))}</div>`;
    document.getElementById('user-grid').innerHTML = `<div class="loading-card">${esc(zh('正在加载用户…', 'Loading users...'))}</div>`;
    let [postsRes, usersRes] = await Promise.all([adminRpc('admin_list_posts'), adminRpc('admin_list_users')]);
    if (postsRes.sessionInvalid || usersRes.sessionInvalid) { handleSessionLoss(); return; }

    if (postsRes.error && isMissingRpcError(postsRes.error) && typeof fetchAdminPostsWithRpc === 'function') {
        postsRes = await fetchAdminPostsWithRpc();
    }
    if (usersRes.error && isMissingRpcError(usersRes.error) && typeof fetchAdminUsersWithRpc === 'function') {
        usersRes = await fetchAdminUsersWithRpc();
    }

    if (postsRes.error || usersRes.error) {
        const message = String((postsRes.error || usersRes.error).message || zh('操作失败，请稍后再试。', 'The operation failed. Please try again later.'));
        console.error(postsRes.error || usersRes.error);
        document.getElementById('post-grid').innerHTML = `<div class="empty-card">${esc(message)}</div>`;
        document.getElementById('user-grid').innerHTML = `<div class="empty-card">${esc(message)}</div>`;
        toast(message, 'error');
        return;
    }
    state.posts = Array.isArray(postsRes.data) ? postsRes.data : [];
    state.users = Array.isArray(usersRes.data) ? usersRes.data : [];
    renderPosts();
    renderUsers();
    updateSummary();
    if (showNotice) toast(zh('管理员数据已刷新。', 'Admin data refreshed.'), 'info');
}
function getPostById(postId) { return state.posts.find(post => String(post.id) === String(postId)) || null; }
function getUserById(userId) { return state.users.find(user => String(user.id) === String(userId)) || null; }
function showModal(config) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const descEl = document.getElementById('modal-desc');
    const bodyEl = document.getElementById('modal-body');
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');
    titleEl.textContent = config.title || '';
    descEl.textContent = config.description || '';
    bodyEl.innerHTML = config.bodyHtml || '';
    cancelBtn.textContent = config.cancelText || zh('取消', 'Cancel');
    confirmBtn.textContent = config.confirmText || zh('确认', 'Confirm');
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
            toast(error && error.message ? error.message : zh('操作失败，请稍后再试。', 'The operation failed. Please try again later.'), 'error');
        } finally {
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    };
}
function closeModal() { document.getElementById('modal-overlay').hidden = true; }
function confirmModal(title, description, confirmClass, onConfirm) {
    showModal({ title, description, confirmText: zh('确认', 'Confirm'), confirmClass, onConfirm });
}
function deletePost(postId) {
    const post = getPostById(postId);
    if (!post) return;
    confirmModal(zh('删除这篇帖子？', 'Delete this post?'), zh('会删除帖子本体和评论，图片仍会尝试在前端顺手清理。', 'This removes the post and its comments. The image will still be cleaned up on the client side when possible.'), 'btn-danger', async () => {
        const result = await adminRpc('admin_delete_post', { p_post_id: post.id });
        if (result.sessionInvalid) { handleSessionLoss(); return false; }
        if (result.error) throw result.error;
        try { await _supabase.storage.from('photos').remove([`${post.id}.webp`]); } catch {}
        state.posts = state.posts.filter(item => String(item.id) !== String(post.id));
        renderPosts(); updateSummary(); toast(zh('帖子已删除。', 'Post deleted.')); return true;
    });
}
function flagPost(postId) {
    const post = getPostById(postId);
    if (!post) return;
    confirmModal(zh('标记疑似搬运', 'Flag as Repost'), post.title || '', 'btn-warning', async () => {
        const result = await adminRpc('admin_mark_post_suspected_repost', { p_post_id: post.id });
        if (result.sessionInvalid) { handleSessionLoss(); return false; }
        if (result.error) throw result.error;
        const changed = row(result.data);
        post.keywords = Array.isArray(changed && changed.keywords) ? changed.keywords : [...new Set([...(Array.isArray(post.keywords) ? post.keywords : []), SUSPECTED_REPOST_TAG])];
        renderPosts(); toast(zh('已追加疑似搬运标签。', 'The suspected repost tag was added.')); return true;
    });
}
function deleteUser(userId) {
    const user = getUserById(userId);
    if (!user) return;
    confirmModal(zh('删除这个用户？', 'Delete this user?'), zh('这会删除 users 表里的用户记录，不会自动清理历史帖子和评论。', 'This deletes the user row from the users table and does not automatically purge old posts or comments.'), 'btn-danger', async () => {
        const result = await adminRpc('admin_delete_user', { p_user_id: user.id });
        if (result.sessionInvalid) { handleSessionLoss(); return false; }
        if (result.error) throw result.error;
        state.users = state.users.filter(item => String(item.id) !== String(user.id));
        renderUsers(); updateSummary();
        if (localStorage.getItem('username') === user.username) {
            localStorage.removeItem('username'); localStorage.removeItem('userPoints'); clearAdminSession(); window.location.replace('index.html'); return true;
        }
        toast(zh('用户已删除。', 'User deleted.')); return true;
    });
}
function banUser(userId) {
    const user = getUserById(userId);
    if (!user) return;
    showModal({
        title: `${zh('封禁用户', 'Ban User')} @${user.username}`,
        description: zh('封禁信息会写入 ban_info，并统一按 UTC 记录。', 'The ban info is written to ban_info and stored in UTC.'),
        confirmText: zh('确认封禁', 'Apply Ban'),
        confirmClass: 'btn-danger',
        bodyHtml: `<div class="switch-row"><div><div class="switch-title">${esc(zh('永久封禁', 'Permanent ban'))}</div><div class="switch-desc">${esc(zh('打开后不再输入持续时间。', 'When enabled, the duration fields disappear.'))}</div></div><label class="switch"><input id="ban-permanent" type="checkbox"><span class="slider"></span></label></div><div id="ban-duration-box"><label class="field-label" for="ban-duration-value">${esc(zh('封禁时长', 'Ban duration'))}</label><div class="form-row"><input class="form-field" id="ban-duration-value" type="number" min="1" step="1" value="1"><select class="form-select" id="ban-duration-unit"><option value="hours">${esc(zh('小时', 'Hours'))}</option><option value="days">${esc(zh('天', 'Days'))}</option></select></div><p class="soft-note">${esc(zh('封禁起始时间会按当前 UTC 时间写入数据库。', 'The ban start time is written to the database using the current UTC time.'))}</p></div>`,
        onMount: () => {
            const toggle = document.getElementById('ban-permanent');
            const box = document.getElementById('ban-duration-box');
            const sync = () => { box.style.display = toggle.checked ? 'none' : 'block'; };
            toggle.addEventListener('change', sync); sync();
        },
        onConfirm: async () => {
            const permanent = document.getElementById('ban-permanent').checked;
            let durationHours = null;
            if (!permanent) {
                const value = Number(document.getElementById('ban-duration-value').value);
                const unit = document.getElementById('ban-duration-unit').value;
                if (!Number.isFinite(value) || value <= 0) { toast(zh('请输入大于 0 的封禁时长。', 'Enter a ban duration greater than 0.'), 'error'); return false; }
                durationHours = unit === 'days' ? value * 24 : value;
            }
            const banInfo = { banned_at_utc: new Date().toISOString(), duration_hours: permanent ? null : durationHours, permanent };
            if (!permanent && durationHours !== null) banInfo.expires_at_utc = new Date(Date.now() + durationHours * 3600000).toISOString();
            const result = await adminRpc('admin_ban_user', { p_user_id: user.id, p_ban_info: banInfo });
            if (result.sessionInvalid) { handleSessionLoss(); return false; }
            if (result.error) throw result.error;
            const changed = row(result.data); user.ban_info = changed && changed.ban_info ? changed.ban_info : banInfo;
            renderUsers(); toast(zh('封禁信息已更新。', 'Ban info updated.')); return true;
        }
    });
}
function deductPoints(userId) {
    const user = getUserById(userId);
    if (!user) return;
    showModal({
        title: `${zh('扣除积分', 'Deduct Points')} @${user.username}`,
        description: zh('输入要扣除的积分数量，最低只会扣到 0。', 'Enter how many points to deduct. The value bottoms out at 0.'),
        confirmText: zh('确认扣分', 'Deduct Points'),
        confirmClass: 'btn-warning',
        bodyHtml: `<label class="field-label" for="deduct-points-value">${esc(zh('扣除积分', 'Points to deduct'))}</label><input class="form-field" id="deduct-points-value" type="number" min="1" step="1" value="1">`,
        onMount: () => { const input = document.getElementById('deduct-points-value'); input.focus(); input.select(); },
        onConfirm: async () => {
            const amount = Number(document.getElementById('deduct-points-value').value);
            if (!Number.isInteger(amount) || amount <= 0) { toast(zh('请输入大于 0 的整数积分。', 'Enter a positive whole number of points.'), 'error'); return false; }
            const result = await adminRpc('admin_deduct_user_points', { p_user_id: user.id, p_points_to_deduct: amount });
            if (result.sessionInvalid) { handleSessionLoss(); return false; }
            if (result.error) throw result.error;
            const changed = row(result.data); user.points = Number.isFinite(Number(changed && changed.points)) ? Number(changed.points) : Math.max(0, Number(user.points || 0) - amount);
            renderUsers();
            if (localStorage.getItem('username') === user.username) localStorage.setItem('userPoints', String(user.points));
            toast(zh('积分已扣除。', 'Points deducted.')); return true;
        }
    });
}
function renameUser(userId) {
    const user = getUserById(userId);
    if (!user) return;
    showModal({
        title: `${zh('修改用户名', 'Rename Username')} @${user.username}`,
        description: zh('会同步更新这个用户已发布的帖子和评论作者名。', 'This also updates the author name on this user\'s posts and comments.'),
        confirmText: zh('确认改名', 'Rename User'),
        confirmClass: 'btn-common',
        bodyHtml: `<label class="field-label" for="rename-user-value">${esc(zh('新用户名', 'New username'))}</label><input class="form-field" id="rename-user-value" type="text" value="${esc(user.username || '')}">`,
        onMount: () => { const input = document.getElementById('rename-user-value'); input.focus(); input.select(); },
        onConfirm: async () => {
            const newName = document.getElementById('rename-user-value').value.trim();
            const oldName = user.username;
            if (!newName) { toast(zh('请输入新的用户名。', 'Enter a new username.'), 'error'); return false; }
            if (newName === oldName) { toast(zh('新用户名和旧用户名相同。', 'The new username matches the current one.'), 'error'); return false; }
            if (state.users.some(other => other.username === newName && String(other.id) !== String(user.id))) { toast(zh('这个用户名已经被占用了。', 'That username is already taken.'), 'error'); return false; }
            const result = await adminRpc('admin_rename_user', { p_user_id: user.id, p_new_username: newName });
            if (result.sessionInvalid) { handleSessionLoss(); return false; }
            if (result.error) throw result.error;
            user.username = newName;
            state.posts.forEach(post => { if (post.nickname === oldName) post.nickname = newName; });
            if (localStorage.getItem('username') === oldName) {
                localStorage.setItem('username', newName);
                state.adminUsername = newName;
                renderPosts(); renderUsers(); updateSummary(); clearAdminSession(); handleSessionLoss(); return true;
            }
            renderPosts(); renderUsers(); updateSummary(); toast(zh('用户名已更新。', 'Username updated.')); return true;
        }
    });
}
function handleActionClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, postId, userId } = button.dataset;
    if (action === 'delete-post') return deletePost(postId);
    if (action === 'flag-post') return flagPost(postId);
    if (action === 'delete-user') return deleteUser(userId);
    if (action === 'ban-user') return banUser(userId);
    if (action === 'deduct-points') return deductPoints(userId);
    if (action === 'rename-user') return renameUser(userId);
}
async function submitAdminPassword() {
    const input = document.getElementById('admin-password');
    const button = document.getElementById('btn-admin-auth');
    if (!input.value) { setAuthError(zh('请输入当前密码。', 'Enter your current password.')); input.focus(); return; }
    button.disabled = true; setAuthError(''); setAuthStatus(zh('正在验证密码…', 'Verifying password...'));
    try {
        const { session, error } = await startAdminSession(state.adminUsername, input.value);
        if (error) { console.error(error); setAuthError(error.message || zh('操作失败，请稍后再试。', 'The operation failed. Please try again later.')); return; }
        if (!session) { setAuthError(zh('密码不对，或者当前账号不再是管理员。', 'The password is incorrect, or this account is no longer an admin.')); return; }
        saveAdminSession(session); hidePasswordGate(); document.getElementById('admin-main').hidden = false; toast(zh('管理员验证通过。', 'Admin verification passed.')); await loadDashboard(false);
    } finally {
        button.disabled = false; setAuthStatus('');
    }
}
function bindEvents() {
    document.addEventListener('click', handleActionClick);
    document.getElementById('btn-refresh').addEventListener('click', () => { if (!document.getElementById('admin-main').hidden) loadDashboard(true); });
    document.getElementById('btn-jump-users').addEventListener('click', () => { if (!document.getElementById('admin-main').hidden) document.getElementById('user-management').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    document.getElementById('btn-admin-auth').addEventListener('click', submitAdminPassword);
    document.getElementById('admin-password').addEventListener('keydown', event => { if (event.key === 'Enter') submitAdminPassword(); });
    document.getElementById('modal-overlay').addEventListener('click', event => { if (event.target.id === 'modal-overlay') closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.getElementById('modal-overlay').hidden) closeModal(); });
}
async function initAdminPage() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
    applyStaticI18n(); bindEvents();
    state.adminUsername = localStorage.getItem('username') || '';
    updateSummary();
    if (!state.adminUsername) { window.location.replace('index.html'); return; }
    showCheckingGate();
    const gate = await fetchAdminGateStatus(state.adminUsername);
    if (gate.error) {
        console.error(gate.error);
        clearAdminSession();
        toast(zh('无法确认管理员身份，正在返回首页。', 'Unable to verify admin access. Redirecting home.'), 'error');
        setTimeout(() => window.location.replace('index.html'), 120);
        return;
    }
    if (!gate.isAdmin) { clearAdminSession(); toast(zh('你不是管理员，正在返回首页。', 'You are not an admin. Redirecting home.'), 'error'); setTimeout(() => window.location.replace('index.html'), 120); return; }
    const session = readAdminSession();
    if (session && session.username === state.adminUsername) {
        const verified = await verifyAdminSession(session);
        if (!verified.error && verified.valid) { state.adminSession = session; hidePasswordGate(); document.getElementById('admin-main').hidden = false; await loadDashboard(false); return; }
        clearAdminSession();
    }
    showPasswordGate();
}
initAdminPage();
