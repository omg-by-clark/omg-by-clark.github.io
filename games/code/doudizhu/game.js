const RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "SJ", "BJ"];
const SUITS = ["♠", "♥", "♣", "♦"];
const RANK_VALUE = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]));
const PLAYER_NAMES = {
  zh: ["你", "左家", "右家"],
  en: ["You", "Left bot", "Right bot"]
};
const state = {
  difficulty: "easy",
  hands: [[], [], []],
  kitty: [],
  landlord: null,
  current: 0,
  callIndex: 0,
  callBids: [],
  lastPlay: null,
  passCount: 0,
  selected: new Set(),
  phase: "start",
  dealing: false,
  dragging: false,
  dragTouched: new Set(),
  lang: localStorage.getItem("lang") === "en" ? "en" : "zh"
};

const zh = state.lang !== "en";
const $ = (id) => document.getElementById(id);
const text = (cn, en) => zh ? cn : en;
const playerName = (index) => PLAYER_NAMES[zh ? "zh" : "en"][index];

function emitGameEvent(event, payload = {}) {
  window.parent?.postMessage({
    type: "omg-game-event",
    game: "doudizhu",
    event,
    ...payload
  }, "*");
}

function applyTheme() {
  const theme = localStorage.getItem("theme");
  document.body.classList.toggle("dark", theme === "dark");
  document.body.classList.toggle("light", theme === "light");
}

function applyI18n() {
  document.documentElement.lang = zh ? "zh-CN" : "en";
  document.querySelectorAll("[data-zh][data-en]").forEach((node) => {
    node.textContent = node.dataset[zh ? "zh" : "en"];
  });
}

function makeDeck() {
  const deck = [];
  for (const rank of RANKS.slice(0, 13)) {
    for (const suit of SUITS) deck.push({ rank, suit, value: RANK_VALUE[rank], id: `${rank}${suit}` });
  }
  deck.push({ rank: "SJ", suit: "☆", value: RANK_VALUE.SJ, id: "SJ" });
  deck.push({ rank: "BJ", suit: "★", value: RANK_VALUE.BJ, id: "BJ" });
  return deck;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// This is intentionally not a fair shuffle. It keeps some ranks grouped so
// the table gets more pairs, triples, and bombs than ordinary random dealing.
function biasedDeal() {
  const groups = new Map();
  for (const card of makeDeck()) {
    if (!groups.has(card.rank)) groups.set(card.rank, []);
    groups.get(card.rank).push(card);
  }

  const allGroups = [...groups.values()].sort(() => Math.random() - 0.5);
  const hands = [[], [], []];
  const pool = [];
  const kitty = [];

  for (const group of allGroups) {
    group.sort(() => Math.random() - 0.5);
    if (group.length === 4 && Math.random() < 0.16) {
      const owner = randomItem([0, 1, 2]);
      if (hands[owner].length <= 13) {
        hands[owner].push(...group);
        continue;
      }
    }
    if (group.length >= 2 && Math.random() < 0.58) {
      const owner = randomItem([0, 1, 2]);
      const take = Math.min(group.length, Math.random() < 0.32 ? 3 : 2);
      if (hands[owner].length + take <= 17) {
        hands[owner].push(...group.splice(0, take));
      }
    }
    pool.push(...group);
  }

  pool.sort(() => Math.random() - 0.5);
  while (kitty.length < 3 && pool.length) kitty.push(pool.pop());
  while (pool.length) {
    const available = [0, 1, 2].filter((i) => hands[i].length < 17);
    hands[randomItem(available)].push(pool.pop());
  }

  sortHand(kitty);
  hands.forEach(sortHand);
  return { hands, kitty };
}

function sortHand(hand) {
  hand.sort((a, b) => b.value - a.value || b.suit.localeCompare(a.suit));
}

function countRanks(cards) {
  const map = new Map();
  for (const card of cards) map.set(card.rank, (map.get(card.rank) || 0) + 1);
  return map;
}

function isConsecutive(values) {
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) if (sorted[i] !== sorted[i - 1] + 1) return false;
  return true;
}

function findPlane(entries, len) {
  const triples = entries
    .filter((entry) => entry.count >= 3 && entry.value < RANK_VALUE["2"])
    .sort((a, b) => a.value - b.value);

  for (let start = 0; start < triples.length; start++) {
    for (let end = start + 1; end < triples.length; end++) {
      const core = triples.slice(start, end + 1);
      if (!isConsecutive(core.map((entry) => entry.value))) break;

      const planeSize = core.length;
      const wingCount = len - planeSize * 3;
      if (![0, planeSize, planeSize * 2].includes(wingCount)) continue;

      const coreRanks = new Set(core.map((entry) => entry.rank));
      const rest = entries.map((entry) => ({
        ...entry,
        count: entry.count - (coreRanks.has(entry.rank) ? 3 : 0)
      })).filter((entry) => entry.count > 0);
      const restCount = rest.reduce((sum, entry) => sum + entry.count, 0);
      const value = Math.max(...core.map((entry) => entry.value));

      if (wingCount === 0 && restCount === 0) return { type: "airplane", value, length: len, label: text("飞机", "Airplane") };
      if (wingCount === planeSize && restCount === wingCount) return { type: "airplane_single", value, length: len, label: text("飞机带翅膀", "Airplane + wings") };
      if (wingCount === planeSize * 2 && restCount === wingCount && rest.every((entry) => entry.count === 2)) return { type: "airplane_pair", value, length: len, label: text("飞机带对子", "Airplane + pairs") };
    }
  }

  return null;
}

function evaluate(cards) {
  if (!cards.length) return null;
  const counts = countRanks(cards);
  const entries = [...counts.entries()].map(([rank, count]) => ({ rank, count, value: RANK_VALUE[rank] }));
  const len = cards.length;
  const values = entries.map((e) => e.value);
  const noHigh = entries.every((e) => e.value < RANK_VALUE["2"]);

  if (len === 2 && counts.has("SJ") && counts.has("BJ")) return { type: "rocket", value: 99, length: 2, label: text("王炸", "Rocket") };
  if (len === 4 && entries.length === 1) return { type: "bomb", value: values[0], length: 4, label: text("炸弹", "Bomb") };
  if (len === 1) return { type: "single", value: values[0], length: 1, label: text("单牌", "Single") };
  if (len === 2 && entries.length === 1) return { type: "pair", value: values[0], length: 2, label: text("对子", "Pair") };
  if (len === 3 && entries.length === 1) return { type: "triple", value: values[0], length: 3, label: text("三张", "Triple") };
  if (len === 4 && entries.some((e) => e.count === 3)) return { type: "triple_single", value: entries.find((e) => e.count === 3).value, length: 4, label: text("三带一", "Triple + one") };
  if (len === 5 && entries.some((e) => e.count === 3) && entries.some((e) => e.count === 2)) return { type: "triple_pair", value: entries.find((e) => e.count === 3).value, length: 5, label: text("三带一对", "Triple + pair") };
  if (len >= 6) {
    const plane = findPlane(entries, len);
    if (plane) return plane;
  }
  if (len >= 5 && entries.length === len && noHigh && isConsecutive(values)) return { type: "straight", value: Math.max(...values), length: len, label: text("顺子", "Straight") };
  if (len >= 6 && len % 2 === 0 && entries.every((e) => e.count === 2) && noHigh && isConsecutive(values)) return { type: "pair_straight", value: Math.max(...values), length: len, label: text("连对", "Pair straight") };
  return null;
}

// Dou Dizhu comparison rules: rockets beat everything, bombs beat non-bombs,
// and normal hands can only beat the same shape with a higher main rank.
function canBeat(play, last) {
  if (!play) return false;
  if (!last) return true;
  if (play.type === "rocket") return true;
  if (last.type === "rocket") return false;
  if (play.type === "bomb" && last.type !== "bomb") return true;
  if (play.type !== last.type || play.length !== last.length) return false;
  return play.value > last.value;
}

function cardLabel(card) {
  if (card.rank === "SJ") return "JOKER";
  if (card.rank === "BJ") return "JOKER";
  return `${card.rank}${card.suit}`;
}

function isRed(card) {
  return card.suit === "♥" || card.suit === "♦" || card.rank === "BJ";
}

// The hand is rendered as overlapped real cards. Jokers use vertical text so
// they read like actual playing cards instead of normal square labels.
function renderCard(card, index, className = "card") {
  const red = isRed(card) ? " red" : "";
  const joker = card.rank === "SJ" || card.rank === "BJ" ? " joker-card" : "";
  const deal = state.dealing ? " deal-in" : "";
  const face = card.rank === "SJ" || card.rank === "BJ"
    ? `<span class="joker">${"JOKER".split("").map((letter) => `<b>${letter}</b>`).join("")}</span>`
    : `<span class="rank">${card.rank}</span><span class="suit">${card.suit}</span>`;
  return `<button class="${className}${red}${joker}${deal}" data-id="${card.id}" style="--deal-index:${index || 0}">
    ${face}
  </button>`;
}

function render() {
  for (let i = 0; i < 3; i++) {
    $(`count-${i}`)?.replaceChildren(document.createTextNode(String(state.hands[i].length)));
    const node = $(`player-${i}`);
    if (node) {
      node.classList.toggle("landlord", state.landlord === i);
      node.classList.toggle("current-turn", state.phase === "play" && state.current === i);
    }
  }

  $("role-line").textContent = state.landlord === null
    ? text("等待叫地主", "Waiting to call landlord")
    : `${playerName(state.landlord)}${text("是地主", " is landlord")}`;

  $("kitty-cards").innerHTML = state.landlord === null
    ? state.kitty.map(() => `<div class="mini-card">?</div>`).join("")
    : state.kitty.map((card) => `<div class="mini-card${isRed(card) ? " red" : ""}">${cardLabel(card)}</div>`).join("");

  $("last-play").innerHTML = state.lastPlay
    ? state.lastPlay.cards.map((card) => `<div class="played-card${isRed(card) ? " red" : ""}">${cardLabel(card)}</div>`).join("")
    : `<div class="played-card">-</div>`;

  $("hand").innerHTML = state.hands[0].map((card, index) => renderCard(card, index)).join("");
  for (const button of $("hand").querySelectorAll(".card")) {
    syncCardSelection(button);
    button.onpointerdown = (event) => {
      event.preventDefault();
      startDragToggle(button.dataset.id, button);
    };
    button.onpointerenter = () => dragToggleCard(button.dataset.id, button);
  }

  $("call-actions").classList.toggle("hidden", state.phase !== "call");
  $("play-actions").classList.toggle("hidden", state.phase !== "play" || state.current !== 0);
  $("pass").disabled = !state.lastPlay || state.lastPlay.player === 0;

  updateMood();
}

function updateMood() {
  const app = $("app");
  app.classList.remove("mood-fresh", "mood-hot", "mood-night");
  if (state.lastPlay?.combo.type === "bomb" || state.lastPlay?.combo.type === "rocket") app.classList.add("mood-hot");
  else if (Math.min(...state.hands.map((hand) => hand.length)) <= 4) app.classList.add("mood-night");
  else app.classList.add("mood-fresh");
}

function log(message) {
  $("play-log").textContent = message;
  $("play-log").classList.remove("toast");
  requestAnimationFrame(() => $("play-log").classList.add("toast"));
}

function syncCardSelection(button) {
  button.classList.toggle("selected", state.selected.has(button.dataset.id));
}

// Drag selection only runs while the pointer is pressed. During one drag pass,
// each card toggles at most once, so sliding back and forth feels controlled.
function toggleCard(id, button) {
  if (state.current !== 0 || state.phase !== "play") return;
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  if (button) syncCardSelection(button);
}

function startDragToggle(id, button) {
  if (state.current !== 0 || state.phase !== "play") return;
  state.dragging = true;
  state.dragTouched.clear();
  dragToggleCard(id, button);
}

function dragToggleCard(id, button) {
  if (!state.dragging || state.dragTouched.has(id)) return;
  state.dragTouched.add(id);
  toggleCard(id, button);
}

function selectedCards() {
  return state.hands[0].filter((card) => state.selected.has(card.id));
}

function removeCards(player, cards) {
  const ids = new Set(cards.map((card) => card.id));
  state.hands[player] = state.hands[player].filter((card) => !ids.has(card.id));
}

function startGame() {
  const deal = biasedDeal();
  state.hands = deal.hands;
  state.kitty = deal.kitty;
  state.landlord = null;
  state.current = 0;
  state.callIndex = 0;
  state.callBids = [];
  state.lastPlay = null;
  state.passCount = 0;
  state.selected.clear();
  state.phase = "call";
  state.dealing = true;
  $("start-screen").classList.add("hidden");
  $("game-screen").classList.remove("hidden");
  $("status").textContent = text("要不要叫地主？", "Call landlord?");
  log(text("牌已经发好。注意：这副牌没有认真洗。", "Cards dealt. This deck was not really shuffled."));
  emitGameEvent("start");
  render();
  window.setTimeout(() => {
    state.dealing = false;
    render();
  }, 980);
}

function handStrength(hand) {
  const counts = [...countRanks(hand).values()];
  return hand.reduce((sum, card) => sum + card.value, 0) + counts.filter((c) => c >= 2).length * 8 + counts.filter((c) => c === 4).length * 28;
}

function shouldAiCallLandlord(player) {
  const strength = handStrength(state.hands[player]);
  const threshold = state.difficulty === "hard" ? 205 : state.difficulty === "normal" ? 225 : 245;
  return strength >= threshold;
}

function decideLandlord(userCalled) {
  if (userCalled) {
    setLandlord(0);
  } else {
    state.callBids.push({ player: 0, called: false });
    state.callIndex = 1;
    state.phase = "ai-call";
    log(text("你不叫。左家开始判断。", "You passed. Left bot is thinking."));
    render();
    setTimeout(aiCallLandlord, 520);
  }
}

function aiCallLandlord() {
  const player = state.callIndex;
  const called = shouldAiCallLandlord(player);
  state.callBids.push({ player, called });
  log(`${playerName(player)}${called ? text("叫地主。", " called landlord.") : text("不叫。", " passed landlord.")}`);
  if (called || state.callIndex >= 2) {
    if (!called) {
      log(text("三家都不叫，重新发牌。", "Nobody called. Redealing."));
      setTimeout(startGame, 700);
      return;
    }
    const caller = player;
    setLandlord(caller);
    return;
  }
  state.callIndex += 1;
  setTimeout(aiCallLandlord, 520);
}

function setLandlord(player) {
  state.landlord = player;
  state.hands[state.landlord].push(...state.kitty);
  sortHand(state.hands[state.landlord]);
  state.current = state.landlord;
  state.phase = "play";
  $("status").textContent = `${playerName(state.landlord)}${text("拿到底牌，开始出牌。", " takes the kitty and starts.")}`;
  log(text("底牌翻开了。", "Kitty revealed."));
  render();
  if (state.current !== 0) setTimeout(aiTurn, 700);
}

function comboText(combo, cards) {
  return `${combo.label}: ${cards.map(cardLabel).join(" ")}`;
}

function playHuman() {
  const cards = selectedCards();
  const combo = evaluate(cards);
  if (!combo) {
    shakePlayButton();
    log(text("这组牌型不对。", "Invalid combo."));
    return;
  }
  if (!canBeat(combo, state.lastPlay?.combo || null)) {
    shakePlayButton();
    log(text("这手牌压不过上家。", "This cannot beat the last play."));
    return;
  }
  playCards(0, cards, combo);
}

function shakePlayButton() {
  const button = $("play-selected");
  button.classList.remove("shake");
  void button.offsetWidth;
  button.classList.add("shake");
}

function passHuman() {
  if (!state.lastPlay || state.lastPlay.player === 0) return;
  passTurn(0);
}

function playCards(player, cards, combo) {
  removeCards(player, cards);
  state.selected.clear();
  state.lastPlay = { player, cards, combo };
  state.passCount = 0;
  log(`${playerName(player)}${text("出了 ", " played ")}${comboText(combo, cards)}`);
  if (state.hands[player].length === 0) {
    endGame(player);
    return;
  }
  state.current = (player + 1) % 3;
  render();
  if (state.current !== 0) setTimeout(aiTurn, 760);
}

function passTurn(player) {
  state.passCount += 1;
  log(`${playerName(player)}${text("不要。", " passed.")}`);
  if (state.passCount >= 2) {
    state.lastPlay = null;
    state.passCount = 0;
    log(text("两家不要，重新开牌。", "Two passes. New round."));
  }
  state.current = (player + 1) % 3;
  render();
  if (state.current !== 0) setTimeout(aiTurn, 620);
}

function endGame(winner) {
  state.phase = "end";
  $("status").textContent = winner === 0 ? text("你赢了！", "You win!") : `${playerName(winner)}${text("赢了。", " wins.")}`;
  log(winner === 0 ? text("漂亮，系统被你打穿了。", "Nice. You beat the system.") : text("再来一把，下一把牌更炸。", "Try again. Next hand may be wilder."));
  emitGameEvent("finish", { won: winner === 0 });
  render();
  $("play-actions").classList.add("hidden");
}

function findPlayable(hand, lastCombo) {
  const groups = [...countRanks(hand).entries()].map(([rank, count]) => ({ rank, count, value: RANK_VALUE[rank] })).sort((a, b) => a.value - b.value);
  const byRank = (rank, count) => hand.filter((card) => card.rank === rank).slice(0, count);
  const candidates = [];

  for (const g of groups) {
    if (g.count >= 1) candidates.push(byRank(g.rank, 1));
    if (g.count >= 2) candidates.push(byRank(g.rank, 2));
    if (g.count >= 3) {
      candidates.push(byRank(g.rank, 3));
      const single = hand.find((card) => card.rank !== g.rank);
      if (single) candidates.push([...byRank(g.rank, 3), single]);
      const pair = groups.find((x) => x.rank !== g.rank && x.count >= 2);
      if (pair) candidates.push([...byRank(g.rank, 3), ...byRank(pair.rank, 2)]);
    }
  }

  addStraights(hand, candidates);
  addAirplanes(hand, groups, candidates);

  for (const g of groups.filter((g) => g.count === 4)) candidates.push(byRank(g.rank, 4));
  if (hand.some((card) => card.rank === "SJ") && hand.some((card) => card.rank === "BJ")) candidates.push([hand.find((card) => card.rank === "SJ"), hand.find((card) => card.rank === "BJ")]);

  return candidates
    .map((cards) => ({ cards, combo: evaluate(cards) }))
    .filter((item) => item.combo && canBeat(item.combo, lastCombo))
    .sort((a, b) => {
      const av = playScore(a, Boolean(lastCombo));
      const bv = playScore(b, Boolean(lastCombo));
      return av - bv;
    });
}

function playScore(option, beatingLast) {
  const typeWeight = {
    single: 22,
    pair: 16,
    triple: 12,
    triple_single: 5,
    triple_pair: 4,
    straight: -8,
    pair_straight: -7,
    airplane: -12,
    airplane_single: -13,
    airplane_pair: -12,
    bomb: 45,
    rocket: 55
  };
  const bombPenalty = state.difficulty === "hard" ? 26 : state.difficulty === "normal" ? 18 : 8;
  const activeBonus = beatingLast ? 0 : -option.cards.length * 7;
  const preserveBomb = ["bomb", "rocket"].includes(option.combo.type) ? bombPenalty : 0;
  return (typeWeight[option.combo.type] || 0) + option.combo.value + preserveBomb + activeBonus;
}

function addAirplanes(hand, groups, candidates) {
  const byRank = (rank, count) => hand.filter((card) => card.rank === rank).slice(0, count);
  const triples = groups.filter((group) => group.count >= 3 && group.value < RANK_VALUE["2"]);

  for (let start = 0; start < triples.length; start++) {
    for (let end = start + 1; end < triples.length; end++) {
      const core = triples.slice(start, end + 1);
      if (!isConsecutive(core.map((group) => group.value))) break;

      const coreCards = core.flatMap((group) => byRank(group.rank, 3));
      const coreIds = new Set(coreCards.map((card) => card.id));
      const rest = hand.filter((card) => !coreIds.has(card.id));
      const wingSize = core.length;

      candidates.push(coreCards);
      if (rest.length >= wingSize) candidates.push([...coreCards, ...rest.slice(0, wingSize)]);

      const pairs = groups
        .filter((group) => !core.some((item) => item.rank === group.rank) && group.count >= 2)
        .flatMap((group) => byRank(group.rank, 2));
      if (pairs.length >= wingSize * 2) candidates.push([...coreCards, ...pairs.slice(0, wingSize * 2)]);
    }
  }
}

function addStraights(hand, candidates) {
  const ranks = [...new Set(hand.filter((card) => card.value < RANK_VALUE["2"]).map((card) => card.value))].sort((a, b) => a - b);
  for (let start = 0; start < ranks.length; start++) {
    for (let end = start + 4; end < ranks.length; end++) {
      const values = ranks.slice(start, end + 1);
      if (!isConsecutive(values)) break;
      candidates.push(values.map((value) => hand.find((card) => card.value === value)));
    }
  }
}

// The bots only inspect their own hand and the public last play. Difficulty
// changes how much they preserve bombs and how rarely they voluntarily pass.
function aiTurn() {
  if (state.phase !== "play") return;
  const player = state.current;
  const lastCombo = state.lastPlay && state.lastPlay.player !== player ? state.lastPlay.combo : null;
  const options = findPlayable(state.hands[player], lastCombo);
  const courage = state.difficulty === "hard" ? 0.98 : state.difficulty === "normal" ? 0.9 : 0.82;
  const cheapAnswer = lastCombo && lastCombo.value <= RANK_VALUE.Q && !["bomb", "rocket"].includes(options[0]?.combo.type);
  if (!options.length || (lastCombo && !cheapAnswer && Math.random() > courage && options[0].combo.type !== "rocket")) {
    passTurn(player);
    return;
  }
  const pick = state.difficulty === "easy" && options.length > 1 ? randomItem(options.slice(0, Math.min(3, options.length))) : options[0];
  playCards(player, pick.cards, pick.combo);
}

function hint() {
  const lastCombo = state.lastPlay && state.lastPlay.player !== 0 ? state.lastPlay.combo : null;
  const option = findPlayable(state.hands[0], lastCombo)[0];
  state.selected.clear();
  if (option) option.cards.forEach((card) => state.selected.add(card.id));
  log(option ? text("给你挑了一手能出的。", "Hint selected a playable combo.") : text("没有能压的牌，可以不要。", "No playable combo. You can pass."));
  render();
}

document.querySelectorAll(".difficulty-btn").forEach((button) => {
  button.onclick = () => {
    state.difficulty = button.dataset.level;
    document.querySelectorAll(".difficulty-btn").forEach((item) => item.classList.toggle("active", item === button));
  };
});

$("new-game").onclick = startGame;
$("restart").onclick = startGame;
$("call-landlord").onclick = () => decideLandlord(true);
$("pass-landlord").onclick = () => decideLandlord(false);
$("play-selected").onclick = playHuman;
$("pass").onclick = passHuman;
$("hint").onclick = hint;
window.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || state.phase !== "play" || state.current !== 0) return;
  event.preventDefault();
  playHuman();
});
window.onpointerup = () => {
  state.dragging = false;
  state.dragTouched.clear();
};
window.onpointercancel = window.onpointerup;

applyTheme();
applyI18n();
