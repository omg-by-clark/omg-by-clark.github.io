/* omg-vote.js */
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

/* omgVote
用途：统一处理帖子点赞/点踩，堵住 Safari/iOS 前进后退缓存导致的重复刷票。
原理：投票前不信任页面上旧的 DOM 数字，而是先从 Supabase 读取当前帖子最新 likes/dislike；再结合 localStorage 中的本机投票状态计算增减，最后写回数据库并同步页面。
*/
window.omgVote = (function () {
    const voteLocks = new Set();

    function readVoteArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value.map(item => String(item)) : [];
        } catch (error) {
            return [];
        }
    }

    function writeVoteArray(key, values) {
        const uniqueValues = [...new Set(values.map(item => String(item)))];
        localStorage.setItem(key, JSON.stringify(uniqueValues));
    }

    function getLocalVoteState(postId) {
        const postIdStr = String(postId);
        const likedPosts = readVoteArray('likedPosts');
        const dislikedPosts = readVoteArray('dislikedPosts');
        return {
            likedPosts,
            dislikedPosts,
            hasLiked: likedPosts.includes(postIdStr),
            hasDisliked: dislikedPosts.includes(postIdStr)
        };
    }

    function saveLocalVoteState(postId, nextState) {
        const postIdStr = String(postId);
        let likedPosts = readVoteArray('likedPosts').filter(id => id !== postIdStr);
        let dislikedPosts = readVoteArray('dislikedPosts').filter(id => id !== postIdStr);

        if (nextState === 'like') likedPosts.push(postIdStr);
        if (nextState === 'dislike') dislikedPosts.push(postIdStr);

        writeVoteArray('likedPosts', likedPosts);
        writeVoteArray('dislikedPosts', dislikedPosts);
    }

    async function fetchPostVoteCounts(postId) {
        const { data, error } = await _supabase
            .from('posts')
            .select('id, likes, dislike')
            .eq('id', postId)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Post not found');

        return {
            likes: Number(data.likes) || 0,
            dislike: Number(data.dislike) || 0
        };
    }

    function calculateVote(postId, type, counts) {
        const state = getLocalVoteState(postId);
        let likes = counts.likes;
        let dislike = counts.dislike;
        let nextState = 'none';

        if (type === 'like') {
            if (state.hasLiked) {
                likes = Math.max(0, likes - 1);
            } else {
                likes += 1;
                nextState = 'like';
                if (state.hasDisliked) dislike = Math.max(0, dislike - 1);
            }
        } else if (type === 'dislike') {
            if (state.hasDisliked) {
                dislike = Math.max(0, dislike - 1);
            } else {
                dislike += 1;
                nextState = 'dislike';
                if (state.hasLiked) likes = Math.max(0, likes - 1);
            }
        }

        return { likes, dislike, nextState };
    }

    /* applyPostVote
    用途：执行一次受保护的点赞/点踩。
    原理：同一帖子同一时间只允许一个投票请求；请求会先拉数据库最新票数再计算，避免 iOS/Safari 从 BFCache 恢复旧页面后拿旧数字继续累加。
    */
    async function applyPostVote(postId, type) {
        const lockKey = String(postId);
        if (voteLocks.has(lockKey)) return null;
        voteLocks.add(lockKey);

        try {
            const freshCounts = await fetchPostVoteCounts(postId);
            const result = calculateVote(postId, type, freshCounts);
            const { error } = await _supabase
                .from('posts')
                .update({ likes: result.likes, dislike: result.dislike })
                .eq('id', postId);

            if (error) throw error;

            saveLocalVoteState(postId, result.nextState);
            return {
                postId,
                likes: result.likes,
                dislike: result.dislike,
                ...getLocalVoteState(postId)
            };
        } finally {
            voteLocks.delete(lockKey);
        }
    }

    async function refreshPostVote(postId) {
        const counts = await fetchPostVoteCounts(postId);
        return {
            postId,
            ...counts,
            ...getLocalVoteState(postId)
        };
    }

    function isStrictBrowser() {
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
        return isIOS || isSafari;
    }

    return {
        applyPostVote,
        refreshPostVote,
        getLocalVoteState,
        isStrictBrowser
    };
})();
