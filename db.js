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
const { createClient } = supabase;

const SUPABASE_URL = 'https://rptrbdkgryybipbshlkz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdHJiZGtncnl5YmlwYnNobGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzgyODksImV4cCI6MjA4Mzk1NDI4OX0.PXe7ZeN70e86xXxxXUgc0UeDaEBNgRHZmGmc5zyKyRE';

const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 🏆 等级计算逻辑：优化版
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
