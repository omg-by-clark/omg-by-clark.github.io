/*
    Game-site Supabase client.
    This database is separate from the main posting database in ../db.js.
*/
const GAME_SUPABASE_URL = 'https://tncstaoinrvcwpncjier.supabase.co';
const GAME_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuY3N0YW9pbnJ2Y3dwbmNqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjYzNjYsImV4cCI6MjA5NjMwMjM2Nn0.D1ZixKRIb1KUXq3DcUByBFlbxDeiAZtpo-u10fVFI5o';

const _gameSupabase = supabase.createClient(GAME_SUPABASE_URL, GAME_SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

function getGameUsername() {
    return localStorage.getItem('username') || '';
}

function getUTCNow() {
    return new Date().toISOString();
}

function makeStableGameUserId(username) {
    let hash = 1469598103934665603n;
    const text = unescape(encodeURIComponent(username || 'anonymous'));
    for (let i = 0; i < text.length; i++) {
        hash ^= BigInt(text.charCodeAt(i));
        hash *= 1099511628211n;
    }
    return (hash % 9007199254740991n).toString();
}

async function getGameUserId(username) {
    const cachedId = localStorage.getItem('game_user_id');
    if (cachedId) return cachedId;

    const id = makeStableGameUserId(username);
    localStorage.setItem('game_user_id', id);
    return id;
}

function normalizeGameKey(game) {
    return String(game?.['stats-key'] || game?.path || game || 'unknown')
        .replace(/^code\//, '')
        .replace(/\/index\.html$|\/low\.html$|\.html$/g, '')
        .replace(/[^\w.-]+/g, '_');
}

function getLocalStatsKey(username) {
    return `omg-games-play-info:${username || 'anonymous'}`;
}

function getPendingStatsKey(username) {
    return `omg-games-pending-stats:${username || 'anonymous'}`;
}

function readJSON(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return value && typeof value === 'object' ? value : fallback;
    } catch (error) {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getLocalPlayInfo(username = getGameUsername()) {
    return readJSON(getLocalStatsKey(username), {});
}

function setLocalPlayInfo(playInfo, username = getGameUsername()) {
    writeJSON(getLocalStatsKey(username), playInfo || {});
}

function getPendingStatsCount(username = getGameUsername()) {
    return Number(localStorage.getItem(getPendingStatsKey(username))) || 0;
}

function setPendingStatsCount(count, username = getGameUsername()) {
    localStorage.setItem(getPendingStatsKey(username), String(Math.max(0, Number(count) || 0)));
}

function mergeOneGameStats(remoteStats = {}, localStats = {}) {
    return {
        ...remoteStats,
        ...localStats,
        plays: Math.max(Number(remoteStats.plays) || 0, Number(localStats.plays) || 0),
        total_seconds: Math.max(Number(remoteStats.total_seconds) || 0, Number(localStats.total_seconds) || 0),
        wins: Math.max(Number(remoteStats.wins) || 0, Number(localStats.wins) || 0),
        best_score: Math.max(Number(remoteStats.best_score) || 0, Number(localStats.best_score) || 0),
        last_score: localStats.last_score ?? remoteStats.last_score,
        last_played_at: [remoteStats.last_played_at, localStats.last_played_at].filter(Boolean).sort().pop()
    };
}

function mergePlayInfo(remotePlayInfo = {}, localPlayInfo = {}) {
    const merged = { ...remotePlayInfo };
    Object.entries(localPlayInfo || {}).forEach(([gameKey, localStats]) => {
        const remoteStats = merged[gameKey] && typeof merged[gameKey] === 'object' ? merged[gameKey] : {};
        merged[gameKey] = mergeOneGameStats(remoteStats, localStats);
    });
    return merged;
}

async function fetchGameUser(identity) {
    const { data, error } = await _gameSupabase
        .from('game_users')
        .select('id,created_at,last_play,name,play_info')
        .eq('id', identity.id)
        .maybeSingle();

    if (error) throw error;
    if (data) return data;

    const { data: nameData, error: nameError } = await _gameSupabase
        .from('game_users')
        .select('id,created_at,last_play,name,play_info')
        .eq('name', identity.username)
        .maybeSingle();

    if (nameError) throw nameError;
    return nameData || null;
}

async function createGameUser(identity, now = getUTCNow()) {
    const payload = {
        id: identity.id,
        created_at: now,
        last_play: now,
        name: identity.username,
        play_info: {}
    };

    const { data, error } = await _gameSupabase
        .from('game_users')
        .insert(payload)
        .select('id,created_at,last_play,name,play_info')
        .single();

    if (error) throw error;
    return data;
}

async function ensureGameUser(identity, now = getUTCNow(), options = {}) {
    const row = await fetchGameUser(identity);
    if (row) return row;
    options.onCreateStart?.();
    return createGameUser(identity, now);
}

async function saveGameUser(identity, playInfo, now) {
    const payload = {
        id: identity.id,
        name: identity.username,
        last_play: now,
        play_info: playInfo
    };

    const { error } = await _gameSupabase
        .from('game_users')
        .upsert(payload, {
            onConflict: 'id'
        });

    if (error) throw error;
}

async function syncLocalGameStats(options = {}) {
    const username = getGameUsername();
    if (!username) return { skipped: true, reason: 'not-signed-in' };

    const identity = {
        username,
        id: await getGameUserId(username)
    };
    const now = getUTCNow();
    const row = await ensureGameUser(identity, now, options);
    if (row?.id) identity.id = String(row.id);

    const remotePlayInfo = row?.play_info && typeof row.play_info === 'object' ? row.play_info : {};
    const mergedPlayInfo = mergePlayInfo(remotePlayInfo, getLocalPlayInfo(username));
    await saveGameUser(identity, mergedPlayInfo, now);
    setLocalPlayInfo(mergedPlayInfo, username);
    setPendingStatsCount(0, username);
    return { skipped: false, play_info: mergedPlayInfo };
}

async function updateGameUserStats(game, event = {}) {
    const username = getGameUsername();
    if (!username) return { skipped: true, reason: 'not-signed-in' };
    const now = getUTCNow();
    const gameKey = normalizeGameKey(game);
    const playInfo = getLocalPlayInfo(username);
    const previous = playInfo[gameKey] && typeof playInfo[gameKey] === 'object' ? playInfo[gameKey] : {};

    const score = Number(event.score);
    const durationSeconds = Math.max(0, Math.round(Number(event.durationSeconds) || 0));
    const shouldCountPlay = event.countPlay !== false;

    const next = {
        ...previous,
        plays: (Number(previous.plays) || 0) + (shouldCountPlay ? 1 : 0),
        total_seconds: (Number(previous.total_seconds) || 0) + durationSeconds,
        last_played_at: now
    };

    if (Number.isFinite(score)) {
        next.last_score = score;
        next.best_score = Math.max(Number(previous.best_score) || 0, score);
    }

    if (event.won === true) {
        next.wins = (Number(previous.wins) || 0) + 1;
    }

    playInfo[gameKey] = next;
    setLocalPlayInfo(playInfo, username);

    const pendingCount = getPendingStatsCount(username) + (shouldCountPlay ? 1 : 0);
    setPendingStatsCount(pendingCount, username);

    if (pendingCount >= 5 || event.forceSync === true) {
        await syncLocalGameStats();
    }

    return { skipped: false, gameKey, stats: next, pendingCount };
}

async function getCurrentGameUserStats(options = {}) {
    const username = getGameUsername();
    if (!username) return null;

    const identity = {
        username,
        id: await getGameUserId(username)
    };

    const row = await ensureGameUser(identity, getUTCNow(), options);
    const remotePlayInfo = row?.play_info && typeof row.play_info === 'object' ? row.play_info : {};
    const playInfo = mergePlayInfo(remotePlayInfo, getLocalPlayInfo(username));
    setLocalPlayInfo(playInfo, username);
    return {
        ...row,
        play_info: playInfo
    };
}

function normalizeReactionEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
        .map(entry => ({
            name: String(entry?.name || entry?.username || 'Anonymous'),
            time_ms: Math.max(0, Math.round(Number(entry?.time_ms ?? entry?.timeMs ?? entry?.time) || 0)),
            played_at: entry?.played_at || entry?.playedAt || getUTCNow()
        }))
        .filter(entry => entry.time_ms > 0)
        .sort((a, b) => a.time_ms - b.time_ms || String(a.played_at).localeCompare(String(b.played_at)))
        .slice(0, 5);
}

async function fetchReactionLeaderboard() {
    const { data, error } = await _gameSupabase
        .from('leaderboard')
        .select('id,reaction_time')
        .limit(1);

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
        row: row || null,
        entries: normalizeReactionEntries(row?.reaction_time)
    };
}

async function saveReactionLeaderboard(row, entries) {
    const payload = {
        reaction_time: normalizeReactionEntries(entries)
    };

    if (row?.id !== undefined && row?.id !== null) {
        const { error } = await _gameSupabase
            .from('leaderboard')
            .update(payload)
            .eq('id', row.id);
        if (error) throw error;
        return payload.reaction_time;
    }

    const { error } = await _gameSupabase
        .from('leaderboard')
        .insert(payload);
    if (error) throw error;
    return payload.reaction_time;
}

async function submitReactionTime(timeMs, name = getGameUsername()) {
    const entry = {
        name: name || getGameUsername() || 'Anonymous',
        time_ms: Math.max(0, Math.round(Number(timeMs) || 0)),
        played_at: getUTCNow()
    };
    if (!entry.time_ms) return { skipped: true, entries: [] };

    const { row, entries } = await fetchReactionLeaderboard();
    const nextEntries = normalizeReactionEntries([...entries, entry]);
    await saveReactionLeaderboard(row, nextEntries);
    return {
        skipped: false,
        entry,
        entries: nextEntries
    };
}

window.omgGameStats = {
    normalizeGameKey,
    getLocalPlayInfo,
    syncLocal: syncLocalGameStats,
    getCurrentUserStats: getCurrentGameUserStats,
    getReactionLeaderboard: async () => (await fetchReactionLeaderboard()).entries,
    submitReactionTime,
    update: updateGameUserStats
};
