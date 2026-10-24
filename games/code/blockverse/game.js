const WORLD_SIZE = 100;
const CHUNK_SIZE = 10;
const DEFAULT_TERRAIN_SEED = 48721;
const WORLD_STORAGE_KEY = 'blockverse.worlds.v1';
const WORLD_STORAGE_VERSION = 1;
const BLOCK_TYPE_IDS = ['air', 'grass', 'dirt', 'stone', 'bedrock', 'pine_wood', 'pine_planks', 'pine_leaves'];
const PLAYER_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.32;
const STEP_HEIGHT = 1;
const EYE_HEIGHT = 1.55;
const SNEAK_EYE_HEIGHT = 1.25;
const WALK_SPEED = 3;
const SPRINT_SPEED_MULTIPLIER = 2.5;
const SNEAK_SPEED_MULTIPLIER = 0.5;
const JUMP_SPEED = 8.2;
const JUMP_BUFFER_MS = 180;
const GRAVITY = 22;
const MAX_PLACE_HEIGHT = 64;
const MAX_REACH = 7;
const MAX_PITCH = Math.PI / 2 - 0.01;
const RESPAWN_DELAY_MS = 3000;
const MAX_HEALTH = 10;
const VOID_DAMAGE_START_Y = -50;
const VOID_DAMAGE_STEP = 10;
const VOID_DAMAGE_AMOUNT = 0.5;
const DOUBLE_SPACE_WINDOW_MS = 320;
const FLY_SPEED = 7;
const DROP_PICKUP_RADIUS = 1.15;
const TOOL_SWING_DURATION_MS = 300;
const PLAYER_NAME = '玩家';
const SPAWN_X = Math.floor(WORLD_SIZE / 2) + 0.5;
const SPAWN_Z = Math.floor(WORLD_SIZE / 2) + 0.5;
const HOTBAR_SIZE = 10;

const BIOMES = {
    plains: { label: '草原 · Plains' },
    forest: { label: '树林 · Forest' },
    mountain: { label: '山地 · Mountain' }
};

const GAME_MODES = {
    creative: { label: '创造模式' },
    survival: { label: '生存模式' }
};

const BLOCK_DEFINITIONS = {
    grass: { label: '草方块', hardness: 0.55, textures: 'grass' },
    dirt: { label: '泥土', hardness: 0.65, textures: 'dirt' },
    stone: { label: '石头', hardness: 1.5, textures: 'stone' },
    bedrock: { label: '基岩', hardness: 4, textures: 'bedrock' },
    pine_wood: { label: '松树原木', hardness: 1, texture: 'texture-packs/default-1/pine-wood.png?v=16px-1' },
    pine_planks: { label: '松树木板', hardness: 0.8, texture: 'texture-packs/default-1/pine-planks.png?v=16px-1' },
    pine_leaves: { label: '松树树叶', hardness: 0.5, texture: 'texture-packs/default-1/pine-leaves.png?v=16px-2', alphaTest: 0.45 }
};

const ITEM_DEFINITIONS = {
    grass: { label: '草方块', kind: 'block', blockType: 'grass', icon: 'texture-packs/default-1/grass3.png' },
    dirt: { label: '泥土', kind: 'block', blockType: 'dirt', icon: 'texture-packs/default-1/dirt1.png' },
    stone: { label: '石头', kind: 'block', blockType: 'stone', icon: 'texture-packs/default-1/stone1.png' },
    bedrock: { label: '基岩', kind: 'block', blockType: 'bedrock', icon: 'texture-packs/default-1/bedrock1.png' },
    pine_wood: { label: '松树原木', kind: 'block', blockType: 'pine_wood', icon: 'texture-packs/default-1/pine-wood.png?v=16px-1' },
    pine_planks: { label: '松树木板', kind: 'block', blockType: 'pine_planks', icon: 'texture-packs/default-1/pine-planks.png?v=16px-1' },
    pine_leaves: { label: '松树树叶', kind: 'block', blockType: 'pine_leaves', icon: 'texture-packs/default-1/pine-leaves.png?v=16px-2' },
    wooden_axe: { label: '木斧', kind: 'tool', toolType: 'axe', tier: 'wood', icon: 'texture-packs/default-1/wooden-axe.png?v=reference-1' },
    wooden_pickaxe: { label: '木镐', kind: 'tool', toolType: 'pickaxe', tier: 'wood', icon: 'texture-packs/default-1/wooden-pickaxe.png?v=reference-4' },
    stone_axe: { label: '石斧', kind: 'tool', toolType: 'axe', tier: 'stone', icon: 'texture-packs/default-1/stone-axe.png?v=reference-1' },
    stone_pickaxe: { label: '石镐', kind: 'tool', toolType: 'pickaxe', tier: 'stone', icon: 'texture-packs/default-1/stone-pickaxe.png?v=reference-4' }
};

const game = document.getElementById('game');
const canvas = document.getElementById('world');
const coordsLabel = document.getElementById('coords');
const biomeLabel = document.getElementById('biome-label');
const hotbar = document.getElementById('hotbar');
const inventoryScreen = document.getElementById('inventory-screen');
const backpackGrid = document.getElementById('backpack-grid');
const inventoryCloseButton = document.getElementById('inventory-close');
const inventoryStatus = document.getElementById('inventory-status');
const breakProgress = document.getElementById('break-progress');
const breakLabel = document.getElementById('break-label');
const breakFill = document.getElementById('break-fill');
const deathScreen = document.getElementById('death-screen');
const deathReasonZhLabel = document.getElementById('death-reason-zh');
const respawnCountdownLabel = document.getElementById('respawn-countdown');
const frontEnd = document.getElementById('front-end');
const mainMenu = document.getElementById('main-menu');
const worldsMenu = document.getElementById('worlds-menu');
const worldsButton = document.getElementById('worlds-button');
const worldsBackButton = document.getElementById('worlds-back');
const createWorldForm = document.getElementById('create-world-form');
const worldNameInput = document.getElementById('world-name');
const worldSeedInput = document.getElementById('world-seed');
const worldStorageStatus = document.getElementById('world-storage-status');
const savedWorldList = document.getElementById('saved-world-list');
const savedWorldCount = document.getElementById('saved-world-count');
const worldControls = document.getElementById('world-controls');
const saveIndicator = document.getElementById('save-indicator');
const saveExitButton = document.getElementById('save-exit');
const worldModeInput = document.getElementById('world-mode');
const modeLabel = document.getElementById('mode-label');
const healthBar = document.getElementById('health-bar');
const commandConsole = document.getElementById('command-console');
const commandLog = document.getElementById('command-log');
const commandForm = document.getElementById('command-form');
const commandInput = document.getElementById('command-input');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x8fd0e4, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd0e4);
scene.fog = new THREE.Fog(0x8fd0e4, 90, 170);
const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 180);
scene.add(camera);
const HELD_PIXEL_SIZE = 0.058;
const heldPixelGeometry = new THREE.BoxGeometry(HELD_PIXEL_SIZE, HELD_PIXEL_SIZE, HELD_PIXEL_SIZE);
const heldItemRoot = new THREE.Group();
heldItemRoot.visible = false;
camera.add(heldItemRoot);
const heldMaterialCache = new Map();
const toolPixelCache = new Map();
const toolPixelLoads = new Map();
let renderedHeldItemId = '';
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const aimPoint = new THREE.Vector2(0, 0);
const faceForward = new THREE.Vector3(0, 0, 1);
const faceNormal = new THREE.Vector3();
const faceBlockCenter = new THREE.Vector3();
const aimHitNormal = new THREE.Vector3();
const aimHitBlock = { x: 0, y: 0, z: 0 };
const aimHit = { block: aimHitBlock, normal: aimHitNormal, blockType: 'air', distance: 0 };
const facePlaneGeometry = new THREE.PlaneGeometry(1.002, 1.002);

const worldGroup = new THREE.Group();
scene.add(worldGroup);
const dropGroup = new THREE.Group();
scene.add(dropGroup);
const faceHighlight = new THREE.Group();
const faceLightness = new THREE.Mesh(facePlaneGeometry, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide
}));
const faceOutline = new THREE.Group();
const faceOutlineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.98, depthWrite: false, side: THREE.DoubleSide
});
const horizontalOutlineGeometry = new THREE.PlaneGeometry(1.04, 0.045);
const verticalOutlineGeometry = new THREE.PlaneGeometry(0.045, 1.04);
for (const y of [-0.51, 0.51]) {
    const edge = new THREE.Mesh(horizontalOutlineGeometry, faceOutlineMaterial);
    edge.position.set(0, y, 0.001);
    faceOutline.add(edge);
}
for (const x of [-0.51, 0.51]) {
    const edge = new THREE.Mesh(verticalOutlineGeometry, faceOutlineMaterial);
    edge.position.set(x, 0, 0.001);
    faceOutline.add(edge);
}
faceLightness.renderOrder = 10;
for (const edge of faceOutline.children) edge.renderOrder = 11;
faceHighlight.add(faceLightness, faceOutline);
faceHighlight.visible = false;
scene.add(faceHighlight);

const crackSegments = [
    [8, 8, 8, 5], [8, 5, 6, 3], [8, 5, 10, 2], [8, 8, 5, 9],
    [5, 9, 3, 12], [8, 8, 11, 9], [11, 9, 14, 8], [11, 9, 12, 13],
    [8, 8, 7, 12], [7, 12, 5, 15], [7, 12, 9, 15], [6, 3, 3, 2],
    [10, 2, 13, 1], [3, 12, 1, 13], [14, 8, 15, 6], [12, 13, 14, 15]
];
const crackTextures = Array.from({ length: 10 }, (_, stage) => {
    const crackCanvas = document.createElement('canvas');
    crackCanvas.width = 16;
    crackCanvas.height = 16;
    const context = crackCanvas.getContext('2d');
    context.strokeStyle = 'rgba(18, 22, 20, 0.9)';
    context.lineWidth = 1;
    context.lineCap = 'square';
    context.beginPath();
    const segmentCount = Math.ceil(crackSegments.length * (stage + 1) / 10);
    for (let index = 0; index < segmentCount; index++) {
        const [x1, y1, x2, y2] = crackSegments[index];
        context.moveTo(x1 + 0.5, y1 + 0.5);
        context.lineTo(x2 + 0.5, y2 + 0.5);
    }
    context.stroke();
    const texture = new THREE.CanvasTexture(crackCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
});
const crackMaterial = new THREE.MeshBasicMaterial({
    map: crackTextures[0], transparent: true, depthWrite: false, alphaTest: 0.05, side: THREE.DoubleSide
});
const crackPlane = new THREE.Mesh(facePlaneGeometry, crackMaterial);
crackPlane.renderOrder = 12;
crackPlane.visible = false;
scene.add(crackPlane);

scene.add(new THREE.HemisphereLight(0xd9f2e5, 0x4a5e38, 0.88));
const sun = new THREE.DirectionalLight(0xfff1bd, 0.62);
sun.position.set(-45, 70, 36);
scene.add(sun);

const keys = new Set();
const worldBlocks = new Map();
const chunkGroups = new Map();
const surfaceHeights = new Int16Array(WORLD_SIZE * WORLD_SIZE);
const surfaceBiomes = new Array(WORLD_SIZE * WORLD_SIZE).fill('plains');
const worldEdits = new Map();
const editOriginalBlocks = new Map();
let currentTerrainSeed = DEFAULT_TERRAIN_SEED;
let activeWorld = null;
let worldActive = false;
let saveTimer = 0;
let jumpQueuedUntil = 0;
let cameraStepOffset = 0;
let isDead = false;
let respawnAt = 0;
let spawnY = 5;
let inventoryOpen = false;
let selectedSlot = 0;
let hotbarItems = ['grass', 'dirt', 'stone', 'bedrock', 'pine_wood', 'pine_planks', 'pine_leaves', null, null, null];
let backpackItems = ['wooden_axe', 'wooden_pickaxe', 'stone_axe', 'stone_pickaxe'];
const itemCounts = new Map();
let survivalInventoryState = null;
let creativeInventoryState = null;
let currentGameMode = 'survival';
let health = MAX_HEALTH;
let previousHealth = MAX_HEALTH;
let damageFlashUntil = 0;
let lastVoidDamageLevel = 0;
let lastSpaceTapAt = -Infinity;
let commandOpen = false;
let miningHeld = false;
let toolSwingStartedAt = -Infinity;
let miningTargetKey = '';
let miningStartedAt = 0;
let miningDurationMs = 0;
const droppedItems = [];

const player = {
    pos: new THREE.Vector3(SPAWN_X, spawnY, SPAWN_Z),
    velocity: new THREE.Vector3(),
    yaw: Math.PI,
    pitch: -0.38,
    onGround: false,
    sprinting: false,
    sprintArmed: false,
    sneaking: false,
    flying: false
};

class PerlinNoise {
    constructor(seed) {
        const values = Array.from({ length: 256 }, (_, index) => index);
        let state = seed >>> 0;
        const random = () => {
            state += 0x6D2B79F5;
            let value = state;
            value = Math.imul(value ^ value >>> 15, value | 1);
            value ^= value + Math.imul(value ^ value >>> 7, value | 61);
            return ((value ^ value >>> 14) >>> 0) / 4294967296;
        };
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        this.permutation = new Uint16Array(512);
        for (let i = 0; i < 512; i++) this.permutation[i] = values[i & 255];
    }

    fade(value) {
        return value * value * value * (value * (value * 6 - 15) + 10);
    }

    gradient(hash, x, z) {
        switch (hash & 7) {
            case 0: return x + z;
            case 1: return -x + z;
            case 2: return x - z;
            case 3: return -x - z;
            case 4: return x;
            case 5: return -x;
            case 6: return z;
            default: return -z;
        }
    }

    noise(x, z) {
        const xFloor = Math.floor(x);
        const zFloor = Math.floor(z);
        const xi = xFloor & 255;
        const zi = zFloor & 255;
        const xf = x - xFloor;
        const zf = z - zFloor;
        const u = this.fade(xf);
        const v = this.fade(zf);
        const p = this.permutation;
        const aa = p[p[xi] + zi];
        const ab = p[p[xi] + zi + 1];
        const ba = p[p[xi + 1] + zi];
        const bb = p[p[xi + 1] + zi + 1];
        const lerp = (a, b, amount) => a + (b - a) * amount;
        const low = lerp(this.gradient(aa, xf, zf), this.gradient(ba, xf - 1, zf), u);
        const high = lerp(this.gradient(ab, xf, zf - 1), this.gradient(bb, xf - 1, zf - 1), u);
        return lerp(low, high, v);
    }

    fbm(x, z, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let totalAmplitude = 0;
        for (let octave = 0; octave < octaves; octave++) {
            value += this.noise(x * frequency, z * frequency) * amplitude;
            totalAmplitude += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        return value / totalAmplitude * 0.5 + 0.5;
    }
}

let heightNoise = new PerlinNoise(currentTerrainSeed);
let biomeNoise = new PerlinNoise(currentTerrainSeed ^ 0x9E3779B9);
let detailNoise = new PerlinNoise(currentTerrainSeed ^ 0x85EBCA6B);
const textureLoader = new THREE.TextureLoader();

function seedToNumber(seedText) {
    const normalized = String(seedText).trim();
    if (/^[+-]?\d+$/.test(normalized)) return Number(normalized) >>> 0;
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index++) {
        hash ^= normalized.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function randomSeedText() {
    if (window.crypto && window.crypto.getRandomValues) {
        const value = new Uint32Array(1);
        window.crypto.getRandomValues(value);
        return String(value[0]);
    }
    return String((Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0);
}

function configureTerrainSeed(seedText) {
    currentTerrainSeed = seedToNumber(seedText);
    heightNoise = new PerlinNoise(currentTerrainSeed);
    biomeNoise = new PerlinNoise(currentTerrainSeed ^ 0x9E3779B9);
    detailNoise = new PerlinNoise(currentTerrainSeed ^ 0x85EBCA6B);
}

function hasWorldStorageConsent() {
    return !('localDataConsent' in window) || window.localDataConsent === 'granted';
}

function readWorldCollection() {
    if (!hasWorldStorageConsent()) return [];
    try {
        const parsed = JSON.parse(localStorage.getItem(WORLD_STORAGE_KEY) || 'null');
        if (!parsed || parsed.v !== WORLD_STORAGE_VERSION || !Array.isArray(parsed.w)) return [];
        return parsed.w.filter((world) => world && typeof world.i === 'string' && typeof world.s === 'string');
    } catch (error) {
        console.warn('无法读取 Blockverse 世界存档。', error);
        return [];
    }
}

function writeWorldCollection(worlds) {
    if (!hasWorldStorageConsent()) return false;
    try {
        localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify({ v: WORLD_STORAGE_VERSION, w: worlds }));
        return localStorage.getItem(WORLD_STORAGE_KEY) !== null;
    } catch (error) {
        console.warn('无法保存 Blockverse 世界存档。', error);
        return false;
    }
}

function encodeWorldEdits() {
    const encoded = [];
    for (const [key, blockType] of worldEdits) {
        const [x, y, z] = parseKey(key);
        const typeId = BLOCK_TYPE_IDS.indexOf(blockType);
        if (!inWorldXZ(x, z) || y < 0 || y >= MAX_PLACE_HEIGHT || typeId < 0) continue;
        const coordinate = x + z * WORLD_SIZE + y * WORLD_SIZE * WORLD_SIZE;
        encoded.push(coordinate * BLOCK_TYPE_IDS.length + typeId);
    }
    encoded.sort((a, b) => a - b);
    return encoded.map((value) => value.toString(36)).join(',');
}

function decodeWorldEdits(encoded) {
    if (!encoded || typeof encoded !== 'string') return [];
    const edits = [];
    for (const token of encoded.split(',')) {
        const value = parseInt(token, 36);
        if (!Number.isSafeInteger(value) || value < 0) continue;
        const typeId = value % BLOCK_TYPE_IDS.length;
        const coordinate = Math.floor(value / BLOCK_TYPE_IDS.length);
        const x = coordinate % WORLD_SIZE;
        const z = Math.floor(coordinate / WORLD_SIZE) % WORLD_SIZE;
        const y = Math.floor(coordinate / (WORLD_SIZE * WORLD_SIZE));
        const blockType = BLOCK_TYPE_IDS[typeId];
        if (inWorldXZ(x, z) && y >= 0 && y < MAX_PLACE_HEIGHT && blockType) edits.push({ x, y, z, blockType });
    }
    return edits;
}

function makeWorldId() {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 0xFFFFFF).toString(36)}`;
}

function setStorageStatus(message, isError = false) {
    worldStorageStatus.textContent = message;
    worldStorageStatus.classList.toggle('error', isError);
}

function updateStorageAvailability() {
    const createButton = createWorldForm.querySelector('button[type="submit"]');
    const available = hasWorldStorageConsent();
    createButton.disabled = !available;
    if (!available) {
        setStorageStatus('保存世界需要允许“全部本地数据”。当前设置下无法创建持久世界。', true);
    } else if (worldStorageStatus.classList.contains('error')) {
        setStorageStatus('世界仅保存在这台设备的这个浏览器中。');
    }
    return available;
}

function renderSavedWorlds() {
    const worlds = readWorldCollection().sort((a, b) => (b.u || 0) - (a.u || 0));
    savedWorldCount.textContent = `${worlds.length} 个世界`;
    savedWorldList.replaceChildren();
    if (!worlds.length) {
        const empty = document.createElement('p');
        empty.className = 'saved-world-empty';
        empty.textContent = hasWorldStorageConsent() ? '还没有世界。输入种子，生成第一个世界吧。' : '本地世界存储尚未启用。';
        savedWorldList.append(empty);
        return;
    }
    for (const world of worlds) {
        const card = document.createElement('article');
        card.className = 'saved-world-card';
        const info = document.createElement('div');
        const heading = document.createElement('h3');
        heading.textContent = world.n || '未命名世界';
        const details = document.createElement('p');
        const editCount = decodeWorldEdits(world.e).length;
        const updated = world.u ? new Date(world.u).toLocaleString('zh-CN') : '未知时间';
        const savedMode = GAME_MODES[world.m] || GAME_MODES.creative;
        details.textContent = `${savedMode.label} · 种子 ${world.s} · ${editCount} 处方块改动 · ${updated}`;
        info.append(heading, details);
        const actions = document.createElement('div');
        actions.className = 'saved-world-actions';
        const playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.className = 'text-button';
        playButton.textContent = '进入';
        playButton.addEventListener('click', () => loadWorld(world));
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'text-button saved-world-delete';
        deleteButton.textContent = '删除';
        deleteButton.addEventListener('click', () => {
            if (!window.confirm(`确定删除世界“${world.n || '未命名世界'}”吗？此操作无法撤销。`)) return;
            const remaining = readWorldCollection().filter((item) => item.i !== world.i);
            if (!writeWorldCollection(remaining)) {
                setStorageStatus('删除失败：浏览器未允许本地存储。', true);
                return;
            }
            renderSavedWorlds();
        });
        actions.append(playButton, deleteButton);
        card.append(info, actions);
        savedWorldList.append(card);
    }
}

function showMainMenu() {
    mainMenu.hidden = false;
    worldsMenu.hidden = true;
    frontEnd.hidden = false;
}

function showWorldsMenu() {
    mainMenu.hidden = true;
    worldsMenu.hidden = false;
    frontEnd.hidden = false;
    updateStorageAvailability();
    renderSavedWorlds();
    if (hasWorldStorageConsent() && !worldStorageStatus.textContent) {
        setStorageStatus('世界仅保存在这台设备的这个浏览器中。');
    }
}

function loadTexture(path) {
    const texture = textureLoader.load(path);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
}

function loadBlockMaterial(blockType, faceNumber) {
    const definition = BLOCK_DEFINITIONS[blockType];
    const path = definition.texture || `texture-packs/default-1/${definition.textures}${faceNumber}.png`;
    const materialOptions = {
        color: 0xffffff,
        map: loadTexture(path),
        alphaTest: definition.alphaTest || 0,
        side: definition.alphaTest ? THREE.DoubleSide : THREE.FrontSide,
        polygonOffset: Boolean(definition.alphaTest),
        polygonOffsetFactor: definition.alphaTest ? -1 : 0,
        polygonOffsetUnits: definition.alphaTest ? -1 : 0
    };
    if (blockType === 'stone') return new THREE.MeshBasicMaterial(materialOptions);
    return new THREE.MeshLambertMaterial(materialOptions);
}

const blockMaterials = {};
for (const blockType of Object.keys(BLOCK_DEFINITIONS)) {
    const definition = BLOCK_DEFINITIONS[blockType];
    if (definition.texture) {
        const material = loadBlockMaterial(blockType, 1);
        blockMaterials[blockType] = Array(5).fill(material);
    } else {
        blockMaterials[blockType] = [];
        for (let faceNumber = 1; faceNumber <= 5; faceNumber++) {
            blockMaterials[blockType].push(loadBlockMaterial(blockType, faceNumber));
        }
    }
}

function keyOf(x, y, z) {
    return `${x},${y},${z}`;
}

function parseKey(key) {
    return key.split(',').map(Number);
}

function columnIndex(x, z) {
    return z * WORLD_SIZE + x;
}

function inWorldXZ(x, z) {
    return x >= 0 && x < WORLD_SIZE && z >= 0 && z < WORLD_SIZE;
}

function blockAt(x, y, z) {
    return worldBlocks.get(keyOf(x, y, z)) || 'air';
}

function isSolidAt(x, y, z) {
    return blockAt(x, y, z) !== 'air';
}

function shouldRenderBlockFace(blockType, neighborType) {
    if (neighborType === 'air') return true;
    const currentIsTransparent = Boolean(BLOCK_DEFINITIONS[blockType].alphaTest);
    const neighborIsTransparent = Boolean(BLOCK_DEFINITIONS[neighborType].alphaTest);
    if (currentIsTransparent && neighborIsTransparent) return false;
    return currentIsTransparent !== neighborIsTransparent;
}

function smoothStep(edgeStart, edgeEnd, value) {
    const amount = Math.max(0, Math.min(1, (value - edgeStart) / (edgeEnd - edgeStart)));
    return amount * amount * (3 - 2 * amount);
}

function terrainColumn(x, z) {
    const broad = heightNoise.fbm(x * 0.016, z * 0.016, 4);
    const climate = biomeNoise.fbm(x * 0.019 + 37, z * 0.019 - 19, 4);
    const detail = detailNoise.fbm(x * 0.055, z * 0.055, 3);
    const mountainBlend = smoothStep(0.52, 0.7, broad);
    const lowlandHeight = climate > 0.51 ? 4 + detail * 3 : 3 + detail * 2.2;
    const topY = Math.min(26, Math.round(lowlandHeight + mountainBlend * (12 + detail * 4)));
    const biome = mountainBlend > 0.28 ? 'mountain' : climate > 0.51 ? 'forest' : 'plains';
    return { biome, topY };
}

const TERRAIN_SMOOTHING_NEIGHBORS = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
];

function smoothTerrainHeights() {
    const nextHeights = new Int16Array(surfaceHeights.length);
    for (let pass = 0; pass < 32; pass++) {
        nextHeights.set(surfaceHeights);
        let changed = false;
        for (let x = 0; x < WORLD_SIZE; x++) {
            for (let z = 0; z < WORLD_SIZE; z++) {
                const index = columnIndex(x, z);
                let smoothedHeight = surfaceHeights[index];
                for (const [dx, dz] of TERRAIN_SMOOTHING_NEIGHBORS) {
                    const neighborX = x + dx;
                    const neighborZ = z + dz;
                    if (!inWorldXZ(neighborX, neighborZ)) continue;
                    const neighborHeight = surfaceHeights[columnIndex(neighborX, neighborZ)];
                    smoothedHeight = Math.min(smoothedHeight, neighborHeight + 1);
                }
                if (smoothedHeight !== surfaceHeights[index]) {
                    nextHeights[index] = smoothedHeight;
                    changed = true;
                }
            }
        }
        surfaceHeights.set(nextHeights);
        if (!changed) break;
    }
}

function deterministicCell(x, z, salt = 0) {
    let value = Math.imul(x + salt * 17 + currentTerrainSeed, 374761393)
        + Math.imul(z - salt * 31 - currentTerrainSeed, 668265263);
    value = Math.imul(value ^ value >>> 13, 1274126177);
    return ((value ^ value >>> 16) >>> 0) / 4294967296;
}

function growPineTree(x, groundY, z, treeHeight) {
    for (let y = groundY + 1; y <= groundY + treeHeight; y++) {
        worldBlocks.set(keyOf(x, y, z), 'pine_wood');
    }
    const crownBase = groundY + treeHeight - 2;
    const crownTop = groundY + treeHeight + 2;
    for (let y = crownBase; y <= crownTop; y++) {
        const distanceFromTop = crownTop - y;
        const radius = distanceFromTop >= 3 ? 2 : distanceFromTop >= 1 ? 1 : 0;
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
                if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                const leafX = x + dx;
                const leafZ = z + dz;
                if (!inWorldXZ(leafX, leafZ)) continue;
                const leafKey = keyOf(leafX, y, leafZ);
                if (!worldBlocks.has(leafKey)) worldBlocks.set(leafKey, 'pine_leaves');
            }
        }
    }
    for (let y = groundY + 1; y <= groundY + treeHeight; y++) {
        worldBlocks.set(keyOf(x, y, z), 'pine_wood');
    }
}

function createInitialWorld() {
    worldBlocks.clear();
    surfaceHeights.fill(0);
    surfaceBiomes.fill('plains');
    const treeLocations = [];
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            const { biome, topY } = terrainColumn(x, z);
            surfaceHeights[columnIndex(x, z)] = topY;
            surfaceBiomes[columnIndex(x, z)] = biome;
        }
    }
    smoothTerrainHeights();
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            const topY = surfaceHeights[columnIndex(x, z)];
            for (let y = 0; y <= topY; y++) {
                let blockType = 'stone';
                if (y === 0) blockType = 'bedrock';
                else if (y === topY) blockType = 'grass';
                else if (y >= topY - 2) blockType = 'dirt';
                worldBlocks.set(keyOf(x, y, z), blockType);
            }
        }
    }
    for (let x = 3; x < WORLD_SIZE - 3; x++) {
        for (let z = 3; z < WORLD_SIZE - 3; z++) {
            const index = columnIndex(x, z);
            if (surfaceBiomes[index] !== 'forest') continue;
            if (Math.hypot(x + 0.5 - SPAWN_X, z + 0.5 - SPAWN_Z) < 7) continue;
            if (deterministicCell(x, z, 0) > 0.055) continue;
            if (treeLocations.some(([tx, tz]) => Math.abs(tx - x) < 4 && Math.abs(tz - z) < 4)) continue;
            treeLocations.push([x, z]);
            const treeHeight = 4 + Math.floor(deterministicCell(x, z, 1) * 3);
            growPineTree(x, surfaceHeights[index], z, treeHeight);
        }
    }
    const spawnColumnX = Math.floor(SPAWN_X);
    const spawnColumnZ = Math.floor(SPAWN_Z);
    spawnY = surfaceHeights[columnIndex(spawnColumnX, spawnColumnZ)] + 1.04;
    player.pos.set(SPAWN_X, spawnY, SPAWN_Z);
}

const NEIGHBOR_DIRECTIONS = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0],
    [0, -1, 0], [0, 0, 1], [0, 0, -1]
];
const BLOCK_FACES = [
    { normal: [1, 0, 0], vertices: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { normal: [-1, 0, 0], vertices: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { normal: [0, 1, 0], vertices: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { normal: [0, -1, 0], vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { normal: [0, 0, 1], vertices: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
    { normal: [0, 0, -1], vertices: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
];

function createFaceBucket() {
    return { positions: [], normals: [], uvs: [], indices: [] };
}

function appendBlockFace(bucket, x, y, z, face) {
    const vertexOffset = bucket.positions.length / 3;
    for (const [vx, vy, vz] of face.vertices) {
        bucket.positions.push(x + vx, y + vy, z + vz);
        bucket.normals.push(...face.normal);
    }
    bucket.uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
    bucket.indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2, vertexOffset, vertexOffset + 2, vertexOffset + 3);
}

function chunkCoordinate(value) {
    return Math.floor(value / CHUNK_SIZE);
}

function chunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
}

function rebuildChunk(cx, cy, cz) {
    const key = chunkKey(cx, cy, cz);
    const previousGroup = chunkGroups.get(key);
    if (previousGroup) {
        worldGroup.remove(previousGroup);
        previousGroup.traverse((child) => {
            if (child.isMesh && child.geometry) child.geometry.dispose();
        });
        chunkGroups.delete(key);
    }
    const faceBuckets = {};
    for (const blockType of Object.keys(blockMaterials)) {
        for (let materialIndex = 0; materialIndex < 5; materialIndex++) {
            faceBuckets[`${blockType}:${materialIndex}`] = createFaceBucket();
        }
    }
    const startX = cx * CHUNK_SIZE;
    const startY = cy * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;
    for (let x = startX; x < startX + CHUNK_SIZE; x++) {
        for (let y = startY; y < startY + CHUNK_SIZE; y++) {
            for (let z = startZ; z < startZ + CHUNK_SIZE; z++) {
                const blockType = blockAt(x, y, z);
                if (blockType === 'air') continue;
                for (let faceIndex = 0; faceIndex < BLOCK_FACES.length; faceIndex++) {
                    const face = BLOCK_FACES[faceIndex];
                    const [dx, dy, dz] = face.normal;
                    const neighborType = blockAt(x + dx, y + dy, z + dz);
                    if (!shouldRenderBlockFace(blockType, neighborType)) continue;
                    const materialIndex = Math.min(faceIndex, 4);
                    appendBlockFace(faceBuckets[`${blockType}:${materialIndex}`], x, y, z, face);
                }
            }
        }
    }
    const chunkGroup = new THREE.Group();
    chunkGroup.userData.chunk = { x: cx, y: cy, z: cz };
    for (const [materialKey, bucket] of Object.entries(faceBuckets)) {
        if (!bucket.indices.length) continue;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
        geometry.setIndex(bucket.indices);
        geometry.computeBoundingSphere();
        const [blockType, materialIndexText] = materialKey.split(':');
        const mesh = new THREE.Mesh(geometry, blockMaterials[blockType][Number(materialIndexText)]);
        mesh.userData.kind = 'chunk-faces';
        mesh.userData.blockType = blockType;
        chunkGroup.add(mesh);
    }
    if (chunkGroup.children.length) {
        worldGroup.add(chunkGroup);
        chunkGroups.set(key, chunkGroup);
    }
}

function clearRenderedWorld() {
    for (const group of [...worldGroup.children]) {
        group.traverse((child) => {
            if (child.isMesh && child.geometry) child.geometry.dispose();
        });
        worldGroup.remove(group);
    }
    chunkGroups.clear();
}

function rebuildAllChunks() {
    clearRenderedWorld();
    const chunks = new Set();
    for (const key of worldBlocks.keys()) {
        const [x, y, z] = parseKey(key);
        chunks.add(chunkKey(chunkCoordinate(x), chunkCoordinate(y), chunkCoordinate(z)));
    }
    for (const key of chunks) {
        const [cx, cy, cz] = parseKey(key);
        rebuildChunk(cx, cy, cz);
    }
}

function rebuildChunksAround(x, y, z) {
    const chunks = new Set();
    for (const [dx, dy, dz] of [[0, 0, 0], ...NEIGHBOR_DIRECTIONS]) {
        chunks.add(chunkKey(chunkCoordinate(x + dx), chunkCoordinate(y + dy), chunkCoordinate(z + dz)));
    }
    for (const key of chunks) {
        const [cx, cy, cz] = parseKey(key);
        rebuildChunk(cx, cy, cz);
    }
}

function applySavedEdits(encoded) {
    worldEdits.clear();
    editOriginalBlocks.clear();
    for (const edit of decodeWorldEdits(encoded)) {
        const key = keyOf(edit.x, edit.y, edit.z);
        const original = blockAt(edit.x, edit.y, edit.z);
        if (edit.blockType === original) continue;
        editOriginalBlocks.set(key, original);
        worldEdits.set(key, edit.blockType);
        if (edit.blockType === 'air') worldBlocks.delete(key);
        else worldBlocks.set(key, edit.blockType);
    }
}

function saveActiveWorld() {
    if (!activeWorld || !hasWorldStorageConsent()) return false;
    window.clearTimeout(saveTimer);
    saveTimer = 0;
    const worlds = readWorldCollection();
    const index = worlds.findIndex((world) => world.i === activeWorld.i);
    if (index < 0) return false;
    const saved = {
        i: activeWorld.i,
        n: activeWorld.n,
        s: activeWorld.s,
        m: activeWorld.m,
        u: Date.now(),
        e: encodeWorldEdits(),
        h: health,
        p: serializeSurvivalInventory()
    };
    worlds[index] = saved;
    if (!writeWorldCollection(worlds)) {
        saveIndicator.textContent = '保存失败';
        return false;
    }
    activeWorld = saved;
    saveIndicator.textContent = `已保存 ${new Date(saved.u).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    return true;
}

function scheduleWorldSave() {
    if (!activeWorld) return;
    saveIndicator.textContent = '有未保存的改动';
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveActiveWorld, 800);
}

function setEditedBlock(x, y, z, blockType) {
    const key = keyOf(x, y, z);
    if (!editOriginalBlocks.has(key)) editOriginalBlocks.set(key, blockAt(x, y, z));
    const original = editOriginalBlocks.get(key);
    if (blockType === original) {
        worldEdits.delete(key);
        editOriginalBlocks.delete(key);
    } else {
        worldEdits.set(key, blockType);
    }
    if (blockType === 'air') worldBlocks.delete(key);
    else worldBlocks.set(key, blockType);
    scheduleWorldSave();
}

function finishLoadingWorld(world) {
    activeWorld = {
        ...world,
        m: GAME_MODES[world.m] ? world.m : 'creative',
        e: typeof world.e === 'string' ? world.e : ''
    };
    configureTerrainSeed(activeWorld.s);
    clearDroppedItems();
    commandLog.replaceChildren();
    commandConsole.hidden = true;
    createInitialWorld();
    applySavedEdits(activeWorld.e);
    rebuildAllChunks();
    worldActive = true;
    isDead = false;
    initializeInventoryForWorld(activeWorld);
    health = Number.isFinite(activeWorld.h) ? Math.max(0.5, Math.min(MAX_HEALTH, activeWorld.h)) : MAX_HEALTH;
    previousHealth = health;
    setGameMode(activeWorld.m, true);
    deathScreen.hidden = true;
    game.classList.remove('world-inactive');
    frontEnd.hidden = true;
    worldControls.hidden = false;
    saveIndicator.textContent = '已保存';
    respawnPlayer(false);
    renderInventory();
}

function loadWorld(world) {
    if (!world || worldActive) return;
    setStorageStatus(`正在生成“${world.n || '未命名世界'}”…`);
    requestAnimationFrame(() => requestAnimationFrame(() => finishLoadingWorld(world)));
}

function saveAndExitWorld() {
    if (!worldActive) return;
    saveActiveWorld();
    worldActive = false;
    keys.clear();
    stopMining();
    closeInventory();
    closeChat();
    commandConsole.hidden = true;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    faceHighlight.visible = false;
    deathScreen.hidden = true;
    worldControls.hidden = true;
    game.classList.add('world-inactive');
    clearRenderedWorld();
    worldBlocks.clear();
    worldEdits.clear();
    editOriginalBlocks.clear();
    clearDroppedItems();
    activeWorld = null;
    setStorageStatus('世界已保存。');
    showWorldsMenu();
}

function createWorldFromForm() {
    if (!updateStorageAvailability()) return;
    const worlds = readWorldCollection();
    const seed = worldSeedInput.value.trim() || randomSeedText();
    const name = worldNameInput.value.trim() || `世界 ${worlds.length + 1}`;
    const mode = GAME_MODES[worldModeInput.value] ? worldModeInput.value : 'survival';
    const world = { i: makeWorldId(), n: name, s: seed, m: mode, u: Date.now(), e: '', h: MAX_HEALTH };
    worlds.push(world);
    if (!writeWorldCollection(worlds)) {
        setStorageStatus('创建失败：浏览器无法写入本地存储，可能是空间不足或权限受限。', true);
        return;
    }
    worldNameInput.value = '';
    worldSeedInput.value = '';
    loadWorld(world);
}

function playerCollides(pos) {
    const xs = [pos.x - PLAYER_RADIUS, pos.x + PLAYER_RADIUS];
    const zs = [pos.z - PLAYER_RADIUS, pos.z + PLAYER_RADIUS];
    for (let y = Math.floor(pos.y); y <= Math.floor(pos.y + PLAYER_HEIGHT); y++) {
        for (const sx of xs) {
            for (const sz of zs) {
                if (isSolidAt(Math.floor(sx), y, Math.floor(sz))) return true;
            }
        }
    }
    return false;
}

function hasSupportBelow(pos) {
    const supportY = Math.floor(pos.y - 0.05);
    const xs = [pos.x - PLAYER_RADIUS, pos.x + PLAYER_RADIUS];
    const zs = [pos.z - PLAYER_RADIUS, pos.z + PLAYER_RADIUS];
    for (const sx of xs) {
        for (const sz of zs) {
            if (isSolidAt(Math.floor(sx), supportY, Math.floor(sz))) return true;
        }
    }
    return false;
}

function moveAxis(axis, amount, preventLedgeFall = false, canStepUp = false) {
    if (!amount) return;
    const next = player.pos.clone();
    next[axis] += amount;
    if (preventLedgeFall && !hasSupportBelow(next)) return;
    if (!playerCollides(next)) {
        player.pos.copy(next);
        return;
    }
    if (axis !== 'y' && canStepUp) {
        const stepped = next.clone();
        stepped.y += STEP_HEIGHT;
        if (!playerCollides(stepped)) {
            cameraStepOffset -= stepped.y - player.pos.y;
            player.pos.copy(stepped);
            player.velocity.y = 0;
            player.onGround = true;
            return;
        }
    }
    if (axis === 'y') {
        player.velocity.y = 0;
        if (amount < 0) player.onGround = true;
    }
}

function currentBiome() {
    const x = Math.floor(player.pos.x);
    const z = Math.floor(player.pos.z);
    if (!inWorldXZ(x, z)) return 'plains';
    return surfaceBiomes[columnIndex(x, z)] || 'plains';
}

function updateCoords() {
    const movementState = player.flying ? '  ·  飞行' : player.sneaking ? '  ·  潜行' : player.sprinting ? '  ·  疾跑' : '';
    coordsLabel.textContent = `X ${Math.floor(player.pos.x)}  Y ${Math.floor(player.pos.y)}  Z ${Math.floor(player.pos.z)}${movementState}`;
    biomeLabel.textContent = BIOMES[currentBiome()].label;
}

function renderHealth() {
    healthBar.replaceChildren();
    const flashing = damageFlashUntil > performance.now() && previousHealth > health;
    for (let index = 0; index < MAX_HEALTH; index++) {
        const fill = Math.max(0, Math.min(1, health - index));
        const oldFill = Math.max(0, Math.min(1, previousHealth - index));
        const heart = document.createElement('span');
        heart.className = 'health-heart';
        heart.style.setProperty('--heart-fill', `${fill * 100}%`);
        const fillLayer = document.createElement('span');
        fillLayer.className = 'health-heart-fill';
        const missingLayer = document.createElement('span');
        missingLayer.className = 'health-heart-missing';
        heart.append(fillLayer, missingLayer);
        if (flashing && oldFill > fill) {
            const flash = document.createElement('span');
            flash.className = 'health-heart-flash';
            flash.style.setProperty('--flash-left', `${fill * 100}%`);
            flash.style.setProperty('--flash-width', `${(oldFill - fill) * 100}%`);
            heart.append(flash);
        }
        healthBar.append(heart);
    }
    healthBar.setAttribute('aria-label', `生命值 ${health} / ${MAX_HEALTH}`);
}

function setHealth(value, deathReason = '生命值归零') {
    const nextHealth = Math.max(0, Math.min(MAX_HEALTH, Number(value)));
    if (!Number.isFinite(nextHealth)) return false;
    const oldHealth = health;
    previousHealth = oldHealth;
    health = nextHealth;
    if (health < oldHealth) {
        damageFlashUntil = performance.now() + 200;
        window.setTimeout(() => {
            if (worldActive) {
                previousHealth = health;
                renderHealth();
            }
        }, 205);
    } else {
        previousHealth = health;
        damageFlashUntil = 0;
    }
    renderHealth();
    if (worldActive) scheduleWorldSave();
    if (health <= 0 && !isDead) killPlayer(deathReason);
    return true;
}

function updateVoidDamage() {
    if (currentGameMode !== 'survival') return;
    if (player.pos.y > VOID_DAMAGE_START_Y) {
        lastVoidDamageLevel = 0;
        return;
    }
    const damageLevel = Math.floor((VOID_DAMAGE_START_Y - player.pos.y) / VOID_DAMAGE_STEP) + 1;
    if (damageLevel <= lastVoidDamageLevel) return;
    const crossedLevels = damageLevel - lastVoidDamageLevel;
    lastVoidDamageLevel = damageLevel;
    setHealth(health - crossedLevels * VOID_DAMAGE_AMOUNT, '坠入虚空');
}

function killPlayer(reasonZh) {
    if (isDead) return;
    isDead = true;
    respawnAt = performance.now() + RESPAWN_DELAY_MS;
    player.velocity.set(0, 0, 0);
    player.sprinting = false;
    player.sprintArmed = false;
    player.sneaking = false;
    player.onGround = false;
    keys.clear();
    jumpQueuedUntil = 0;
    stopMining();
    closeInventory();
    closeChat();
    commandConsole.hidden = true;
    faceHighlight.visible = false;
    crackPlane.visible = false;
    if (currentGameMode === 'survival' && health > 0) {
        previousHealth = health;
        health = 0;
        renderHealth();
    }
    deathReasonZhLabel.textContent = reasonZh;
    respawnCountdownLabel.textContent = String(Math.ceil(RESPAWN_DELAY_MS / 1000));
    deathScreen.hidden = false;
}

function respawnPlayer(resetHealth = true) {
    player.pos.set(SPAWN_X, spawnY, SPAWN_Z);
    player.velocity.set(0, 0, 0);
    player.yaw = Math.PI;
    player.pitch = -0.38;
    player.onGround = false;
    player.sprinting = false;
    player.sprintArmed = false;
    player.sneaking = false;
    player.flying = false;
    cameraStepOffset = 0;
    jumpQueuedUntil = 0;
    keys.clear();
    isDead = false;
    lastVoidDamageLevel = 0;
    if (resetHealth) {
        health = MAX_HEALTH;
        previousHealth = health;
        damageFlashUntil = 0;
        if (currentGameMode === 'survival') renderHealth();
        scheduleWorldSave();
    }
    deathScreen.hidden = true;
    updatePlayer(0);
}

function updateDeathState(now) {
    const remainingMs = Math.max(0, respawnAt - now);
    respawnCountdownLabel.textContent = String(Math.ceil(remainingMs / 1000));
    if (remainingMs <= 0) respawnPlayer();
}

function updatePlayer(delta) {
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const wish = new THREE.Vector3();
    if (!inventoryOpen && !commandOpen) {
        if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(forward);
        if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(forward);
        if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
        if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
    }
    const isMoving = wish.lengthSq() > 0;
    if (isMoving) {
        wish.normalize();
        if (player.sprintArmed) {
            player.sprinting = true;
            player.sprintArmed = false;
        }
    } else if (player.sprinting) {
        player.sprinting = false;
    }
    const speedMultiplier = player.flying ? 1 : player.sneaking ? SNEAK_SPEED_MULTIPLIER : player.sprinting ? SPRINT_SPEED_MULTIPLIER : 1;
    player.velocity.x = wish.x * WALK_SPEED * speedMultiplier;
    player.velocity.z = wish.z * WALK_SPEED * speedMultiplier;
    const now = performance.now();
    if (player.flying) {
        const flyingUp = keys.has('Space') ? 1 : 0;
        const flyingDown = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0;
        player.velocity.y = (flyingUp - flyingDown) * FLY_SPEED;
        player.sneaking = false;
        jumpQueuedUntil = 0;
    } else {
        if (keys.has('Space') && !inventoryOpen && !commandOpen) jumpQueuedUntil = now + JUMP_BUFFER_MS;
        if (player.onGround && jumpQueuedUntil >= now) {
            player.velocity.y = JUMP_SPEED;
            player.onGround = false;
            jumpQueuedUntil = 0;
        } else if (jumpQueuedUntil < now) {
            jumpQueuedUntil = 0;
        }
        player.velocity.y = Math.max(player.velocity.y - GRAVITY * delta, -30);
    }
    const wasOnGround = player.onGround;
    player.onGround = false;
    const preventLedgeFall = !player.flying && player.sneaking && wasOnGround;
    moveAxis('x', player.velocity.x * delta, preventLedgeFall, wasOnGround);
    moveAxis('z', player.velocity.z * delta, preventLedgeFall, wasOnGround);
    moveAxis('y', player.velocity.y * delta);
    cameraStepOffset += (0 - cameraStepOffset) * Math.min(1, delta * 12);
    if (Math.abs(cameraStepOffset) < 0.001) cameraStepOffset = 0;
    const eyeHeight = player.sneaking ? SNEAK_EYE_HEIGHT : EYE_HEIGHT;
    camera.position.set(player.pos.x, player.pos.y + eyeHeight + cameraStepOffset, player.pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    updateCoords();
}

function firstVoxelBoundaryDistance(position, direction) {
    if (direction > 0) return (Math.floor(position) + 1 - position) / direction;
    if (direction < 0) return (position - Math.floor(position)) / -direction;
    return Infinity;
}

function getAimHit() {
    raycaster.setFromCamera(aimPoint, camera);
    const origin = raycaster.ray.origin;
    const direction = raycaster.ray.direction;
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);
    const stepX = Math.sign(direction.x);
    const stepY = Math.sign(direction.y);
    const stepZ = Math.sign(direction.z);
    const deltaX = direction.x === 0 ? Infinity : Math.abs(1 / direction.x);
    const deltaY = direction.y === 0 ? Infinity : Math.abs(1 / direction.y);
    const deltaZ = direction.z === 0 ? Infinity : Math.abs(1 / direction.z);
    let maxX = firstVoxelBoundaryDistance(origin.x, direction.x);
    let maxY = firstVoxelBoundaryDistance(origin.y, direction.y);
    let maxZ = firstVoxelBoundaryDistance(origin.z, direction.z);
    let distance = 0;
    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;
    while (distance <= MAX_REACH) {
        const blockType = blockAt(x, y, z);
        if (blockType !== 'air') {
            aimHitBlock.x = x;
            aimHitBlock.y = y;
            aimHitBlock.z = z;
            aimHitNormal.set(normalX, normalY, normalZ);
            aimHit.blockType = blockType;
            aimHit.distance = distance;
            return aimHit;
        }
        if (maxX <= maxY && maxX <= maxZ) {
            x += stepX;
            distance = maxX;
            maxX += deltaX;
            normalX = -stepX; normalY = 0; normalZ = 0;
        } else if (maxY <= maxZ) {
            y += stepY;
            distance = maxY;
            maxY += deltaY;
            normalX = 0; normalY = -stepY; normalZ = 0;
        } else {
            z += stepZ;
            distance = maxZ;
            maxZ += deltaZ;
            normalX = 0; normalY = 0; normalZ = -stepZ;
        }
    }
    return null;
}

function updateFaceHighlight() {
    const hit = getAimHit();
    if (!hit) {
        faceHighlight.visible = false;
        return;
    }
    faceNormal.copy(hit.normal);
    faceBlockCenter.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
    faceHighlight.position.copy(faceBlockCenter).addScaledVector(faceNormal, 0.502);
    faceHighlight.quaternion.setFromUnitVectors(faceForward, faceNormal);
    faceHighlight.visible = true;
}

function wouldBlockPlayer(x, y, z) {
    return x + 1 > player.pos.x - PLAYER_RADIUS && x < player.pos.x + PLAYER_RADIUS &&
        z + 1 > player.pos.z - PLAYER_RADIUS && z < player.pos.z + PLAYER_RADIUS &&
        y + 1 > player.pos.y && y < player.pos.y + PLAYER_HEIGHT;
}

function defaultSurvivalInventory() {
    const tools = ['wooden_axe', 'wooden_pickaxe', 'stone_axe', 'stone_pickaxe'];
    return {
        a: Array(HOTBAR_SIZE).fill(null),
        b: [...tools],
        q: Object.fromEntries(tools.map((itemId) => [itemId, 1]))
    };
}

function defaultCreativeInventory() {
    const bar = ['grass', 'dirt', 'stone', 'bedrock', 'pine_wood', 'pine_planks', 'pine_leaves', null, null, null];
    return {
        a: bar,
        b: Object.keys(ITEM_DEFINITIONS),
        q: {}
    };
}

function normalizeInventoryState(state, fallback) {
    if (!state || !Array.isArray(state.a) || !Array.isArray(state.b)) return fallback();
    const validItem = (itemId) => itemId === null || Boolean(ITEM_DEFINITIONS[itemId]);
    const bar = state.a.slice(0, HOTBAR_SIZE).filter(validItem);
    while (bar.length < HOTBAR_SIZE) bar.push(null);
    const backpack = state.b.filter((itemId) => validItem(itemId) && itemId !== null);
    const counts = {};
    if (state.q && typeof state.q === 'object') {
        for (const [itemId, count] of Object.entries(state.q)) {
            if (ITEM_DEFINITIONS[itemId] && Number.isFinite(count) && count > 0) counts[itemId] = Math.floor(count);
        }
    }
    return { a: bar, b: backpack, q: counts };
}

function captureInventoryState() {
    return { a: [...hotbarItems], b: [...backpackItems], q: Object.fromEntries(itemCounts) };
}

function applyInventoryState(state) {
    hotbarItems = [...state.a];
    backpackItems = [...state.b];
    itemCounts.clear();
    for (const [itemId, count] of Object.entries(state.q || {})) itemCounts.set(itemId, count);
    selectedSlot = Math.min(selectedSlot, HOTBAR_SIZE - 1);
    renderInventory();
}

function initializeInventoryForWorld(world) {
    survivalInventoryState = normalizeInventoryState(world.p, defaultSurvivalInventory);
    creativeInventoryState = defaultCreativeInventory();
}

function serializeSurvivalInventory() {
    if (currentGameMode === 'survival') survivalInventoryState = captureInventoryState();
    return survivalInventoryState || defaultSurvivalInventory();
}

function setGameMode(mode, force = false) {
    if (!GAME_MODES[mode]) return false;
    if (!force && currentGameMode === mode) return true;
    if (!force) {
        if (currentGameMode === 'survival') survivalInventoryState = captureInventoryState();
        else creativeInventoryState = captureInventoryState();
    }
    currentGameMode = mode;
    player.flying = false;
    lastSpaceTapAt = -Infinity;
    stopMining();
    applyInventoryState(mode === 'survival'
        ? (survivalInventoryState || defaultSurvivalInventory())
        : (creativeInventoryState || defaultCreativeInventory()));
    modeLabel.textContent = GAME_MODES[mode].label;
    healthBar.hidden = mode !== 'survival';
    if (mode === 'survival') renderHealth();
    return true;
}

function removeEmptyItem(itemId) {
    if ((itemCounts.get(itemId) || 0) > 0) return;
    itemCounts.delete(itemId);
    hotbarItems = hotbarItems.map((current) => current === itemId ? null : current);
    backpackItems = backpackItems.filter((current) => current !== itemId);
}

function addItemToInventory(itemId, amount = 1) {
    if (!ITEM_DEFINITIONS[itemId] || amount <= 0) return false;
    const existing = hotbarItems.includes(itemId) || backpackItems.includes(itemId);
    itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + amount);
    if (!existing) {
        const emptyIndex = hotbarItems.indexOf(null);
        if (emptyIndex >= 0) hotbarItems[emptyIndex] = itemId;
        else backpackItems.push(itemId);
    }
    renderInventory();
    scheduleWorldSave();
    return true;
}

function consumeActiveBlock() {
    if (currentGameMode === 'creative') return true;
    const itemId = activeItemId();
    const count = itemCounts.get(itemId) || 0;
    if (count <= 0) return false;
    itemCounts.set(itemId, count - 1);
    removeEmptyItem(itemId);
    renderInventory();
    return true;
}

function activeItemId() {
    return hotbarItems[selectedSlot];
}

function activeItem() {
    return ITEM_DEFINITIONS[activeItemId()] || null;
}

function heldPixelMaterial(color) {
    const cacheKey = color.toString(16);
    if (!heldMaterialCache.has(cacheKey)) {
        heldMaterialCache.set(cacheKey, new THREE.MeshBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            fog: false
        }));
    }
    return heldMaterialCache.get(cacheKey);
}

function loadToolPixels(itemId, item) {
    if (toolPixelCache.has(itemId) || toolPixelLoads.has(itemId)) return;
    const load = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const pixelCanvas = document.createElement('canvas');
            pixelCanvas.width = 16;
            pixelCanvas.height = 16;
            const context = pixelCanvas.getContext('2d', { willReadFrequently: true });
            context.imageSmoothingEnabled = false;
            context.clearRect(0, 0, 16, 16);
            context.drawImage(image, 0, 0, 16, 16);
            const data = context.getImageData(0, 0, 16, 16).data;
            const pixels = [];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const offset = (y * 16 + x) * 4;
                    if (data[offset + 3] < 128) continue;
                    pixels.push({
                        x,
                        y,
                        color: (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]
                    });
                }
            }
            const pivotY = Math.max(...pixels.map((pixel) => pixel.y));
            const handleEndPixels = pixels.filter((pixel) => pixel.y === pivotY);
            const pivotX = handleEndPixels.reduce((sum, pixel) => sum + pixel.x, 0) / handleEndPixels.length;
            const sprite = { pixels, pivotX, pivotY };
            toolPixelCache.set(itemId, sprite);
            toolPixelLoads.delete(itemId);
            resolve(sprite);
        };
        image.onerror = reject;
        image.src = item.icon;
    });
    toolPixelLoads.set(itemId, load);
    load.then(() => {
        if (activeItemId() !== itemId) return;
        renderedHeldItemId = '';
        rebuildHeldItem();
    }).catch(() => {
        toolPixelLoads.delete(itemId);
    });
}

function rebuildHeldItem() {
    const itemId = activeItemId() || '';
    if (renderedHeldItemId === itemId) return;
    renderedHeldItemId = itemId;
    while (heldItemRoot.children.length) {
        heldItemRoot.remove(heldItemRoot.children[0]);
    }
    const item = ITEM_DEFINITIONS[itemId];
    if (!item || item.kind !== 'tool') {
        heldItemRoot.visible = false;
        return;
    }
    const sprite = toolPixelCache.get(itemId);
    if (!sprite) {
        heldItemRoot.visible = false;
        loadToolPixels(itemId, item);
        return;
    }
    for (const sourcePixel of sprite.pixels) {
        const pixel = new THREE.Mesh(heldPixelGeometry, heldPixelMaterial(sourcePixel.color));
        pixel.position.set(
            (sourcePixel.x - sprite.pivotX) * HELD_PIXEL_SIZE,
            (sprite.pivotY - sourcePixel.y) * HELD_PIXEL_SIZE,
            0
        );
        pixel.renderOrder = 1000;
        heldItemRoot.add(pixel);
    }
}

function updateHeldItemAnimation(now) {
    rebuildHeldItem();
    const item = activeItem();
    const shouldShow = worldActive && !inventoryOpen && !commandOpen && !isDead && item && item.kind === 'tool';
    heldItemRoot.visible = Boolean(shouldShow);
    if (!shouldShow) return;
    const moving = keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD');
    const bob = moving && !player.flying ? Math.sin(now * 0.009) : 0;
    const swingElapsed = Math.max(0, now - toolSwingStartedAt);
    const singleSwing = swingElapsed < TOOL_SWING_DURATION_MS
        ? Math.sin(Math.PI * swingElapsed / TOOL_SWING_DURATION_MS)
        : 0;
    const repeatedSwing = miningHeld ? (1 - Math.cos(swingElapsed * 0.022)) * 0.5 : 0;
    const swing = miningHeld ? repeatedSwing : singleSwing;
    heldItemRoot.position.set(0.72 + bob * 0.018, -0.78 + Math.abs(bob) * 0.02, -1.3);
    heldItemRoot.rotation.order = 'XYZ';
    heldItemRoot.rotation.set(0, 0, swing * 0.82);
}

function createItemIcon(itemId) {
    const definition = ITEM_DEFINITIONS[itemId];
    const icon = document.createElement('span');
    icon.className = 'item-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (!definition) return icon;
    if (definition.kind === 'tool') icon.classList.add('tool-icon');
    icon.style.backgroundImage = `url("${definition.icon}")`;
    return icon;
}

function selectSlot(index) {
    selectedSlot = (index + HOTBAR_SIZE) % HOTBAR_SIZE;
    renderHotbar();
    stopMining();
}

function moveHotbarItemToBackpack(index) {
    const itemId = hotbarItems[index];
    if (!itemId) return;
    if (currentGameMode === 'survival' && !backpackItems.includes(itemId)) backpackItems.push(itemId);
    hotbarItems[index] = null;
    inventoryStatus.textContent = currentGameMode === 'creative'
        ? `${ITEM_DEFINITIONS[itemId].label} 已从物品栏移除，背包中仍可无限取用。`
        : `${ITEM_DEFINITIONS[itemId].label} 已移入背包。`;
    renderInventory();
}

function moveBackpackItemToHotbar(backpackIndex) {
    const emptyIndex = hotbarItems.indexOf(null);
    if (emptyIndex < 0) {
        inventoryStatus.textContent = '物品栏已满。';
        return;
    }
    const itemId = currentGameMode === 'creative'
        ? backpackItems[backpackIndex]
        : backpackItems.splice(backpackIndex, 1)[0];
    hotbarItems[emptyIndex] = itemId;
    inventoryStatus.textContent = `${ITEM_DEFINITIONS[itemId].label} 已移入第 ${emptyIndex + 1} 格。`;
    renderInventory();
}

function renderHotbar() {
    hotbar.replaceChildren();
    for (let index = 0; index < HOTBAR_SIZE; index++) {
        const itemId = hotbarItems[index];
        const item = ITEM_DEFINITIONS[itemId];
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = `slot${index === selectedSlot ? ' selected' : ''}${item ? '' : ' empty'}`;
        slot.title = item ? item.label : '空物品栏格';
        slot.setAttribute('aria-pressed', String(index === selectedSlot));
        slot.tabIndex = inventoryOpen ? 0 : -1;
        slot.append(createItemIcon(itemId));
        const key = document.createElement('span');
        key.className = 'slot-key';
        key.textContent = index === 9 ? '0' : String(index + 1);
        slot.append(key);
        if (item && (currentGameMode === 'creative' || (itemCounts.get(itemId) || 0) > 1)) {
            const count = document.createElement('span');
            count.className = 'item-count';
            count.textContent = currentGameMode === 'creative' ? '∞' : String(itemCounts.get(itemId));
            slot.append(count);
        }
        slot.addEventListener('click', (event) => {
            if (!inventoryOpen) return;
            if (event.shiftKey) moveHotbarItemToBackpack(index);
            else selectSlot(index);
        });
        hotbar.append(slot);
    }
}

function renderBackpack() {
    backpackGrid.replaceChildren();
    if (!backpackItems.length) {
        const empty = document.createElement('p');
        empty.className = 'backpack-empty';
        empty.textContent = '背包是空的。Shift + 点击下方物品栏中的物品可将其移入这里。';
        backpackGrid.append(empty);
        return;
    }
    backpackItems.forEach((itemId, index) => {
        const item = ITEM_DEFINITIONS[itemId];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'backpack-item';
        button.title = `${item.label}（Shift + 点击移入物品栏）`;
        button.setAttribute('aria-label', item.label);
        button.append(createItemIcon(itemId));
        if (currentGameMode === 'creative' || (itemCounts.get(itemId) || 0) > 1) {
            const count = document.createElement('span');
            count.className = 'item-count';
            count.textContent = currentGameMode === 'creative' ? '∞' : String(itemCounts.get(itemId));
            button.append(count);
        }
        button.addEventListener('click', (event) => {
            if (event.shiftKey) moveBackpackItemToHotbar(index);
            else inventoryStatus.textContent = `按住 Shift 点击 ${item.label}，可快速移入物品栏。`;
        });
        backpackGrid.append(button);
    });
}

function renderInventory() {
    renderHotbar();
    renderBackpack();
}

function openInventory() {
    if (!worldActive || isDead || inventoryOpen) return;
    inventoryOpen = true;
    keys.clear();
    player.sprinting = false;
    player.sprintArmed = false;
    player.sneaking = false;
    stopMining();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    inventoryStatus.textContent = '';
    inventoryScreen.hidden = false;
    game.classList.add('inventory-open');
    renderInventory();
}

function closeInventory() {
    if (!inventoryOpen) return;
    inventoryOpen = false;
    inventoryScreen.hidden = true;
    game.classList.remove('inventory-open');
    renderHotbar();
}

function toggleInventory() {
    if (inventoryOpen) closeInventory();
    else openInventory();
}

function placeBlock(hit) {
    const item = activeItem();
    if (!hit || !item || item.kind !== 'block') return;
    if (currentGameMode === 'survival' && (itemCounts.get(activeItemId()) || 0) <= 0) return;
    const x = hit.block.x + hit.normal.x;
    const y = hit.block.y + hit.normal.y;
    const z = hit.block.z + hit.normal.z;
    if (!inWorldXZ(x, z) || y < 0 || y >= MAX_PLACE_HEIGHT) return;
    if (blockAt(x, y, z) !== 'air' || wouldBlockPlayer(x, y, z)) return;
    setEditedBlock(x, y, z, item.blockType);
    rebuildChunksAround(x, y, z);
    consumeActiveBlock();
}

const dropGeometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);

function spawnBlockDrop(blockType, x, y, z) {
    if (!ITEM_DEFINITIONS[blockType]) return;
    let supportY = y - 1;
    while (supportY >= 0 && blockAt(x, supportY, z) === 'air') supportY--;
    const materials = blockMaterials[blockType];
    const mesh = new THREE.Mesh(dropGeometry, [materials[0], materials[1], materials[2], materials[3], materials[4], materials[4]]);
    const baseY = supportY + 1.2;
    mesh.position.set(x + 0.5, baseY, z + 0.5);
    mesh.rotation.set(0.16, Math.random() * Math.PI * 2, -0.1);
    dropGroup.add(mesh);
    droppedItems.push({ mesh, itemId: blockType, baseY, phase: Math.random() * Math.PI * 2 });
}

function clearDroppedItems() {
    for (const drop of droppedItems) dropGroup.remove(drop.mesh);
    droppedItems.length = 0;
}

function updateDroppedItems(delta, now) {
    if (currentGameMode !== 'survival') return;
    for (let index = droppedItems.length - 1; index >= 0; index--) {
        const drop = droppedItems[index];
        drop.mesh.rotation.y += delta * 1.4;
        drop.mesh.position.y = drop.baseY + Math.sin(now * 0.002 + drop.phase) * 0.035;
        const dx = drop.mesh.position.x - player.pos.x;
        const dy = drop.mesh.position.y - (player.pos.y + 0.65);
        const dz = drop.mesh.position.z - player.pos.z;
        if (dx * dx + dy * dy + dz * dz > DROP_PICKUP_RADIUS * DROP_PICKUP_RADIUS) continue;
        if (addItemToInventory(drop.itemId, 1)) {
            dropGroup.remove(drop.mesh);
            droppedItems.splice(index, 1);
        }
    }
}

function removeBlock(hit, createDrop = currentGameMode === 'survival') {
    if (!hit) return;
    const blockType = blockAt(hit.block.x, hit.block.y, hit.block.z);
    if (blockType === 'air') return;
    setEditedBlock(hit.block.x, hit.block.y, hit.block.z, 'air');
    rebuildChunksAround(hit.block.x, hit.block.y, hit.block.z);
    if (createDrop && (blockType !== 'stone' || hasStoneDropTool())) {
        spawnBlockDrop(blockType, hit.block.x, hit.block.y, hit.block.z);
    }
}

function miningMultiplier(blockType) {
    const item = activeItem();
    if (!item || item.kind !== 'tool') return 1;
    const isWood = blockType === 'pine_wood' || blockType === 'pine_planks' || blockType === 'pine_leaves';
    const isSoil = blockType === 'dirt' || blockType === 'grass';
    if (item.toolType === 'axe' && isWood) return item.tier === 'stone' ? 0.7 : 0.8;
    if (item.toolType === 'pickaxe' && blockType === 'stone') return item.tier === 'stone' ? 0.7 : 0.85;
    if (item.toolType === 'pickaxe' && isSoil) return item.tier === 'stone' ? 0.7 : 0.8;
    return 1;
}

function hasStoneDropTool() {
    const item = activeItem();
    return item && item.kind === 'tool' && item.toolType === 'pickaxe';
}

function stopMining() {
    miningHeld = false;
    resetMiningTarget();
}

function resetMiningTarget() {
    miningTargetKey = '';
    miningStartedAt = 0;
    miningDurationMs = 0;
    breakProgress.hidden = true;
    breakFill.style.width = '0%';
    crackPlane.visible = false;
}

function updateCrackOverlay(hit, progress) {
    const stage = Math.min(9, Math.floor(progress * 10));
    crackMaterial.map = crackTextures[stage];
    faceNormal.copy(hit.normal);
    faceBlockCenter.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
    crackPlane.position.copy(faceBlockCenter).addScaledVector(faceNormal, 0.504);
    crackPlane.quaternion.setFromUnitVectors(faceForward, faceNormal);
    crackPlane.visible = true;
}

function updateMining(now) {
    if (currentGameMode !== 'survival' || !miningHeld || inventoryOpen || commandOpen || isDead || document.pointerLockElement !== canvas) {
        if (miningHeld) resetMiningTarget();
        return;
    }
    const hit = getAimHit();
    if (!hit) {
        resetMiningTarget();
        return;
    }
    const targetKey = keyOf(hit.block.x, hit.block.y, hit.block.z);
    if (targetKey !== miningTargetKey) {
        miningTargetKey = targetKey;
        miningStartedAt = now;
        miningDurationMs = BLOCK_DEFINITIONS[hit.blockType].hardness * miningMultiplier(hit.blockType) * 1000;
    }
    const progress = Math.min(1, (now - miningStartedAt) / Math.max(1, miningDurationMs));
    const definition = BLOCK_DEFINITIONS[hit.blockType];
    const noStoneDrop = hit.blockType === 'stone' && !hasStoneDropTool();
    breakLabel.textContent = `${definition.label}${noStoneDrop ? ' · 空手不会掉落' : ''}`;
    breakFill.style.width = `${Math.round(progress * 100)}%`;
    breakProgress.hidden = false;
    updateCrackOverlay(hit, progress);
    if (progress >= 1) {
        removeBlock(hit);
        resetMiningTarget();
    }
}

function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
}

let chatHideTimer = 0;

function addChatMessage(message, isError = false) {
    const line = document.createElement('div');
    line.className = `command-message${isError ? ' error' : ''}`;
    line.textContent = message;
    commandLog.append(line);
    while (commandLog.children.length > 6) commandLog.firstElementChild.remove();
    commandConsole.hidden = false;
    window.clearTimeout(chatHideTimer);
    if (!commandOpen) chatHideTimer = window.setTimeout(() => { commandConsole.hidden = true; }, 5000);
}

function openChat(prefill = '') {
    if (!worldActive || isDead || inventoryOpen) return;
    commandOpen = true;
    keys.clear();
    stopMining();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    window.clearTimeout(chatHideTimer);
    commandConsole.hidden = false;
    commandInput.value = prefill;
    requestAnimationFrame(() => {
        commandInput.focus();
        commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
    });
}

function closeChat() {
    if (!commandOpen) return;
    commandOpen = false;
    commandInput.blur();
    commandInput.value = '';
    window.clearTimeout(chatHideTimer);
    chatHideTimer = window.setTimeout(() => { commandConsole.hidden = true; }, 5000);
}

function isSelfTarget(target) {
    return !target || target.toLowerCase() === 'myself' || target === PLAYER_NAME;
}

function parseMode(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === '1' || normalized === 'creative') return 'creative';
    if (normalized === '2' || normalized === 'survival') return 'survival';
    if (normalized === '0' || normalized === 'default') return activeWorld ? activeWorld.m : 'survival';
    return null;
}

function executeCommand(commandText) {
    const parts = commandText.trim().slice(1).split(/\s+/).filter(Boolean);
    const command = (parts.shift() || '').toLowerCase();
    if (command === 'game-mode') {
        const modeValue = parts.length === 1 ? parts[0] : parts[1];
        const target = parts.length === 1 ? 'myself' : parts[0];
        const mode = parseMode(modeValue);
        if (!isSelfTarget(target)) return addChatMessage(`找不到玩家：${target}`, true);
        if (!mode) return addChatMessage('用法：/game-mode [玩家名] 1|creative|2|survival|0|default', true);
        setGameMode(mode);
        addChatMessage(`${PLAYER_NAME} 的游戏模式已切换为${GAME_MODES[mode].label}。`);
        return;
    }
    if (command === 'set-health') {
        const valueText = parts.length === 1 ? parts[0] : parts[1];
        const target = parts.length === 1 ? 'myself' : parts[0];
        const value = Number(valueText);
        if (!isSelfTarget(target)) return addChatMessage(`找不到玩家：${target}`, true);
        if (!Number.isFinite(value) || value < 0 || value > MAX_HEALTH) {
            return addChatMessage('用法：/set-health [玩家名] 0~10', true);
        }
        addChatMessage(`${PLAYER_NAME} 的生命值已设置为 ${value}。`);
        setHealth(value, '生命值被指令清空');
        return;
    }
    if (command === 'kill') {
        const target = parts[0] || 'myself';
        if (!isSelfTarget(target)) return addChatMessage(`找不到玩家：${target}`, true);
        const reasons = [
            `游戏觉得 ${PLAYER_NAME} 太碍眼，将 ${PLAYER_NAME} 干死了。`,
            `游戏对 ${PLAYER_NAME} 使出了阿瓦达索命咒。`,
            `${PLAYER_NAME} 离奇死亡。`
        ];
        killPlayer(reasons[Math.floor(Math.random() * reasons.length)]);
        return;
    }
    addChatMessage(`未知指令：/${command || ''}`, true);
}

function submitChatInput() {
    const text = commandInput.value.trim();
    if (!text) {
        closeChat();
        return;
    }
    commandOpen = false;
    commandInput.blur();
    if (text.startsWith('/')) executeCommand(text);
    else addChatMessage(`<${PLAYER_NAME}> ${text}`);
    commandInput.value = '';
    if (!isDead) {
        window.clearTimeout(chatHideTimer);
        chatHideTimer = window.setTimeout(() => { commandConsole.hidden = true; }, 5000);
    }
}

function setupInput() {
    canvas.addEventListener('click', () => {
        if (!worldActive || isDead || inventoryOpen || commandOpen) return;
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });
    document.addEventListener('mousemove', (event) => {
        if (!worldActive || isDead || inventoryOpen || commandOpen || document.pointerLockElement !== canvas) return;
        player.yaw -= event.movementX * 0.0023;
        player.pitch -= event.movementY * 0.0023;
        player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch));
    });
    document.addEventListener('keydown', (event) => {
        if (commandOpen) {
            if (event.code === 'Escape') {
                event.preventDefault();
                closeChat();
            }
            return;
        }
        if (worldActive && !isDead && !inventoryOpen && event.code === 'KeyT') {
            event.preventDefault();
            openChat('');
            return;
        }
        if (worldActive && !isDead && !inventoryOpen && event.key === '/') {
            event.preventDefault();
            openChat('/');
            return;
        }
        if (event.code === 'KeyE' || event.code === 'Tab') {
            event.preventDefault();
            if (worldActive && !event.repeat) toggleInventory();
            return;
        }
        if (event.code === 'Escape' && inventoryOpen) {
            event.preventDefault();
            closeInventory();
            return;
        }
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
        if (!worldActive || isDead || inventoryOpen) return;
        keys.add(event.code);
        if (event.code === 'Space' && !event.repeat && currentGameMode === 'creative') {
            const now = performance.now();
            if (now - lastSpaceTapAt <= DOUBLE_SPACE_WINDOW_MS) {
                player.flying = !player.flying;
                player.velocity.y = 0;
                player.onGround = false;
                lastSpaceTapAt = -Infinity;
                addChatMessage(player.flying ? '飞行已开启。' : '飞行已关闭。');
            } else {
                lastSpaceTapAt = now;
            }
        }
        if (event.code === 'KeyX' && !event.repeat && !player.sneaking) {
            const cancelSprint = player.sprinting || player.sprintArmed;
            player.sprinting = false;
            player.sprintArmed = !cancelSprint;
        }
        if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight') && !player.flying) {
            player.sneaking = true;
            player.sprinting = false;
            player.sprintArmed = false;
        }
        if (/^Digit[1-9]$/.test(event.code)) selectSlot(Number(event.code.slice(5)) - 1);
        if (event.code === 'Digit0') selectSlot(9);
        if (/^Numpad[1-9]$/.test(event.code)) selectSlot(Number(event.code.slice(6)) - 1);
        if (event.code === 'Numpad0') selectSlot(9);
        if (event.code === 'Space' && !event.repeat) jumpQueuedUntil = performance.now() + JUMP_BUFFER_MS;
    });
    document.addEventListener('keyup', (event) => {
        keys.delete(event.code);
        if (event.code === 'Space') jumpQueuedUntil = 0;
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            player.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
        }
    });
    document.addEventListener('wheel', (event) => {
        if (!worldActive || isDead || inventoryOpen || commandOpen || document.pointerLockElement !== canvas) return;
        event.preventDefault();
        selectSlot(selectedSlot + (event.deltaY > 0 ? 1 : -1));
    }, { passive: false });
    window.addEventListener('blur', () => {
        keys.clear();
        player.sprinting = false;
        player.sprintArmed = false;
        player.sneaking = false;
        jumpQueuedUntil = 0;
        stopMining();
    });
    canvas.addEventListener('mousedown', (event) => {
        if (!worldActive || isDead || inventoryOpen || commandOpen || document.pointerLockElement !== canvas) return;
        if (event.button === 0) {
            toolSwingStartedAt = performance.now();
            if (currentGameMode === 'creative') removeBlock(getAimHit(), false);
            else {
                miningHeld = true;
                resetMiningTarget();
            }
        }
        if (event.button === 2) placeBlock(getAimHit());
    });
    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) stopMining();
    });
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== canvas) stopMining();
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    inventoryCloseButton.addEventListener('click', closeInventory);
    commandForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submitChatInput();
    });
}

function setupWorldMenus() {
    worldsButton.addEventListener('click', showWorldsMenu);
    worldsBackButton.addEventListener('click', showMainMenu);
    createWorldForm.addEventListener('submit', (event) => {
        event.preventDefault();
        createWorldFromForm();
    });
    saveExitButton.addEventListener('click', saveAndExitWorld);
    window.addEventListener('beforeunload', () => {
        if (worldActive) saveActiveWorld();
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const now = performance.now();
    if (!worldActive) {
        faceHighlight.visible = false;
    } else if (isDead) {
        updateDeathState(now);
    } else {
        updatePlayer(delta);
        updateVoidDamage();
        if (!isDead) updateDroppedItems(delta, now);
        if (!isDead && !inventoryOpen && !commandOpen) {
            updateFaceHighlight();
            updateMining(now);
        } else {
            faceHighlight.visible = false;
            if (commandOpen) resetMiningTarget();
        }
    }
    updateHeldItemAnimation(now);
    renderer.render(scene, camera);
}

renderInventory();
resize();
setupInput();
setupWorldMenus();
showMainMenu();
window.addEventListener('resize', resize);
animate();
