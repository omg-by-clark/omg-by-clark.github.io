/* db.js */
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
const createClient = window.supabase ? window.supabase.createClient : null;

const SUPABASE_URL = 'https://rptrbdkgryybipbshlkz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdHJiZGtncnl5YmlwYnNobGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzgyODksImV4cCI6MjA4Mzk1NDI4OX0.PXe7ZeN70e86xXxxXUgc0UeDaEBNgRHZmGmc5zyKyRE';

/* 用途：判断当前是否处在离线测试模式。
原理：搜索框指令会把 offlineTestMode 写入 localStorage；为 true 时，页面使用下方的内存假数据客户端，不向 Supabase 发请求。
*/
function isOfflineTestMode() {
    return localStorage.getItem('offlineTestMode') === 'true';
}

/* 用途：判断帖子和评论是否应该显示原始文本。
原理：/ttrm 会在 raw/rendered 之间切换；raw 模式直接显示已转义文本，不解析 \link、\b、\code 等自定义指令。
*/
function isRawTextRenderingMode() {
    return localStorage.getItem('textRenderingMode') === 'raw';
}

/* 用途：读取被单独禁用的渲染指令集合。
原理：/trc link 这类指令会把指令名写进 JSON 数组；解析正文时命中禁用项就保留原始指令。
*/
function getDisabledRenderingCommands() {
    try {
        const value = JSON.parse(localStorage.getItem('disabledRenderingCommands') || '[]');
        return Array.isArray(value) ? value.map(item => String(item).toLowerCase()) : [];
    } catch (error) {
        return [];
    }
}

/* 用途：判断某一个自定义渲染指令是否启用。
原理：先检查全局 raw 模式，再检查单个禁用列表；只有两者都允许时才进行 HTML 替换。
*/
function shouldRenderCustomCommand(command) {
    if (isRawTextRenderingMode()) return false;
    return !getDisabledRenderingCommands().includes(String(command || '').toLowerCase());
}

/* 用途：创建一个不连接数据库的 Supabase 兼容假客户端。
原理：实现页面当前会用到的 from/select/eq/order/range/insert/update/delete/storage/rpc 链式方法，并从内存数组返回数据。
注意：这是给 /otm 做 UI 测试的轻量数据层，不会持久保存，也不会覆盖真实数据库。
*/
function createOfflineSupabaseClient() {
    const now = Date.now();
    const tables = {
        users: [
            { id: 1, username: 'Clark', points: 1500, inventory: { 100: new Date(now + 86400000).toISOString() } },
            { id: 2, username: 'OfflineUser', points: 420, inventory: {} }
        ],
        posts: [
            {
                id: 1,
                nickname: 'Clark',
                title: '离线测试帖子',
                content: '这里是 /otm 的测试内容。\\link[Catppuccin](https://catppuccin.com) 和 \\b[加粗] 都可以拿来试渲染开关。',
                likes: 8,
                dislike: 1,
                reads: 12,
                keywords: ['#编程 Coding'],
                created_at: new Date(now - 7 * 60 * 1000).toISOString()
            },
            {
                id: 2,
                nickname: 'OfflineUser',
                title: 'NSFW 和评论回复测试',
                content: '这条用于看列表、详情、评论、点赞在离线模式下的 UI。',
                likes: 3,
                dislike: 0,
                reads: 5,
                keywords: ['#NSFW', '#生活 Life'],
                created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString()
            }
        ],
        comments: [
            { id: 1, post_id: '1', nickname: 'OfflineUser', content: '测试评论里的 \\code[command]。', reply_to: null, created_at: new Date(now - 5 * 60 * 1000).toISOString() },
            { id: 2, post_id: '1', nickname: 'Clark', content: '这是回复评论。', reply_to: 1, created_at: new Date(now - 4 * 60 * 1000).toISOString() }
        ]
    };

    class OfflineQuery {
        constructor(tableName) {
            this.tableName = tableName;
            this.rows = tables[tableName] || [];
            this.filters = [];
            this.rangeBounds = null;
            this.singleMode = false;
            this.maybeSingleMode = false;
            this.selectOptions = {};
            this.orderRule = null;
            this.pendingInsert = null;
            this.pendingUpdate = null;
            this.deleteMode = false;
            this.orExpression = '';
            this.containsFilter = null;
        }

        select(columns, options) {
            this.selectOptions = options || {};
            return this;
        }

        eq(column, value) {
            this.filters.push(row => String(row[column]) === String(value));
            return this;
        }

        contains(column, value) {
            try {
                const expected = JSON.parse(value);
                this.containsFilter = { column, expected: Array.isArray(expected) ? expected : [expected] };
            } catch (error) {
                this.containsFilter = { column, expected: [] };
            }
            return this;
        }

        or(expression) {
            this.orExpression = String(expression || '');
            return this;
        }

        order(column, options) {
            this.orderRule = { column, ascending: Boolean(options && options.ascending) };
            return this;
        }

        range(from, to) {
            this.rangeBounds = { from, to };
            return this;
        }

        single() {
            this.singleMode = true;
            return this;
        }

        maybeSingle() {
            this.maybeSingleMode = true;
            return this;
        }

        insert(rows) {
            this.pendingInsert = Array.isArray(rows) ? rows : [rows];
            return this;
        }

        update(values) {
            this.pendingUpdate = values || {};
            return this;
        }

        delete() {
            this.deleteMode = true;
            return this;
        }

        then(resolve, reject) {
            return this.execute().then(resolve, reject);
        }

        async execute() {
            let rows = this.rows;

            if (this.pendingInsert) {
                const inserted = this.pendingInsert.map(row => ({
                    id: row.id || Math.max(0, ...this.rows.map(item => Number(item.id) || 0)) + 1,
                    created_at: row.created_at || new Date().toISOString(),
                    ...row
                }));
                this.rows.push(...inserted);
                rows = inserted;
            } else {
                rows = rows.filter(row => this.filters.every(filter => filter(row)));
            }

            if (this.containsFilter) {
                rows = rows.filter(row => this.containsFilter.expected.every(item => (row[this.containsFilter.column] || []).includes(item)));
            }

            if (this.orExpression) {
                const match = this.orExpression.match(/title\.ilike\.%(.+?)%,content\.ilike\.%(.+?)%/);
                const term = match ? decodeURIComponent(match[1]).toLowerCase() : '';
                rows = rows.filter(row => !term || String(row.title || '').toLowerCase().includes(term) || String(row.content || '').toLowerCase().includes(term));
            }

            if (this.pendingUpdate) {
                rows.forEach(row => Object.assign(row, this.pendingUpdate));
            }

            if (this.deleteMode) {
                const deleteSet = new Set(rows);
                tables[this.tableName] = this.rows.filter(row => !deleteSet.has(row));
                this.rows = tables[this.tableName];
                rows = [];
            }

            if (this.orderRule) {
                const { column, ascending } = this.orderRule;
                rows = [...rows].sort((a, b) => {
                    const av = a[column];
                    const bv = b[column];
                    return ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
                });
            }

            const count = rows.length;
            if (this.rangeBounds) {
                rows = rows.slice(this.rangeBounds.from, this.rangeBounds.to + 1);
            }

            if (this.selectOptions.head) {
                return { data: null, count, error: null };
            }
            if (this.singleMode) {
                return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'Offline row not found' } };
            }
            if (this.maybeSingleMode) {
                return { data: rows[0] || null, error: null };
            }
            return { data: rows, error: null, count };
        }
    }

    return {
        from(tableName) {
            return new OfflineQuery(tableName);
        },
        rpc() {
            return Promise.resolve({ data: null, error: { code: 'OFFLINE_TEST_MODE', message: 'Offline test mode is enabled.' } });
        },
        storage: {
            from() {
                return {
                    upload: () => Promise.resolve({ data: null, error: null }),
                    remove: () => Promise.resolve({ data: null, error: null }),
                    download: () => Promise.resolve({ data: null, error: { message: 'No offline photo.' } }),
                    getPublicUrl: path => ({ data: { publicUrl: path } })
                };
            }
        }
    };
}

/* 用途：创建全站共用的 Supabase 客户端。
原理：页面加载 db.js 后即可通过 _supabase 访问数据库和 Storage；离线测试模式下改用内存客户端，避免连接真实数据库。
*/
const _supabase = isOfflineTestMode()
    ? createOfflineSupabaseClient()
    : createClient(SUPABASE_URL, SUPABASE_KEY);

/* 用途：将用户输入的明文密码转换成 SHA-256 哈希。
原理：使用浏览器原生 crypto.subtle.digest 计算哈希，再把 Uint8Array 转成十六进制字符串，避免把明文密码直接写入数据库。
*/
async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function unwrapRpcRow(data) {
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
}

function unwrapRpcRows(data) {
    if (Array.isArray(data)) return data;
    return data ? [data] : [];
}

function isMissingRpcError(error) {
    if (!error) return false;
    const message = String(error.message || '');
    return error.code === 'PGRST202' || message.includes('Could not find') || message.includes('not found');
}

async function loginUserWithRpc(username, passwordSha256) {
    if (isOfflineTestMode()) {
        const fallback = await _supabase
            .from('users')
            .select('id, username, points')
            .eq('username', username)
            .eq('password', passwordSha256)
            .single();

        if (fallback.error || !fallback.data) return fallback;

        const updatedPoints = (Number(fallback.data.points) || 0) + 5;
        await _supabase.from('users').update({ points: updatedPoints }).eq('username', username);

        return {
            data: {
                ...fallback.data,
                points: updatedPoints,
                login_reward: 5,
                points_awarded_by_rpc: true
            },
            error: null
        };
    }

    const { data, error } = await _supabase.rpc('login_user', {
        p_username: username,
        p_password_sha256: passwordSha256
    });

    return { data: unwrapRpcRow(data), error };
}

async function registerUserWithRpc(username, passwordSha256) {
    if (isOfflineTestMode()) {
        return _supabase.from('users').insert([{ username, password: passwordSha256, points: 0 }]);
    }

    const { data, error } = await _supabase.rpc('register_user', {
        p_username: username,
        p_password_sha256: passwordSha256
    });

    return { data: unwrapRpcRow(data), error };
}

async function fetchPublicUserProfileWithRpc(username) {
    if (isOfflineTestMode()) {
        return _supabase.from('users').select('username, points, inventory').eq('username', username).maybeSingle();
    }

    const { data, error } = await _supabase.rpc('get_public_user_profile', {
        p_username: username
    });

    return { data: unwrapRpcRow(data), error };
}

async function fetchPublicUserProfilesWithRpc() {
    if (isOfflineTestMode()) {
        return _supabase.from('users').select('username, points, inventory');
    }

    const { data, error } = await _supabase.rpc('list_public_user_profiles');
    return { data: unwrapRpcRows(data), error };
}

async function createCommentWithRpc(postId, nickname, content, replyTo) {
    if (isOfflineTestMode()) {
        const payload = { post_id: postId, nickname, content };
        if (replyTo !== null && replyTo !== undefined) payload.reply_to = replyTo;

        const insertResult = await _supabase.from('comments').insert([payload]);
        if (insertResult.error) return insertResult;

        const userResult = await _supabase.from('users').select('points').eq('username', nickname).maybeSingle();
        const updatedPoints = (Number(userResult.data ? userResult.data.points : 0) || 0) + 5;
        await _supabase.from('users').update({ points: updatedPoints }).eq('username', nickname);

        return { data: { user_points: updatedPoints }, error: null };
    }

    const { data, error } = await _supabase.rpc('create_comment', {
        p_post_id: postId,
        p_nickname: nickname,
        p_content: content,
        p_reply_to: replyTo ?? null
    });

    return { data: unwrapRpcRow(data), error };
}

async function fetchAdminPostsWithRpc() {
    if (isOfflineTestMode()) {
        return _supabase.from('posts').select('*').order('created_at', { ascending: false });
    }

    const { data, error } = await _supabase.rpc('admin_list_posts');
    if (!error) return { data: unwrapRpcRows(data), error: null };
    if (!isMissingRpcError(error)) return { data: null, error };

    return _supabase.from('posts').select('*').order('created_at', { ascending: false });
}

async function fetchAdminUsersWithRpc() {
    if (isOfflineTestMode()) {
        return _supabase.from('users').select('*').order('id', { ascending: true });
    }

    const { data, error } = await _supabase.rpc('admin_list_users');
    if (!error) return { data: unwrapRpcRows(data), error: null };
    if (!isMissingRpcError(error)) return { data: null, error };

    return _supabase.from('users').select('*').order('id', { ascending: true });
}

async function deletePostDirect(postId) {
    const photoRemoval = _supabase.storage.from('photos').remove([`${postId}.webp`]).catch(() => ({ error: null }));
    const commentsDeletion = _supabase.from('comments').delete().eq('post_id', postId);
    const postDeletion = _supabase.from('posts').delete().eq('id', postId);

    const [, commentsResult, postResult] = await Promise.all([photoRemoval, commentsDeletion, postDeletion]);
    if (commentsResult.error) return { data: null, error: commentsResult.error };
    if (postResult.error) return { data: null, error: postResult.error };
    return { data: { id: postId }, error: null };
}

async function deletePostWithRpc(postId) {
    if (isOfflineTestMode()) return deletePostDirect(postId);

    const { data, error } = await _supabase.rpc('admin_delete_post', {
        p_post_id: postId
    });

    if (!error) return { data: unwrapRpcRow(data) || { id: postId }, error: null };
    if (!isMissingRpcError(error)) return { data: null, error };

    return deletePostDirect(postId);
}

async function markPostSuspectedRepostDirect(postId) {
    const { data: post, error: postError } = await _supabase.from('posts').select('*').eq('id', postId).maybeSingle();
    if (postError) return { data: null, error: postError };
    if (!post) return { data: null, error: { message: 'Post not found.' } };

    const keywords = Array.isArray(post.keywords) ? [...post.keywords] : [];
    if (!keywords.includes('#疑似搬运 Suspected Repost')) keywords.push('#疑似搬运 Suspected Repost');

    const updateResult = await _supabase.from('posts').update({ keywords }).eq('id', postId);
    if (updateResult.error) return { data: null, error: updateResult.error };

    return { data: { ...post, keywords }, error: null };
}

async function markPostSuspectedRepostWithRpc(postId) {
    if (isOfflineTestMode()) return markPostSuspectedRepostDirect(postId);

    const { data, error } = await _supabase.rpc('admin_mark_post_suspected_repost', {
        p_post_id: postId
    });

    if (!error) {
        const rpcRow = unwrapRpcRow(data);
        if (rpcRow && rpcRow.keywords) return { data: rpcRow, error: null };
        const refetch = await _supabase.from('posts').select('*').eq('id', postId).maybeSingle();
        return { data: refetch.data || { id: postId }, error: refetch.error };
    }
    if (!isMissingRpcError(error)) return { data: null, error };

    return markPostSuspectedRepostDirect(postId);
}

async function deleteUserWithRpc(userId) {
    if (isOfflineTestMode()) {
        return _supabase.from('users').delete().eq('id', userId);
    }

    const { data, error } = await _supabase.rpc('admin_delete_user', {
        p_user_id: userId
    });

    if (!error) return { data: unwrapRpcRow(data) || { id: userId }, error: null };
    if (!isMissingRpcError(error)) return { data: null, error };

    return _supabase.from('users').delete().eq('id', userId);
}

async function banUserDirect(userId, banInfo) {
    const updateResult = await _supabase.from('users').update({ ban_info: banInfo }).eq('id', userId);
    if (updateResult.error) return { data: null, error: updateResult.error };
    const refetch = await _supabase.from('users').select('*').eq('id', userId).maybeSingle();
    return { data: refetch.data || { id: userId, ban_info: banInfo }, error: refetch.error };
}

async function banUserWithRpc(userId, banInfo) {
    if (isOfflineTestMode()) return banUserDirect(userId, banInfo);

    const { data, error } = await _supabase.rpc('admin_ban_user', {
        p_user_id: userId,
        p_ban_info: banInfo
    });

    if (!error) {
        const rpcRow = unwrapRpcRow(data);
        if (rpcRow) return { data: rpcRow, error: null };
        const refetch = await _supabase.from('users').select('*').eq('id', userId).maybeSingle();
        return { data: refetch.data || { id: userId, ban_info: banInfo }, error: refetch.error };
    }
    if (!isMissingRpcError(error)) return { data: null, error };

    return banUserDirect(userId, banInfo);
}

async function deductUserPointsDirect(userId, pointsToDeduct) {
    const userResult = await _supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (userResult.error) return { data: null, error: userResult.error };
    if (!userResult.data) return { data: null, error: { message: 'User not found.' } };

    const nextPoints = Math.max(0, Number(userResult.data.points || 0) - Number(pointsToDeduct || 0));
    const updateResult = await _supabase.from('users').update({ points: nextPoints }).eq('id', userId);
    if (updateResult.error) return { data: null, error: updateResult.error };

    return { data: { ...userResult.data, points: nextPoints }, error: null };
}

async function deductUserPointsWithRpc(userId, pointsToDeduct) {
    if (isOfflineTestMode()) return deductUserPointsDirect(userId, pointsToDeduct);

    const { data, error } = await _supabase.rpc('admin_deduct_user_points', {
        p_user_id: userId,
        p_points_to_deduct: pointsToDeduct
    });

    if (!error) {
        const rpcRow = unwrapRpcRow(data);
        if (rpcRow) return { data: rpcRow, error: null };
        const refetch = await _supabase.from('users').select('*').eq('id', userId).maybeSingle();
        return { data: refetch.data || { id: userId }, error: refetch.error };
    }
    if (!isMissingRpcError(error)) return { data: null, error };

    return deductUserPointsDirect(userId, pointsToDeduct);
}

async function renameUserDirect(userId, newUsername) {
    const userResult = await _supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (userResult.error) return { data: null, error: userResult.error };
    if (!userResult.data) return { data: null, error: { message: 'User not found.' } };

    const oldUsername = userResult.data.username;
    const userUpdate = await _supabase.from('users').update({ username: newUsername }).eq('id', userId);
    if (userUpdate.error) return { data: null, error: userUpdate.error };

    const [postsUpdate, commentsUpdate] = await Promise.all([
        _supabase.from('posts').update({ nickname: newUsername }).eq('nickname', oldUsername),
        _supabase.from('comments').update({ nickname: newUsername }).eq('nickname', oldUsername)
    ]);

    if (postsUpdate.error) return { data: { username: newUsername, old_username: oldUsername, sync_error: 'posts' }, error: postsUpdate.error };
    if (commentsUpdate.error) return { data: { username: newUsername, old_username: oldUsername, sync_error: 'comments' }, error: commentsUpdate.error };

    return {
        data: {
            ...userResult.data,
            username: newUsername,
            old_username: oldUsername
        },
        error: null
    };
}

async function renameUserWithRpc(userId, newUsername) {
    if (isOfflineTestMode()) return renameUserDirect(userId, newUsername);

    const { data, error } = await _supabase.rpc('admin_rename_user', {
        p_user_id: userId,
        p_new_username: newUsername
    });

    if (!error) {
        const rpcRow = unwrapRpcRow(data);
        if (rpcRow) return { data: rpcRow, error: null };
        const refetch = await _supabase.from('users').select('*').eq('id', userId).maybeSingle();
        return { data: refetch.data || { id: userId, username: newUsername }, error: refetch.error };
    }
    if (!isMissingRpcError(error)) return { data: null, error };

    return renameUserDirect(userId, newUsername);
}

/* 用途：根据用户积分计算等级名称和对应 CSS 类名。
原理：把积分转成数字后，从高到低匹配等级表；显示语言读取 localStorage.lang，中文返回中文等级名，英文返回英文等级名。
*/
function getLevelInfo(points) {
    const p = Number(points) || 0;
    const lang = localStorage.getItem('lang') || 'zh';

    const levels = [
        { min: 1401, zh: '史诗', en: 'Epic', class: 'lv-epic' },
        { min: 1201, zh: '王者', en: 'King', class: 'lv-king' },
        { min: 1001, zh: '钻石', en: 'Diamond', class: 'lv-diamond' },
        { min: 801, zh: '黄金', en: 'Gold', class: 'lv-gold' },
        { min: 601, zh: '白银', en: 'Silver', class: 'lv-silver' },
        { min: 401, zh: '青铜', en: 'Bronze', class: 'lv-bronze' },
        { min: 201, zh: '黑铁', en: 'Iron', class: 'lv-iron' },
        { min: 0, zh: '原木', en: 'Log', class: 'lv-log' }
    ];

    const level = levels.find(l => p >= l.min);
    return {
        name: lang === 'zh' ? level.zh : level.en,
        class: level.class
    };
}

const MODERATOR_USERNAMES = new Set(['小鱼儿', '小鱼儿小号']);

function isModeratorUsername(username) {
    return MODERATOR_USERNAMES.has(String(username || '').trim());
}

function getModeratorBadgeHTML(username) {
    if (!isModeratorUsername(username)) return '';
    const lang = localStorage.getItem('lang') || 'zh';
    const label = lang === 'zh' ? '管理员' : 'Mod';
    return ` <span class="mod-badge">${label}</span>`;
}
