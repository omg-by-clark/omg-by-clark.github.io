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

/* getNickStyle 用法：根据传入的物品库数据，返回对应的发帖人特殊昵称 CSS 行内样式（如动态渐变色）。 */
function getNickStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();
    if (inventory['100'] && new Date(inventory['100']) > now) return 'background: linear-gradient(to right, #d20f39, #fe640b, #df8e1d, #40a02b, #04a5e5, #8839ef); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    if (inventory['101'] && new Date(inventory['101']) > now) return 'color: #04a5e5; font-weight: bold;';
    if (inventory['102'] && new Date(inventory['102']) > now) return 'color: #f9e2af; font-weight: bold;';
    return '';
}

/* escapeHTML 用法：防范跨站脚本攻击 (XSS)，将字符串中的敏感字符转换为安全的 HTML 实体。 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* formatRelativeTime
用途：把帖子发布时间转换成相对时间，降低阅读成本。
用法：传入 Supabase 返回的 created_at，返回“刚刚 / 1 分钟前 / 昨天 / 2 天前 / 1 个月前 / 1 年前”等。
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

/* parseCustomCommands
用途：解析帖子正文中的自定义排版指令。
用法：传入经过转义的 HTML 字符串，使用正则表达式将特定的指令替换为对应的 HTML 标签。
原理：匹配 \ / . 符号，支持双符号转义，并采用单层括号非贪婪匹配以完美支持如 .code[.b[]] 的嵌套场景。
*/
function parseCustomCommands(text) {
    if (!text) return '';
    let parsed = text;

    // 1. ([\\/\.]) 匹配前缀 \ 或 / 或 .
    // 2. (\1)? 匹配是否有重复的前缀（用于转义，如 //）
    // 3. (link|b|code|subt) 匹配指令名称（移除了 extrab 和 end）
    // 4. \[((?:[^\[\]]|\[[^\]]*\])*?)\] 匹配方括号及内部内容，支持单层方括号嵌套，避免遗漏右括号
    // 5. (?:\((.*?)\))? 匹配可选的圆括号及链接
    const regex = /([\\/\.])(\1)?(link|b|code|subt)\[((?:[^\[\]]|\[[^\]]*\])*?)\](?:\((.*?)\))?/g;

    parsed = parsed.replace(regex, function (match, p1, p2, command, innerText, url) {
        // 如果存在两个连续的指令符号（如 //b[] 或 ..code[]），说明是转义，直接取消指令解析，返回单符号普通文本
        if (p2) {
            const safeUrl = url ? `(${url})` : '';
            return `${p1}${command}[${innerText}]${safeUrl}`;
        }

        if (command === 'link') {
            if (innerText === '' && !url) return match;
            const safeUrl = url ? url : '';
            return `<a href="${safeUrl}" style="color: var(--repost-color); text-decoration: none;">${innerText}</a>`;
        } else if (command === 'b') {
            return `<span style="font-weight: bold;">${innerText}</span>`;
        } else if (command === 'code') {
            return `<span style="font-family: 'Google Sans Code', Consolas, monospace;">${innerText}</span>`;
        } else if (command === 'subt') {
            return `<span style="display: block; font-size: 1.17em; font-weight: bold; margin: 1em 0;">${innerText}</span>`;
        }
        return match;
    });

    return parsed;
}

/* toggleNSFW 用法：在用户点击特定的 NSFW 关键词时，切换正文容器(#c)的模糊和解模状态类名。 */
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

/* loadPostDetails 用法：页面初始化时抓取帖子详细数据，并处理数据渲染至 DOM（包括渲染特殊标签、作者权限判断、NSFW模糊判断）。 */
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

        const { data: author } = await _supabase.from('users').select('points, inventory').eq('username', post.nickname).maybeSingle();
        const lv = getLevelInfo(author ? author.points : 0);
        const nStyle = getNickStyle(author ? author.inventory : null);

        document.getElementById('t').innerText = post.title;

        const cContainer = document.getElementById('c');
        const contentText = document.getElementById('post-content-text');
        // 修改这里：只替换正文文字容器，并去掉末尾空白，避免用户输入末尾换行把图片顶到很下面。
        contentText.innerHTML = parseCustomCommands(escapeHTML((post.content || '').trimEnd()));

        document.getElementById('info').innerHTML = `👤 <span style="${nStyle}">${escapeHTML(post.nickname)}</span> <span class="lv-badge ${lv.class}">${lv.name}</span> | 📅 ${formatRelativeTime(post.created_at)} | 👀️ ${newReads}`;

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

        // 处理投票状态显影，列名为 dislike
        const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
        const dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

        document.getElementById('like-count').innerText = post.likes || 0;
        document.getElementById('dislike-count').innerText = post.dislike || 0;

        // 更新逻辑：检查状态并设置容器颜色
        const voteContainer = document.getElementById('vote-container');
        if (likedPosts.includes(Number(postId)) || likedPosts.includes(String(postId))) {
            voteContainer.classList.add('is-liked');
        }
        if (dislikedPosts.includes(Number(postId)) || dislikedPosts.includes(String(postId))) {
            voteContainer.classList.add('is-disliked');
        }

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
用法：帖子基础信息加载完成后调用；图片文件名固定为 photos/{postId}.webp。
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

/* toggleDetailVote 用法：处理详情页的点赞和点踩操作，含防重复控制、互斥控制及本地存储同步。 */
async function toggleDetailVote(type) {
    const likeSpan = document.getElementById('like-count');
    const dislikeSpan = document.getElementById('dislike-count');
    const voteContainer = document.getElementById('vote-container'); // 获取容器

    let likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    let dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');
    const pIdStr = String(postId);

    let likes = parseInt(likeSpan.innerText);
    let dislike = parseInt(dislikeSpan.innerText);

    if (type === 'like') {
        if (likedPosts.includes(pIdStr) || likedPosts.includes(Number(pIdStr))) {
            // 取消赞
            likes--;
            likedPosts = likedPosts.filter(id => String(id) !== pIdStr);
            voteContainer.classList.remove('is-liked'); // 恢复颜色
        } else {
            // 点赞
            likes++;
            likedPosts.push(Number(postId));
            voteContainer.classList.add('is-liked'); // 变红
            // 互斥：取消踩
            if (dislikedPosts.includes(pIdStr) || dislikedPosts.includes(Number(pIdStr))) {
                dislike--;
                dislikedPosts = dislikedPosts.filter(id => String(id) !== pIdStr);
                voteContainer.classList.remove('is-disliked');
                dislikeSpan.innerText = dislike;
            }
        }
        likeSpan.innerText = likes;
    } else {
        if (dislikedPosts.includes(pIdStr) || dislikedPosts.includes(Number(pIdStr))) {
            // 取消踩
            dislike--;
            dislikedPosts = dislikedPosts.filter(id => String(id) !== pIdStr);
            voteContainer.classList.remove('is-disliked'); // 恢复颜色
        } else {
            // 点踩
            dislike++;
            dislikedPosts.push(Number(postId));
            voteContainer.classList.add('is-disliked'); // 变蓝紫
            // 互斥：取消赞
            if (likedPosts.includes(pIdStr) || likedPosts.includes(Number(pIdStr))) {
                likes--;
                likedPosts = likedPosts.filter(id => String(id) !== pIdStr);
                voteContainer.classList.remove('is-liked');
                likeSpan.innerText = likes;
            }
        }
        dislikeSpan.innerText = dislike;
    }

    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
    localStorage.setItem('dislikedPosts', JSON.stringify(dislikedPosts));

    try {
        await _supabase.from('posts').update({ likes, dislike }).eq('id', postId);
    } catch (err) {
        console.error("同步失败", err);
    }
}

/* getCommentExcerpt
用途：生成回复提示里使用的评论摘要。
用法：传入评论正文，返回前 10 个字符；如果原文超过 10 个字符，则在末尾追加 ...
原理：使用 Array.from 按 Unicode 字符切分，避免 emoji 或部分特殊字符被 substring 拆坏。
*/
function getCommentExcerpt(content) {
    const chars = Array.from(content || '');
    return chars.length > 10 ? `${chars.slice(0, 10).join('')}...` : chars.join('');
}

/* getReplyPlaceholder
用途：根据当前语言生成“正在回复某条评论”的输入框提示文本。
用法：传入评论作者和评论摘要，返回中文或英文 placeholder。
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
用法：取消回复或发送成功后调用，确保输入框回到当前语言对应的默认提示。
原理：优先读取 HTML 上的 data-zh-ph / data-en-ph，避免默认文案在多个地方重复维护。
*/
function getNormalCommentPlaceholder() {
    const input = document.getElementById('cC');
    return currentLang === 'en' ? input.getAttribute('data-en-ph') : input.getAttribute('data-zh-ph');
}

/* setReplyTarget
用途：在用户点击某条评论后，把评论输入框切换为回复该评论的状态。
用法：评论列表渲染时把评论 id、作者和正文传入；函数会更新全局 reply 状态、提示条和 placeholder。
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
用法：用户点击“取消”按钮或评论发送成功后调用。
原理：清空 replyingToComment，隐藏回复提示条，并恢复输入框默认 placeholder。
*/
function cancelReply() {
    const input = document.getElementById('cC');

    replyingToComment = null;
    input.placeholder = getNormalCommentPlaceholder();
}

/* handleCommentClick
用途：把“点击评论回复”改成 1 秒内双击同一条评论才触发回复。
用法：评论渲染时绑定到每条评论；第一次点击只记录时间，第二次点击同一评论才调用 setReplyTarget。
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

/* ensureReplyArrowStyles
用途：用 JS 注入回复箭头需要的样式，避免修改 content.html。
用法：loadComments 渲染评论前调用一次。
原理：让评论列表成为定位上下文，SVG 箭头层绝对定位覆盖列表区域，且 pointer-events 为 none，不影响复制文字。
*/
function ensureReplyArrowStyles() {
    if (document.getElementById('reply-arrow-style')) return;

    const style = document.createElement('style');
    style.id = 'reply-arrow-style';
    style.textContent = `
        #cmt-list {
            position: relative;
        }
        .cmt-item {
            position: relative;
            z-index: 1;
        }
        .reply-arrow-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
            pointer-events: none;
            z-index: 2;
        }
    `;
    document.head.appendChild(style);
}

/* drawReplyArrows
用途：为所有回复评论绘制从“被回复评论”左侧到“回复评论”左侧的折线圆角箭头。
用法：loadComments 渲染评论 DOM 后调用；窗口尺寸变化时也重新调用。
原理：先从原评论左侧水平转出 1vw，再用 2px 圆角转为竖线，到回复评论左侧高度后再用 2px 圆角转回去。多个箭头回复同一条评论时，每条线向外错开 4px。
*/
function drawReplyArrows() {
    const cmtList = document.getElementById('cmt-list');
    if (!cmtList) return;

    // 每次重画前先删掉旧的 SVG。评论区会在新增评论、刷新评论、窗口 resize 时重新布局，
    // 如果不清理旧图层，箭头会重复叠加，而且旧坐标也会和新布局错位。
    cmtList.querySelector('.reply-arrow-layer')?.remove();

    // 只有带 data-reply-to 的评论才需要画线；普通评论保持原本显示方式。
    const replyItems = Array.from(cmtList.querySelectorAll('.cmt-item[data-reply-to]'));
    if (replyItems.length === 0) return;

    // 后面所有点位都换算到 cmt-list 这个局部坐标系里。
    // 这样 SVG 的 viewBox 和评论列表尺寸一致，页面滚动位置不会影响箭头计算。
    const listRect = cmtList.getBoundingClientRect();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('reply-arrow-layer');
    svg.setAttribute('viewBox', `0 0 ${listRect.width} ${listRect.height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    // laneCounts 用来给“同一个被回复评论”的多条箭头分配不同轨道。
    // 例如 A 被 B、C 同时回复，B 的线走第 0 条轨道，C 的线向外偏 4px，
    // 避免两条竖线完全重叠在一起看不清。
    const laneCounts = new Map();

    replyItems.forEach(replyItem => {
        // reply_to 来自数据库，最终会变成 CSS 属性选择器的一部分，所以先转义。
        // 现代浏览器用 CSS.escape；如果没有，就至少转义引号和反斜杠。
        const escapedReplyTo = window.CSS && CSS.escape
            ? CSS.escape(replyItem.dataset.replyTo)
            : replyItem.dataset.replyTo.replace(/["\\]/g, '\\$&');
        const targetItem = cmtList.querySelector(`.cmt-item[data-comment-id="${escapedReplyTo}"]`);
        if (!targetItem) return;

        // start 是“被回复评论”的左侧中点，end 是“当前回复评论”的左侧中点。
        // 用左侧中点能让箭头像从评论框边缘长出来，而不是从文字中间穿过去。
        const targetRect = targetItem.getBoundingClientRect();
        const replyRect = replyItem.getBoundingClientRect();
        const startX = targetRect.left - listRect.left;
        const startY = targetRect.top - listRect.top + targetRect.height / 2;
        const endX = replyRect.left - listRect.left;
        const endY = replyRect.top - listRect.top + replyRect.height / 2;

        // 计算当前箭头是这个目标评论的第几条轨道，并立刻递增计数。
        const laneIndex = laneCounts.get(replyItem.dataset.replyTo) || 0;
        laneCounts.set(replyItem.dataset.replyTo, laneIndex + 1);

        // laneX 是箭头竖线所在的 x 坐标：
        // 先离评论框左边 1vw，再按轨道序号每条向外错开 4px。
        const laneX = Math.min(startX, endX) - window.innerWidth * 0.01 - laneIndex * 4;

        // 如果回复评论在目标评论下方，竖向方向为 1；在上方则为 -1。
        // 这让同一套圆角公式能同时处理向下和向上的回复线。
        const verticalDirection = endY >= startY ? 1 : -1;

        // 圆角半径理论上是 2px，但当两个评论很近，或横向空间不够时，
        // 半径需要自动缩小，避免圆角超过线段长度导致路径反折。
        const horizontalRadius = Math.min(Math.abs(startX - laneX), Math.abs(endX - laneX));
        const verticalRadius = Math.abs(endY - startY) / 2;
        const cornerRadius = Math.max(0, Math.min(2, horizontalRadius, verticalRadius));

        // 两个圆角都是二次贝塞尔 Q：
        // 第一个把“横向转出”弯成竖线，第二个把竖线弯回评论框左侧。
        const firstCornerX = laneX + cornerRadius;
        const firstCornerY = startY + verticalDirection * cornerRadius;
        const secondCornerY = endY - verticalDirection * cornerRadius;
        const secondCornerX = laneX + cornerRadius;

        // 路径结构：
        // M 起点 -> L 横向出框 -> Q 第一个 90° 圆角 -> L 竖线
        // -> Q 第二个 90° 圆角 -> L 横向进入回复评论框。
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', [
            `M ${startX} ${startY}`,
            `L ${firstCornerX} ${startY}`,
            `Q ${laneX} ${startY} ${laneX} ${firstCornerY}`,
            `L ${laneX} ${secondCornerY}`,
            `Q ${laneX} ${endY} ${secondCornerX} ${endY}`,
            `L ${endX} ${endY}`
        ].join(' '));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'var(--brand)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('opacity', '0.8');
        svg.appendChild(path);

        // 箭头头部不用 marker，而是手动画一个三角形。
        // 最后一段线是水平进入评论框，所以角度只看 endX 和第二个圆角出口的左右关系。
        const angle = Math.atan2(0, endX - secondCornerX);
        const arrowLength = 10;
        const arrowWidth = 5;
        const baseX = endX - Math.cos(angle) * arrowLength;
        const baseY = endY - Math.sin(angle) * arrowLength;

        // normal 是箭头方向的垂直向量，用来算三角形底边的上下两个点。
        const normalX = Math.cos(angle + Math.PI / 2);
        const normalY = Math.sin(angle + Math.PI / 2);

        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowHead.setAttribute('d', [
            `M ${endX} ${endY}`,
            `L ${baseX + normalX * arrowWidth} ${baseY + normalY * arrowWidth}`,
            `L ${baseX - normalX * arrowWidth} ${baseY - normalY * arrowWidth}`,
            'Z'
        ].join(' '));
        arrowHead.setAttribute('fill', 'var(--brand)');
        svg.appendChild(arrowHead);
    });

    cmtList.prepend(svg);
}

window.addEventListener('resize', () => {
    requestAnimationFrame(drawReplyArrows);
});

/* loadComments 用法：负责拉取并渲染本帖的评论列表，对发言人的等级、特效以及是否为楼主 OP 进行对应组装。 */
async function loadComments() {
    try {
        ensureReplyArrowStyles();
        const { data: cmts } = await _supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
        const { data: users } = await _supabase.from('users').select('username, points, inventory');
        const userMap = (users || []).reduce((acc, u) => {
            acc[u.username] = u;
            return acc;
        }, {});
        const comments = cmts || [];
        const cmtList = document.getElementById('cmt-list');
        cmtList.innerHTML = comments.map(c => {
            const u = userMap[c.nickname];
            const clv = getLevelInfo(u ? u.points : 0);
            const cnStyle = getNickStyle(u ? u.inventory : null);

            // 验证：检查当前渲染的评论作者是否等于帖子的作者，如果是，则生成 OP 标签
            const isOP = c.nickname === currentPostAuthor;
            const opBadgeHtml = isOP ? `<span class="op-badge">[OP]</span>` : '';

            // 在等级标签 ${clv.name} 的左侧插入 ${opBadgeHtml}
            // 修改这里：给评论内容也加上解析功能；1 秒内双击同一条评论才进入回复该评论的状态。
            const safeId = encodeURIComponent(String(c.id));
            const safeNickname = encodeURIComponent(c.nickname || '');
            const safeContent = encodeURIComponent(c.content || '');
            const replyAttr = c.reply_to ? ` data-reply-to="${escapeHTML(String(c.reply_to))}"` : '';
            return `<div class="cmt-item" data-comment-id="${escapeHTML(String(c.id))}"${replyAttr} onclick="handleCommentClick(decodeURIComponent('${safeId}'), decodeURIComponent('${safeNickname}'), decodeURIComponent('${safeContent}'))"><div class="cmt-content"><b><span style="${cnStyle}">${escapeHTML(c.nickname)}</span>${opBadgeHtml} <span class="lv-badge ${clv.class}">${clv.name}</span>:</b> ${parseCustomCommands(escapeHTML(c.content))}</div></div>`;
        }).join('') || `<p style="color:#888">${TRANS.noComments[currentLang]}</p>`;
        requestAnimationFrame(drawReplyArrows);
    } catch (err) {
        console.error("加载失败", err);
    }
}

/* addCmt 用法：响应用户的发评操作，执行数据插入，并发放积分奖励然后刷新列表。 */
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

    const newComment = { post_id: postId, nickname: nick, content: content };
    if (replyingToComment !== null) {
        newComment.reply_to = replyingToComment;
    }

    const { error } = await _supabase.from('comments').insert([newComment]);
    if (error) {
        alert(TRANS.sendFail[currentLang]);
        // 解除锁定并恢复按钮文字
        sendBtn.disabled = false;
        sendBtn.innerText = originalText;
    } else {
        const { data: user } = await _supabase.from('users').select('points').eq('username', nick).maybeSingle();
        const newPoints = (user ? user.points : 0) + 5;
        await _supabase.from('users').update({ points: newPoints }).eq('username', nick);
        localStorage.setItem('userPoints', newPoints);
        document.getElementById('cC').value = "";
        cancelReply();
        loadComments();

        // 解除锁定并恢复按钮文字
        sendBtn.disabled = false;
        sendBtn.innerText = originalText;
    }
}

/* deletePost 用法：执行删帖逻辑，需经用户确认，删除成功后强制跳转回广场主页。 */
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
