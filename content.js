/* content.js */
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
const currentLang = localStorage.getItem('lang') || 'zh';
const TRANS = {
    noId: { zh: "未找到帖子 ID", en: "Post ID not found" },
    alienError: {
        zh: "加载失败，可能帖子被外星人抓走了 🛸",
        en: "Load failed. The post might have been abducted by aliens 🛸"
    },
    noComments: { zh: "暂无评论，快来抢沙发！", en: "No comments yet. Be the first!" },
    loginReq: { zh: "请先登录！", en: "Please login first!" },
    emptyContent: { zh: "内容不能为空", en: "Content cannot be empty" },
    sendFail: { zh: "发送失败 😢", en: "Send failed 😢" },
    // 删除相关的翻译词条
    confirmDelete: { zh: "警告：此操作不可逆！\n你确定要删除这篇帖子吗？", en: "Warning: Irreversible action!\nAre you sure you want to delete this post?" },
    deleteSuccess: { zh: "帖子已彻底删除 💥", en: "Post completely deleted 💥" },
    deleteFail: { zh: "删除失败，可能是权限不足", en: "Delete failed, might be a permission issue" },
    postPhotoAlt: { zh: "帖子附带图片", en: "Attached post image" },
    // 违反网站公约拦截提示
    policyViolation: { zh: "请勿发送违反《网站公约》的内容", en: "Please do not send content that violates the Website Convention" }
};

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// 记录当前正在回复的评论。为 null 时表示发表普通评论；有值时会写入 comments.reply_to。
let replyingToComment = null;
let lastCommentClick = { id: null, time: 0 };
let postPhotoObjectUrl = '';

// 全局变量：用于记录当前帖子的作者名字，供评论区判断 OP 和显示删除按钮使用
let currentPostAuthor = '';

function unwrapCompatRpcRow(data) {
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
}

function unwrapCompatRpcRows(data) {
    if (Array.isArray(data)) return data;
    return data ? [data] : [];
}

async function fetchPublicUserProfileCompat(username) {
    if (typeof fetchPublicUserProfileWithRpc === 'function') {
        return fetchPublicUserProfileWithRpc(username);
    }
    const { data, error } = await _supabase.rpc('get_public_user_profile', {
        p_username: username
    });
    return { data: unwrapCompatRpcRow(data), error };
}

async function fetchPublicUserProfilesCompat() {
    if (typeof fetchPublicUserProfilesWithRpc === 'function') {
        return fetchPublicUserProfilesWithRpc();
    }
    const { data, error } = await _supabase.rpc('list_public_user_profiles');
    return { data: unwrapCompatRpcRows(data), error };
}

async function createCommentCompat(postIdValue, nickname, content, replyTo) {
    if (typeof createCommentWithRpc === 'function') {
        return createCommentWithRpc(postIdValue, nickname, content, replyTo);
    }
    const { data, error } = await _supabase.rpc('create_comment', {
        p_post_id: postIdValue,
        p_nickname: nickname,
        p_content: content,
        p_reply_to: replyTo ?? null
    });
    return { data: unwrapCompatRpcRow(data), error };
}

/* pageshow
用途：处理 iOS/Safari 用浏览器前进/后退恢复详情页时的旧投票状态。
原理：严格浏览器遇到 BFCache 恢复就直接重载详情页；其它浏览器只刷新当前帖子的投票计数，防止用户基于旧 DOM 继续刷票。
*/
window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (window.omgVote && window.omgVote.isStrictBrowser()) {
        window.location.reload();
        return;
    }
    refreshDetailVote();
});

/* getNickStyle 用途：根据传入的物品库数据，返回对应的发帖人特殊昵称 CSS 行内样式（如动态渐变色）。 */
function getNickStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();
    if (inventory['100'] && new Date(inventory['100']) > now) return 'background: linear-gradient(to right, #d20f39, #fe640b, #df8e1d, #40a02b, #04a5e5, #8839ef); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    if (inventory['101'] && new Date(inventory['101']) > now) return 'color: #04a5e5; font-weight: bold;';
    if (inventory['102'] && new Date(inventory['102']) > now) return 'color: #f9e2af; font-weight: bold;';
    return '';
}

/* escapeHTML 用途：防范跨站脚本攻击 (XSS)，将字符串中的敏感字符转换为安全的 HTML 实体。 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* formatRelativeTime
用途：把帖子发布时间转换成相对时间，降低阅读成本。
说明：传入 Supabase 返回的 created_at，返回“刚刚 / 1 分钟前 / 昨天 / 2 天前 / 1 个月前 / 1 年前”等。
原理：用当前时间减去目标时间，按分钟、小时、天、月、年分段取整；英文模式下返回英文相对时间。
注意：这里只负责详情页展示，不参与阅读量、投票、回复等业务状态计算。
*/
function formatRelativeTime(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (currentLang === 'en') {
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

/* toggleNSFW 用途：在用户点击特定的 NSFW 关键词时，切换正文容器(#c)的模糊和解模状态类名。 */
function toggleNSFW(event, element) {
    event.stopPropagation();
    const contentArea = document.getElementById('c');
    const isBlurry = contentArea.classList.contains('blur-content');

    if (isBlurry) {
        contentArea.classList.remove('blur-content');
        contentArea.classList.add('revealed-content');
        element.classList.remove('nsfw-tag');
    } else {
        contentArea.classList.add('blur-content');
        contentArea.classList.remove('revealed-content');
        element.classList.add('nsfw-tag');
    }
}

/* loadPostDetails 用途：页面初始化时抓取帖子详细数据，并处理数据渲染至 DOM（包括渲染特殊标签、作者权限判断、NSFW模糊判断）。 */
async function loadPostDetails() {
    if (!postId) return alert(TRANS.noId[currentLang]);
    try {
        const { data: post, error } = await _supabase.from('posts').select('*').eq('id', postId).single();
        if (error) throw error;

        // 新增：阅读量 +1 逻辑
        const newReads = (post.reads || 0) + 1;
        await _supabase.from('posts').update({ reads: newReads }).eq('id', postId);

        // 核心逻辑：拿到帖子数据后，立刻将作者名字存入全局变量
        currentPostAuthor = post.nickname;

        const { data: author } = await fetchPublicUserProfileCompat(post.nickname);
        const lv = getLevelInfo(author ? author.points : 0);
        const nStyle = getNickStyle(author ? author.inventory : null);

        document.getElementById('t').innerText = post.title;

        const cContainer = document.getElementById('c');
        const contentText = document.getElementById('post-content-text');
        // 修改这里：只替换正文文字容器，并去掉末尾空白，避免用户输入末尾换行把图片顶到很下面。
        const renderedPost = window.omgRender.renderPost((post.content || '').trimEnd());
        contentText.innerHTML = renderedPost.html;

        document.getElementById('info').innerHTML = `👤 <span style="${nStyle}">${escapeHTML(post.nickname)}</span> <span class="lv-badge ${lv.class}">${lv.name}</span>${getModeratorBadgeHTML(post.nickname)} | 📅 ${formatRelativeTime(post.created_at)} | 👀️ ${newReads}`;

        const kwRow = document.getElementById('kw-row');
        let hasNSFW = false;
        if (post.keywords && post.keywords.length > 0) {
            const kwItems = post.keywords.map(kw => {
                if (kw === '#NSFW') {
                    hasNSFW = true;
                    return `<span class="nsfw-tag" onclick="toggleNSFW(event, this)">${kw}</span>`;
                }
                if (kw === '#疑似搬运 Suspected Repost' || kw === '#搬运 Reposted') {
                    return `<span class="repost-tag">${kw}</span>`;
                }
                return `<span>${kw}</span>`;
            });
            kwRow.innerHTML = '关键词：' + kwItems.join('&nbsp;&nbsp;&nbsp;');
            kwRow.style.display = 'block';
        } else {
            kwRow.style.display = 'none';
        }

        // 渲染完标签后，立刻判断正文是否需要模糊
        if (hasNSFW) {
            cContainer.classList.add('blur-content');
        } else {
            cContainer.classList.remove('blur-content');
            cContainer.classList.remove('revealed-content');
        }

        // 处理投票状态显影，列名为 dislike。状态读取统一交给 omgVote，避免不同页面各自解析 localStorage 造成不一致。
        const voteState = window.omgVote.getLocalVoteState(postId);
        applyDetailVoteState({
            likes: post.likes || 0,
            dislike: post.dislike || 0,
            hasLiked: voteState.hasLiked,
            hasDisliked: voteState.hasDisliked
        });

        // 新增逻辑：前端判断如果当前登录用户等于帖子作者，则显示红色的删除按钮
        const currentUser = localStorage.getItem('username');
        if (currentUser && currentUser === currentPostAuthor) {
            document.getElementById('btn-delete-post').style.display = 'block';
        }

        // 帖子和状态完全加载好后，解锁点赞和点踩按钮
        document.getElementById('btn-like').disabled = false;
        document.getElementById('btn-dislike').disabled = false;

        loadPostPhoto();
        loadComments();
    } catch (err) {
        const contentText = document.getElementById('post-content-text') || document.getElementById('c');
        contentText.innerText = TRANS.alienError[currentLang];
    }
}

/* loadPostPhoto
用途：在详情页正文卡片内部加载当前帖子对应的附带图片。
说明：帖子基础信息加载完成后调用；图片文件名固定为 photos/{postId}.webp。
原理：用 Supabase Storage 的 download() 读取 Blob，再转成本页可用的 object URL。这样即使 photos 桶不是 public，只要 Storage policy 允许 anon SELECT，也能显示图片。
*/
async function loadPostPhoto() {
    const photoBox = document.getElementById('post-photo-box');
    const photoImg = document.getElementById('post-photo');
    if (!photoBox || !photoImg || !postId) return;

    // 每次重新加载前先恢复隐藏状态，避免旧帖子图片残留在新的详情页状态里。
    photoBox.style.display = 'none';
    if (postPhotoObjectUrl) {
        URL.revokeObjectURL(postPhotoObjectUrl);
        postPhotoObjectUrl = '';
    }

    try {
        const { data: photoBlob, error } = await _supabase.storage
            .from('photos')
            .download(`${postId}.webp`);

        // 没有图片或没有读取权限时都保持隐藏；控制台保留信息方便调试 Storage policy。
        if (error || !photoBlob) {
            if (error) console.warn("帖子图片加载失败：", error.message);
            return;
        }

        postPhotoObjectUrl = URL.createObjectURL(photoBlob);
        photoImg.src = postPhotoObjectUrl;
        photoImg.alt = TRANS.postPhotoAlt[currentLang];
        photoBox.style.display = 'block';
    } catch (err) {
        console.warn("帖子图片加载异常：", err);
        photoImg.removeAttribute('src');
        photoBox.style.display = 'none';
    }
}

/* applyDetailVoteState
用途：把最新投票状态写回详情页按钮和计数器。
原理：由 omgVote 返回数据库最新计数和本机是否点赞/点踩；这里只负责 DOM 显示，不再自己计算票数。
*/
function applyDetailVoteState(state) {
    const likeSpan = document.getElementById('like-count');
    const dislikeSpan = document.getElementById('dislike-count');
    const voteContainer = document.getElementById('vote-container');

    if (likeSpan) likeSpan.innerText = state.likes;
    if (dislikeSpan) dislikeSpan.innerText = state.dislike;
    if (voteContainer) {
        voteContainer.classList.toggle('is-liked', Boolean(state.hasLiked));
        voteContainer.classList.toggle('is-disliked', Boolean(state.hasDisliked));
    }
}

/* refreshDetailVote
用途：刷新详情页当前帖子的投票状态。
原理：从数据库重新读取当前 likes/dislike，再和 localStorage 的本机投票状态合并显示，专门应对浏览器历史恢复旧 DOM 的情况。
*/
async function refreshDetailVote() {
    if (!postId || !window.omgVote) return;
    try {
        const state = await window.omgVote.refreshPostVote(postId);
        applyDetailVoteState(state);
    } catch (error) {
        console.warn('刷新详情页投票状态失败：', error);
    }
}

/* toggleDetailVote
用途：处理详情页的点赞和点踩操作，含防重复控制、互斥控制及本地存储同步。
原理：调用 omgVote.applyPostVote，让投票前先读取数据库最新票数；这样 iOS/Safari 从浏览器前进/后退恢复旧页面时，也不能拿旧数字继续累加。
*/
async function toggleDetailVote(type) {
    if (window.requireLocalDataConsent && !window.requireLocalDataConsent()) return;
    const buttons = [document.getElementById('btn-like'), document.getElementById('btn-dislike')].filter(Boolean);
    buttons.forEach(button => { button.disabled = true; });

    try {
        const result = await window.omgVote.applyPostVote(postId, type);
        if (result) applyDetailVoteState(result);
    } catch (err) {
        console.error("同步失败", err);
    } finally {
        buttons.forEach(button => { button.disabled = false; });
    }
}

/* getCommentExcerpt
用途：生成回复提示里使用的评论摘要。
说明：传入评论正文，返回前 10 个字符；如果原文超过 10 个字符，则在末尾追加 ...
原理：使用 Array.from 按 Unicode 字符切分，避免 emoji 或部分特殊字符被 substring 拆坏。
*/
function getCommentExcerpt(content) {
    const chars = Array.from(content || '');
    return chars.length > 10 ? `${chars.slice(0, 10).join('')}...` : chars.join('');
}

/* getReplyPlaceholder
用途：根据当前语言生成“正在回复某条评论”的输入框提示文本。
说明：传入评论作者和评论摘要，返回中文或英文 placeholder。
原理：读取 currentLang，中文使用“回复 @作者 的评论 摘要”，英文使用自然的 Reply to @author's comment: excerpt。
*/
function getReplyPlaceholder(nickname, excerpt) {
    if (currentLang === 'en') {
        return `Reply to @${nickname}'s comment: ${excerpt}`;
    }
    return `回复 @${nickname} 的评论 ${excerpt}`;
}

/* getNormalCommentPlaceholder
用途：恢复普通评论模式下的输入框提示文本。
说明：取消回复或发送成功后调用，确保输入框回到当前语言对应的默认提示。
原理：优先读取 HTML 上的 data-zh-ph / data-en-ph，避免默认文案在多个地方重复维护。
*/
function getNormalCommentPlaceholder() {
    const input = document.getElementById('cC');
    return currentLang === 'en' ? input.getAttribute('data-en-ph') : input.getAttribute('data-zh-ph');
}

/* setReplyTarget
用途：在用户点击某条评论后，把评论输入框切换为回复该评论的状态。
说明：评论列表渲染时把评论 id、作者和正文传入；函数会更新全局 reply 状态、提示条和 placeholder。
原理：replyingToComment 保存数据库 comments.id，后续 addCmt 会把它写入 comments.reply_to。
*/
function setReplyTarget(commentId, nickname, content) {
    const excerpt = getCommentExcerpt(content);
    const placeholder = getReplyPlaceholder(nickname, excerpt);
    const input = document.getElementById('cC');

    replyingToComment = String(commentId);
    input.placeholder = placeholder;
    input.focus();
}

/* cancelReply
用途：取消当前回复目标，回到普通发表评论模式。
说明：用户点击“取消”按钮或评论发送成功后调用。
原理：清空 replyingToComment，隐藏回复提示条，并恢复输入框默认 placeholder。
*/
function cancelReply() {
    const input = document.getElementById('cC');

    replyingToComment = null;
    input.placeholder = getNormalCommentPlaceholder();
}

/* handleCommentClick
用途：把“点击评论回复”改成 1 秒内双击同一条评论才触发回复。
说明：评论渲染时绑定到每条评论；第一次点击只记录时间，第二次点击同一评论才调用 setReplyTarget。
原理：用 lastCommentClick 保存上次点击的评论 id 和时间戳，避免单击选择/复制评论文字时误进入回复模式。
*/
function handleCommentClick(commentId, nickname, content) {
    const id = String(commentId);
    const now = Date.now();

    if (lastCommentClick.id === id && now - lastCommentClick.time <= 1000) {
        setReplyTarget(id, nickname, content);
        lastCommentClick = { id: null, time: 0 };
        return;
    }

    lastCommentClick = { id, time: now };
}

/* buildCommentTree
用途：把数据库返回的平铺评论数组转换成 Reddit 风格的多级评论树。
原理：先用 comments.id 建立 Map，再把 reply_to 指向已有父评论的节点挂到父节点 children；找不到父评论的坏数据会退回根评论，避免内容丢失。
*/
function buildCommentTree(comments) {
    const nodeMap = new Map();
    const roots = [];

    comments.forEach(comment => {
        nodeMap.set(String(comment.id), { comment, children: [] });
    });

    comments.forEach(comment => {
        const node = nodeMap.get(String(comment.id));
        const parentId = comment.reply_to === null || comment.reply_to === undefined ? '' : String(comment.reply_to);
        const parentNode = parentId ? nodeMap.get(parentId) : null;

        if (parentNode && parentNode !== node) {
            parentNode.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

/* renderCommentNode
用途：递归渲染单条评论以及它下面的所有回复。
原理：每个节点外层使用 .cmt-thread，子回复放进 .cmt-children；CSS 给 .cmt-children 画左侧竖线，因此层级可以无限向下延伸。
*/
function renderCommentNode(node, userMap, depth = 0) {
    const c = node.comment;
    const u = userMap[c.nickname];
    const clv = getLevelInfo(u ? u.points : 0);
    const cnStyle = getNickStyle(u ? u.inventory : null);
    const isOP = c.nickname === currentPostAuthor;
    const opBadgeHtml = isOP ? `<span class="op-badge">[OP]</span>` : '';
    const safeId = encodeURIComponent(String(c.id));
    const safeNickname = encodeURIComponent(c.nickname || '');
    const safeContent = encodeURIComponent(c.content || '');
    const replyAttr = c.reply_to ? ` data-reply-to="${escapeHTML(String(c.reply_to))}"` : '';
    const childrenHtml = node.children.map(child => renderCommentNode(child, userMap, depth + 1)).join('');

    return `<div class="cmt-thread" data-depth="${depth}">
        <div class="cmt-item" data-comment-id="${escapeHTML(String(c.id))}"${replyAttr} onclick="handleCommentClick(decodeURIComponent('${safeId}'), decodeURIComponent('${safeNickname}'), decodeURIComponent('${safeContent}'))">
            <div class="cmt-content"><b><span style="${cnStyle}">${escapeHTML(c.nickname)}</span>${opBadgeHtml} <span class="lv-badge ${clv.class}">${clv.name}</span>${getModeratorBadgeHTML(c.nickname)}:</b> ${window.omgRender.renderCustomOnly(c.content)}</div>
        </div>
        ${childrenHtml ? `<div class="cmt-children">${childrenHtml}</div>` : ''}
    </div>`;
}

/* renderCommentTree
用途：生成整棵评论树的 HTML。
原理：根评论保持数据库创建时间顺序；每个父评论的 children 也保持原数组顺序，所以回复会自然显示在对应父评论下面。
*/
function renderCommentTree(comments, userMap) {
    return buildCommentTree(comments)
        .map(node => renderCommentNode(node, userMap))
        .join('');
}

/* loadComments 用途：负责拉取并渲染本帖的评论列表，对发言人的等级、特效以及是否为楼主 OP 进行对应组装。 */
async function loadComments() {
    try {
        const { data: cmts } = await _supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
        const { data: users } = await fetchPublicUserProfilesCompat();
        const userMap = (users || []).reduce((acc, u) => {
            acc[u.username] = u;
            return acc;
        }, {});
        const comments = cmts || [];
        const cmtList = document.getElementById('cmt-list');
        cmtList.innerHTML = comments.length
            ? renderCommentTree(comments, userMap)
            : `<p style="color:#888">${TRANS.noComments[currentLang]}</p>`;
    } catch (err) {
        console.error("加载失败", err);
    }
}

/* addCmt 用途：响应用户的发评操作，执行数据插入，并发放积分奖励然后刷新列表。 */
async function addCmt() {
    const nick = localStorage.getItem('username');
    if (!nick) {
        alert(TRANS.loginReq[currentLang]);
        window.location.href = 'index.html'; // 如果之前重命名为 signIn.html，请在这里同步修改哦
        return;
    }
    const content = document.getElementById('cC').value.trim();
    if (!content) return alert(TRANS.emptyContent[currentLang]);

    // 规则 1：包含脏话（利用正则表达式 /i 忽略大小写匹配英文，同时包含中文违禁词）
    const containsBadWords = /sb|傻逼|屎|垃圾|idiot|fuck/i.test(content);

    // 规则 2：完全等于无意义水帖词汇
    const exactMatchWords = ['沙发', '板凳', '地板', '地缝', '下水道', '已阅', '666'];
    const isWaterPost = exactMatchWords.includes(content);

    // 如果触发上述任一规则，拦截发送
    if (containsBadWords || isWaterPost) {
        alert(TRANS.policyViolation[currentLang]);
        return;
    }

    // 锁定按钮，防止重复点击
    const sendBtn = document.querySelector('.btn-send');
    const originalText = sendBtn.innerText;
    sendBtn.disabled = true;
    sendBtn.innerText = currentLang === 'zh' ? "发送中..." : "Sending...";

    const { data: commentResult, error } = await createCommentCompat(postId, nick, content, replyingToComment);
    if (error) {
        alert(TRANS.sendFail[currentLang]);
        // 解除锁定并恢复按钮文字
        sendBtn.disabled = false;
        sendBtn.innerText = originalText;
    } else {
        if (commentResult && commentResult.user_points !== undefined) {
            localStorage.setItem('userPoints', String(commentResult.user_points));
        }
        document.getElementById('cC').value = "";
        cancelReply();
        loadComments();

        // 解除锁定并恢复按钮文字
        sendBtn.disabled = false;
        sendBtn.innerText = originalText;
    }
}

/* deletePost 用途：执行删帖逻辑，需经用户确认，删除成功后强制跳转回广场主页。 */
async function deletePost() {
    // 弹出确认框防误触
    if (!confirm(TRANS.confirmDelete[currentLang])) {
        return;
    }

    try {
        // 如果帖子带了同名图片，删帖时一起尝试清理；清理失败不阻止删帖本身。
        const { error: photoErr } = await _supabase.storage.from('photos').remove([`${postId}.webp`]);
        if (photoErr) console.warn("图片删除失败或不存在：", photoErr);

        // 请求 Supabase 删除对应的这行数据
        const { error } = await _supabase.from('posts').delete().eq('id', postId);

        if (error) throw error;

        alert(TRANS.deleteSuccess[currentLang]);

        // 删除成功后强行滚回广场页，不留在这个变成空壳的详情页
        window.location.href = 'index.html';
    } catch (err) {
        console.error("删除报错信息：", err);
        alert(TRANS.deleteFail[currentLang]);
    }
}

loadPostDetails();
