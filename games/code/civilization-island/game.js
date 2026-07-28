import * as THREE from './vendor/three.module.js';

const lang = localStorage.getItem('lang') === 'en' ? 'en' : 'zh';
const t = (zh, en) => lang === 'en' ? en : zh;

const TILE = 2.2;
const GRID_W = 20;
const GRID_H = 16;
const HOURS_PER_REAL_SECOND = 1 / 5;
const centerOffset = new THREE.Vector3(-(GRID_W - 1) * TILE / 2, 0, -(GRID_H - 1) * TILE / 2);

const resourceInfo = {
    planks: { icon: '▰', zh: '木板', en: 'Planks', group: 'materials' },
    branches: { icon: '⌇', zh: '树枝', en: 'Branches', group: 'materials' },
    logs: { icon: '●', zh: '原木', en: 'Logs', group: 'materials' },
    corn: { icon: '🌽', zh: '玉米', en: 'Corn', group: 'food' },
    cabbage: { icon: '🥬', zh: '卷心菜', en: 'Cabbage', group: 'food' },
    tomato: { icon: '🍅', zh: '番茄', en: 'Tomato', group: 'food' },
    apple: { icon: '🍎', zh: '苹果', en: 'Apple', group: 'food' },
    pomelo: { icon: '🟡', zh: '柚子', en: 'Pomelo', group: 'food' },
    mushroom: { icon: '🍄', zh: '蘑菇', en: 'Mushroom', group: 'food' }
};

const cropInfo = {
    corn: { zh: '玉米', en: 'Corn', days: 3, yield: 2, color: 0xe0b53b },
    cabbage: { zh: '卷心菜', en: 'Cabbage', days: 2, yield: 1, color: 0x78a85b },
    tomato: { zh: '番茄', en: 'Tomato', days: 5, yield: 4, color: 0xd94d42 }
};

const buildDefs = {
    farm: {
        tab: 'buildings', icon: '🏡', zh: '农场', en: 'Farm', cost: { planks: 10, logs: 4 },
        descZh: '组织农田生产，可雇用 2 名居民。', descEn: 'Organizes crop production and employs 2 settlers.', jobs: 2, constructionHours: 6
    },
    hut: {
        tab: 'buildings', icon: '⛺', zh: '茅屋', en: 'Thatched hut', cost: { branches: 10, planks: 3 },
        descZh: '简易住所，可容纳 2 人。', descEn: 'A simple home for 2 people.', housing: 2, constructionHours: 2
    },
    house: {
        tab: 'buildings', icon: '🏠', zh: '木屋', en: 'Wood house', cost: { planks: 5 },
        descZh: '坚固住所，可容纳 4 人。', descEn: 'A sturdy home for 4 people.', housing: 4, constructionHours: 4
    },
    gatherer: {
        tab: 'buildings', icon: '🧺', zh: '采集者小屋', en: 'Gatherer hut', cost: { branches: 5 },
        descZh: '从附近果树采水果，也会在木材树下找蘑菇。', descEn: 'Collects fruit and mushrooms from nearby trees.', jobs: 2, constructionHours: 3
    },
    lumberjack: {
        tab: 'buildings', icon: '🪓', zh: '伐木工基地', en: 'Lumber camp', cost: { branches: 5 },
        descZh: '砍伐附近树木，果树给 1 原木，木材树给 2-5 原木。', descEn: 'Cuts nearby trees for logs.', jobs: 2, constructionHours: 3
    },
    sawmill: {
        tab: 'buildings', icon: '⚙', zh: '锯木厂', en: 'Sawmill', cost: { logs: 5 },
        descZh: '每 1 个原木加工成 2 个木板。', descEn: 'Turns 1 log into 2 planks.', jobs: 2, constructionHours: 5
    },
    warehouse: {
        tab: 'buildings', icon: '▦', zh: '仓库', en: 'Warehouse', cost: { planks: 4 },
        descZh: '增加 150 点物资容量。', descEn: 'Adds 150 storage capacity.', constructionHours: 3
    },
    field: {
        tab: 'land', icon: '▤', zh: '农田', en: 'Field', cost: {},
        descZh: '需要农场。开垦速度为每游戏时 2 块。', descEn: 'Requires a farm. Cleared at 2 tiles per game hour.', constructionHours: 0.5
    },
    road: {
        tab: 'land', icon: '═', zh: '道路', en: 'Road', cost: {},
        descZh: '居民在道路上行走速度 ×1.5，每游戏时修 5 格。', descEn: 'Settlers walk 1.5× faster on roads. Built at 5 tiles per game hour.', constructionHours: 0.2
    }
};

const state = {
    resources: { planks: 20, branches: 100, logs: 20, corn: 0, cabbage: 0, tomato: 0, apple: 0, pomelo: 0, mushroom: 0 },
    hour: 6,
    speed: 1,
    paused: false,
    selectedBuild: null,
    selectedEntity: null,
    activeTab: 'buildings',
    gameOver: false,
    structures: [],
    trees: [],
    people: [],
    events: []
};

const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x405e68, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed6da);
scene.fog = new THREE.Fog(0x9ed6da, 45, 85);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
let cameraYaw = Math.PI * 0.23;
let cameraPitch = 0.84;
let cameraDistance = 43;
const cameraTarget = new THREE.Vector3(0, 0, 0);

const hemi = new THREE.HemisphereLight(0xdff6ff, 0x4c684d, 0.72);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd39a, 0.55);
sun.position.set(-18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
scene.add(sun);

const worldGroup = new THREE.Group();
scene.add(worldGroup);
const tileGroup = new THREE.Group();
const treeGroup = new THREE.Group();
const structureGroup = new THREE.Group();
const peopleGroup = new THREE.Group();
worldGroup.add(tileGroup, treeGroup, structureGroup, peopleGroup);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const tileMeshes = [];
const validTiles = new Map();
const occupied = new Map();
let hoveredTile = null;
let pointerDown = null;
let noticeTimer = 0;
let lastUiUpdate = 0;

const mat = color => new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(0.14),
    roughness: 0.82,
    metalness: 0.02
});
const materials = {
    grass: mat(0x73a65a), grass2: mat(0x82b765), soil: mat(0x765a3a), sand: mat(0xdac991),
    water: new THREE.MeshStandardMaterial({ color: 0x3c9fb4, roughness: 0.25, metalness: 0.08, transparent: true, opacity: 0.9 }),
    wood: mat(0x84563a), woodLight: mat(0xb47b4b), roof: mat(0xa9563b), straw: mat(0xd5ae57),
    stone: mat(0xb8b0a0), white: mat(0xf2ead8), road: mat(0xb9a98e), leaf: mat(0x386f45),
    leafLight: mat(0x4f8c55), apple: mat(0xd94c42), pomelo: mat(0xe4c24e), dark: mat(0x26312d)
};

function gridKey(x, z) { return `${x},${z}`; }
function gridToWorld(x, z) { return new THREE.Vector3(x * TILE + centerOffset.x, 0, z * TILE + centerOffset.z); }
function inIsland(x, z) { return validTiles.has(gridKey(x, z)); }

function box(w, h, d, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function cylinder(radiusTop, radiusBottom, height, segments, material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createIsland() {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), materials.water);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.82;
    water.receiveShadow = true;
    scene.add(water);

    const sandBase = cylinder(20.5, 22, 1.3, 48, materials.sand);
    sandBase.scale.z = 0.72;
    sandBase.position.y = -0.55;
    sandBase.receiveShadow = true;
    worldGroup.add(sandBase);

    for (let z = 0; z < GRID_H; z++) {
        for (let x = 0; x < GRID_W; x++) {
            const nx = (x - (GRID_W - 1) / 2) / (GRID_W * 0.48);
            const nz = (z - (GRID_H - 1) / 2) / (GRID_H * 0.47);
            const wobble = Math.sin(x * 1.8 + z) * 0.025 + Math.cos(z * 1.5) * 0.02;
            if (nx * nx + nz * nz > 1 + wobble) continue;
            const pos = gridToWorld(x, z);
            const height = 0.42 + Math.max(0, 1 - Math.hypot(nx, nz)) * 0.2;
            const tile = box(TILE * 1.015, height, TILE * 1.015, (x + z) % 3 === 0 ? materials.grass2 : materials.grass, pos.x, -0.15, pos.z);
            tile.userData = { kind: 'tile', x, z };
            tileGroup.add(tile);
            tileMeshes.push(tile);
            validTiles.set(gridKey(x, z), tile);
        }
    }

    // Rocks around the shoreline keep the island silhouette from looking like a plain oval.
    for (let i = 0; i < 26; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 18 + Math.random() * 2.5;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.45, 0), materials.stone);
        rock.position.set(Math.cos(angle) * radius, -0.18, Math.sin(angle) * radius * 0.7);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.scale.y = 0.65;
        rock.castShadow = true;
        worldGroup.add(rock);
    }
}

function createTreeModel(type) {
    const group = new THREE.Group();
    const timber = type === 'timber';
    const trunkHeight = timber ? 3.4 + Math.random() * 0.7 : 2.15 + Math.random() * 0.35;
    const trunk = cylinder(timber ? 0.28 : 0.2, timber ? 0.4 : 0.29, trunkHeight, 7, materials.wood);
    trunk.position.y = trunkHeight / 2;
    group.add(trunk);

    if (timber) {
        for (let i = 0; i < 3; i++) {
            const branch = cylinder(0.1, 0.16, 1.8, 6, materials.wood);
            branch.position.set((i % 2 ? -1 : 1) * 0.55, trunkHeight * (0.55 + i * 0.1), (i - 1) * 0.2);
            branch.rotation.z = (i % 2 ? -1 : 1) * 1.0;
            group.add(branch);
        }
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 1), materials.leaf);
        crown.scale.set(1, 1.25, 1);
        crown.position.y = trunkHeight + 0.65;
        crown.castShadow = true;
        group.add(crown);
    } else {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), materials.leafLight);
        crown.scale.y = 0.9;
        crown.position.y = trunkHeight + 0.48;
        crown.castShadow = true;
        group.add(crown);
        const fruitMaterial = type === 'apple' ? materials.apple : materials.pomelo;
        for (let i = 0; i < 8; i++) {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(type === 'apple' ? 0.13 : 0.18, 8, 6), fruitMaterial);
            const angle = i * Math.PI * 2 / 8 + 0.3;
            fruit.position.set(Math.cos(angle) * 0.72, trunkHeight + 0.25 + (i % 3) * 0.27, Math.sin(angle) * 0.72);
            fruit.castShadow = true;
            group.add(fruit);
        }
    }
    return group;
}

function placeInitialTrees() {
    const cells = [...validTiles.keys()].map(key => key.split(',').map(Number));
    let placed = 0;
    while (placed < 36 && cells.length) {
        const index = Math.floor(Math.random() * cells.length);
        const [x, z] = cells.splice(index, 1)[0];
        const centerDistance = Math.hypot(x - GRID_W / 2, z - GRID_H / 2);
        if (centerDistance < 3.6 || occupied.has(gridKey(x, z))) continue;
        const roll = Math.random();
        const type = roll < 0.22 ? 'apple' : roll < 0.38 ? 'pomelo' : 'timber';
        const group = createTreeModel(type);
        const pos = gridToWorld(x, z);
        group.position.set(pos.x, 0.08, pos.z);
        group.rotation.y = Math.random() * Math.PI * 2;
        group.userData = { kind: 'tree', entity: null };
        treeGroup.add(group);
        const tree = { type, x, z, group, falling: false, fallProgress: 0 };
        group.userData.entity = tree;
        state.trees.push(tree);
        occupied.set(gridKey(x, z), tree);
        placed++;
    }
}

function roofMesh(colorMaterial = materials.roof) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.0, 4), colorMaterial);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    return roof;
}

function createBuildingModel(type) {
    const group = new THREE.Group();
    if (type === 'road') {
        const road = box(TILE * 0.98, 0.08, TILE * 0.98, materials.road, 0, 0.25, 0);
        group.add(road);
        return group;
    }
    if (type === 'field') {
        group.add(box(TILE * 0.94, 0.13, TILE * 0.94, materials.soil, 0, 0.27, 0));
        for (let i = -1; i <= 1; i++) group.add(box(TILE * 0.08, 0.06, TILE * 0.82, materials.sand, i * 0.55, 0.38, 0));
        return group;
    }

    if (type === 'farm') {
        group.add(box(1.75, 1.45, 1.55, materials.white, 0, 0.92, 0));
        const roof = roofMesh(materials.roof); roof.position.y = 2.1; roof.scale.set(1.0, 0.72, 0.86); group.add(roof);
        group.add(box(0.45, 0.86, 0.08, materials.wood, 0, 0.68, 0.82));
        group.add(box(0.5, 0.28, 0.38, materials.straw, 0.75, 0.42, -0.65));
    } else if (type === 'hut') {
        group.add(box(1.45, 1.05, 1.35, materials.woodLight, 0, 0.72, 0));
        const roof = roofMesh(materials.straw); roof.position.y = 1.72; roof.scale.set(0.9, 0.85, 0.82); group.add(roof);
        group.add(box(0.38, 0.72, 0.08, materials.dark, 0, 0.57, 0.72));
    } else if (type === 'house') {
        group.add(box(1.6, 1.4, 1.5, materials.woodLight, 0, 0.9, 0));
        const roof = roofMesh(); roof.position.y = 2.05; roof.scale.set(0.98, 0.68, 0.9); group.add(roof);
        group.add(box(0.4, 0.8, 0.08, materials.dark, -0.35, 0.65, 0.79));
        group.add(box(0.28, 0.28, 0.08, materials.water, 0.38, 1.0, 0.79));
    } else if (type === 'gatherer') {
        group.add(box(1.45, 1.0, 1.35, materials.woodLight, 0, 0.68, 0));
        const roof = roofMesh(materials.leaf); roof.position.y = 1.63; roof.scale.set(0.9, 0.65, 0.82); group.add(roof);
        const basket = cylinder(0.35, 0.27, 0.42, 10, materials.straw); basket.position.set(0.72, 0.45, 0.65); group.add(basket);
    } else if (type === 'lumberjack') {
        group.add(box(1.55, 0.85, 1.4, materials.wood, 0, 0.58, 0));
        const roof = roofMesh(materials.straw); roof.position.y = 1.48; roof.scale.set(0.95, 0.58, 0.84); group.add(roof);
        for (let i = 0; i < 3; i++) { const log = cylinder(0.16, 0.16, 1.2, 7, materials.woodLight); log.rotation.z = Math.PI / 2; log.position.set(-0.75, 0.38 + i * 0.25, 0.68); group.add(log); }
    } else if (type === 'sawmill') {
        group.add(box(1.75, 0.18, 1.55, materials.stone, 0, 0.35, 0));
        group.add(box(1.5, 0.12, 0.75, materials.woodLight, 0, 0.62, 0));
        const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 20), materials.stone);
        blade.rotation.z = Math.PI / 2; blade.position.set(0, 1.08, 0); blade.castShadow = true; group.add(blade);
        group.userData.blade = blade;
    } else if (type === 'warehouse') {
        group.add(box(1.75, 1.25, 1.55, materials.woodLight, 0, 0.8, 0));
        const roof = roofMesh(materials.roof); roof.position.y = 1.86; roof.scale.set(1.05, 0.55, 0.9); group.add(roof);
        group.add(box(0.78, 0.95, 0.08, materials.dark, 0, 0.63, 0.82));
    }
    return group;
}

function createResident(index) {
    const group = new THREE.Group();
    const skinColors = [0xf0c39f, 0xdca47d, 0xb87955, 0x8f5d43];
    const hairColors = [0x392b25, 0x6b452d, 0xa2673d, 0x25211f];
    const shirtColors = [0x4f7cac, 0xb85f52, 0x5d8b63, 0xd09a45, 0x75669e];
    const skin = mat(skinColors[Math.floor(Math.random() * skinColors.length)]);
    const hair = mat(hairColors[Math.floor(Math.random() * hairColors.length)]);
    const shirt = mat(shirtColors[Math.floor(Math.random() * shirtColors.length)]);
    const heightScale = 0.92 + Math.random() * 0.16;
    const body = cylinder(0.24, 0.3, 0.72, 8, shirt); body.position.y = 0.78; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin); head.position.y = 1.34; head.castShadow = true; group.add(head);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.275, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.48), hair); hairCap.position.y = 1.42; hairCap.castShadow = true; group.add(hairCap);
    const legL = box(0.12, 0.48, 0.14, materials.dark, -0.11, 0.28, 0); const legR = legL.clone(); legR.position.x = 0.11; group.add(legL, legR);
    group.scale.setScalar(heightScale);
    const start = gridToWorld(Math.floor(GRID_W / 2), Math.floor(GRID_H / 2));
    group.position.set(start.x + (index - 1.5) * 0.45, 0.36, start.z);
    group.userData = { kind: 'person', entity: null, legL, legR };
    peopleGroup.add(group);
    const namesZh = ['小禾', '阿木', '晴川', '南枝', '石青', '秋实', '云岚', '林渡'];
    const namesEn = ['Reed', 'Ash', 'Sunny', 'Rowan', 'Slate', 'Autumn', 'Cloud', 'River'];
    const person = {
        name: lang === 'en' ? namesEn[index % namesEn.length] : namesZh[index % namesZh.length],
        group, job: null, home: null, target: null, foodMood: 72 + Math.random() * 8,
        housingMood: 35, workMood: 45, wanderAngle: Math.random() * Math.PI * 2, step: Math.random() * 10
    };
    group.userData.entity = person;
    return person;
}

function canAfford(cost) {
    return Object.entries(cost).every(([key, amount]) => state.resources[key] >= amount);
}

function spend(cost) {
    for (const [key, amount] of Object.entries(cost)) state.resources[key] -= amount;
}

function costText(cost) {
    const entries = Object.entries(cost);
    if (!entries.length) return t('无需建材', 'No materials');
    return entries.map(([key, amount]) => `${resourceInfo[key].icon}${amount}`).join(' ');
}

function buildMetaText(def) {
    return `${costText(def.cost)} · ${def.constructionHours}${t('时', 'h')}`;
}

function hasBuilding(type) { return state.structures.some(item => item.type === type && item.complete); }

function placeStructure(type, x, z) {
    const def = buildDefs[type];
    const key = gridKey(x, z);
    if (!inIsland(x, z) || occupied.has(key)) return showNotice(t('这里不能建造。', 'You cannot build here.'));
    if (type === 'field' && !hasBuilding('farm')) return showNotice(t('先修建一座农场。', 'Build a farm first.'));
    if (!canAfford(def.cost)) return showNotice(t('建材不足。', 'Not enough materials.'));
    spend(def.cost);

    const group = createBuildingModel(type);
    const pos = gridToWorld(x, z);
    group.position.set(pos.x, 0.08, pos.z);
    group.userData = { kind: 'structure', entity: null };
    structureGroup.add(group);
    const structure = {
        type, x, z, group, complete: !def.constructionHours, progress: def.constructionHours ? 0 : 1,
        remaining: def.constructionHours || 0, cycle: 0, crop: null, cropHours: 0, cropMeshes: []
    };
    group.userData.entity = structure;
    state.structures.push(structure);
    occupied.set(key, structure);
    if (!structure.complete) group.scale.y = 0.12;
    addEvent(t(`开始修建${def.zh}。`, `${def.en} construction started.`));
    state.selectedEntity = structure;
    renderBuildList();
    renderSelection();
}

function plantCrop(field, cropKey) {
    if (!field.complete || field.type !== 'field') return;
    field.crop = cropKey;
    field.cropHours = 0;
    for (const mesh of field.cropMeshes) field.group.remove(mesh);
    field.cropMeshes = [];
    const crop = cropInfo[cropKey];
    const cropMaterial = mat(crop.color);
    for (let row = -1; row <= 1; row++) for (let col = -1; col <= 1; col++) {
        const plant = cylinder(0.06, 0.09, 0.24, 6, cropMaterial);
        plant.position.set(row * 0.48, 0.46, col * 0.48);
        plant.scale.y = 0.2;
        field.group.add(plant);
        field.cropMeshes.push(plant);
    }
    addEvent(t(`种下了${crop.zh}。`, `${crop.en} planted.`));
    renderSelection();
}

function totalFood() {
    return ['corn', 'cabbage', 'tomato', 'apple', 'pomelo', 'mushroom'].reduce((sum, key) => sum + state.resources[key], 0);
}

function storageCapacity() { return 200 + state.structures.filter(item => item.type === 'warehouse' && item.complete).length * 150; }
function materialTotal() { return state.resources.planks + state.resources.branches + state.resources.logs; }

function addResource(key, amount) {
    if (resourceInfo[key].group === 'materials') {
        amount = Math.max(0, Math.min(amount, storageCapacity() - materialTotal()));
    }
    state.resources[key] += amount;
}

function nearestTree(structure, predicate, radius = 6) {
    return state.trees
        .filter(tree => !tree.falling && predicate(tree))
        .map(tree => ({ tree, dist: Math.hypot(tree.x - structure.x, tree.z - structure.z) }))
        .filter(item => item.dist <= radius)
        .sort((a, b) => a.dist - b.dist)[0]?.tree || null;
}

function processStructure(structure, hours, efficiency) {
    const def = buildDefs[structure.type];
    if (!structure.complete) {
        structure.remaining -= hours * efficiency;
        structure.progress = Math.min(1, 1 - structure.remaining / def.constructionHours);
        structure.group.scale.y = 0.12 + structure.progress * 0.88;
        if (structure.remaining <= 0) {
            structure.complete = true;
            structure.group.scale.y = 1;
            addEvent(t(`${def.zh}修建完成。`, `${def.en} completed.`));
        }
        return;
    }

    if (structure.type === 'field' && structure.crop) {
        structure.cropHours += hours * efficiency;
        const crop = cropInfo[structure.crop];
        const ratio = Math.min(1, structure.cropHours / (crop.days * 24));
        for (const plant of structure.cropMeshes) plant.scale.y = 0.2 + ratio * 1.8;
        if (ratio >= 1) {
            addResource(structure.crop, crop.yield);
            addEvent(t(`${crop.zh}收获 ${crop.yield} 个。`, `${crop.yield} ${crop.en} harvested.`));
            structure.crop = null;
            structure.cropHours = 0;
            for (const mesh of structure.cropMeshes) structure.group.remove(mesh);
            structure.cropMeshes = [];
            if (state.selectedEntity === structure) renderSelection();
        }
        return;
    }

    const workers = state.people.filter(person => person.job === structure).length;
    if (!workers) return;
    structure.cycle += hours * workers * efficiency;

    if (structure.type === 'gatherer' && structure.cycle >= 4) {
        structure.cycle -= 4;
        const fruitTree = nearestTree(structure, tree => tree.type === 'apple' || tree.type === 'pomelo', 5);
        const timberTree = nearestTree(structure, tree => tree.type === 'timber', 5);
        if (fruitTree) addResource(fruitTree.type, 1);
        if (timberTree && Math.random() < 0.75) addResource('mushroom', 1);
        if (!fruitTree && !timberTree) addEvent(t('采集者附近没有可采集的树。', 'No useful trees near the gatherer hut.'));
    }

    if (structure.type === 'lumberjack' && structure.cycle >= 5) {
        structure.cycle -= 5;
        const target = nearestTree(structure, () => true, 7);
        if (target) startTreeFall(target);
        else addEvent(t('伐木工附近已经没有树了。', 'No trees remain near the lumber camp.'));
    }

    if (structure.type === 'sawmill' && structure.cycle >= 2) {
        structure.cycle -= 2;
        if (state.resources.logs >= 1) {
            state.resources.logs--;
            addResource('planks', 2);
            if (structure.group.userData.blade) structure.group.userData.blade.rotation.x += Math.PI / 2;
        }
    }
}

function startTreeFall(tree) {
    tree.falling = true;
    tree.fallProgress = 0;
    occupied.delete(gridKey(tree.x, tree.z));
}

function updateFallingTrees(realDelta) {
    for (let i = state.trees.length - 1; i >= 0; i--) {
        const tree = state.trees[i];
        if (!tree.falling) continue;
        tree.fallProgress += realDelta * 1.25;
        const eased = 1 - Math.pow(1 - Math.min(1, tree.fallProgress), 3);
        tree.group.rotation.z = eased * Math.PI / 2;
        if (tree.fallProgress >= 1) {
            const logs = tree.type === 'timber' ? 2 + Math.floor(Math.random() * 4) : 1;
            addResource('logs', logs);
            treeGroup.remove(tree.group);
            state.trees.splice(i, 1);
            addEvent(t(`砍倒一棵树，得到 ${logs} 个原木。`, `A tree fell, yielding ${logs} logs.`));
        }
    }
}

function assignHomesAndJobs() {
    const homes = state.structures.filter(item => item.complete && buildDefs[item.type].housing);
    let homeSlots = [];
    homes.forEach(home => { for (let i = 0; i < buildDefs[home.type].housing; i++) homeSlots.push(home); });
    const workplaces = state.structures.filter(item => item.complete && buildDefs[item.type].jobs);
    let jobSlots = [];
    workplaces.forEach(work => { for (let i = 0; i < buildDefs[work.type].jobs; i++) jobSlots.push(work); });
    state.people.forEach((person, index) => {
        person.home = homeSlots[index] || null;
        person.job = jobSlots[index] || null;
        person.housingMood = person.home ? 100 : 18;
        person.workMood = person.job ? 100 : 42;
    });
}

function feedPeople(hours) {
    for (const person of state.people) {
        const need = hours * 0.025;
        person._foodNeed = (person._foodNeed || 0) + need;
        if (person._foodNeed >= 1) {
            person._foodNeed -= 1;
            const foodKey = ['apple', 'pomelo', 'mushroom', 'cabbage', 'corn', 'tomato'].find(key => state.resources[key] > 0);
            if (foodKey) {
                state.resources[foodKey]--;
                person.foodMood = Math.min(100, person.foodMood + 20);
            } else {
                person.foodMood = Math.max(0, person.foodMood - 3.5);
            }
        }
    }
}

function averageHappiness() {
    const totals = state.people.reduce((sum, person) => {
        sum.housing += person.housingMood;
        sum.food += person.foodMood;
        sum.work += person.workMood;
        return sum;
    }, { housing: 0, food: 0, work: 0 });
    const count = Math.max(1, state.people.length);
    const values = { housing: totals.housing / count, food: totals.food / count, work: totals.work / count };
    values.average = (values.housing + values.food + values.work) / 3;
    return values;
}

function updatePeople(realDelta, gameHours) {
    const happiness = averageHappiness();
    const efficiency = happiness.average < 30 ? 0.7 : 1;
    const daylight = (state.hour % 24) >= 6 && (state.hour % 24) < 20;
    for (const person of state.people) {
        let destination;
        if (daylight && person.job) destination = gridToWorld(person.job.x, person.job.z);
        else if (person.home) destination = gridToWorld(person.home.x, person.home.z);
        else {
            person.wanderAngle += realDelta * 0.2;
            destination = new THREE.Vector3(Math.cos(person.wanderAngle) * 2.8, 0, Math.sin(person.wanderAngle) * 2.8);
        }
        const current = person.group.position;
        const direction = destination.clone().sub(current); direction.y = 0;
        const distance = direction.length();
        if (distance > 0.35) {
            direction.normalize();
            const gx = Math.round((current.x - centerOffset.x) / TILE);
            const gz = Math.round((current.z - centerOffset.z) / TILE);
            const onRoad = occupied.get(gridKey(gx, gz))?.type === 'road';
            const move = Math.min(distance, realDelta * 1.25 * efficiency * (onRoad ? 1.5 : 1));
            current.addScaledVector(direction, move);
            person.group.rotation.y = Math.atan2(direction.x, direction.z);
            person.step += realDelta * 9;
            const swing = Math.sin(person.step) * 0.22;
            person.group.userData.legL.rotation.x = swing;
            person.group.userData.legR.rotation.x = -swing;
        }
    }
    if (gameHours > 0) feedPeople(gameHours);
}

function simulate(gameHours, realDelta) {
    if (state.gameOver || state.paused) return;
    state.hour += gameHours;
    assignHomesAndJobs();
    const happiness = averageHappiness();
    const efficiency = happiness.average < 30 ? 0.7 : 1;
    state.structures.forEach(structure => processStructure(structure, gameHours, efficiency));
    updatePeople(realDelta, gameHours);
    if (happiness.average < 20 && state.hour > 10) endGame();
}

function updateDayNight() {
    const hour = state.hour % 24;
    const angle = ((hour - 6) / 24) * Math.PI * 2;
    const solarHeight = Math.sin(angle);
    const daylight = THREE.MathUtils.clamp(Math.max(0, solarHeight) * 1.7, 0, 1);

    // The directional light follows the actual sun arc. At 06:00 it sits
    // on the horizon with a weak warm beam instead of acting like a ceiling lamp.
    sun.position.set(Math.cos(angle) * 34, Math.max(0.3, solarHeight * 34), Math.sin(angle) * 22);
    sun.intensity = 0.55 + daylight * 2.15;
    sun.color.setHex(daylight < 0.55 ? 0xffb46a : 0xfff1c9);
    hemi.intensity = 0.72 + daylight * 1.0;
    const dayColor = new THREE.Color(0x9ed6da);
    const nightColor = new THREE.Color(0x31475b);
    scene.background.copy(nightColor).lerp(dayColor, 0.18 + daylight * 0.82);
    scene.fog.color.copy(scene.background);
    renderer.setClearColor(scene.background, 1);
}

function endGame() {
    state.gameOver = true;
    state.paused = true;
    document.getElementById('game-over').classList.remove('hidden');
    try { window.parent?.postMessage({ type: 'omg-game-event', event: 'finish', won: false, score: Math.floor(state.hour / 24) }, '*'); } catch {}
}

function addEvent(message) {
    const day = Math.floor(state.hour / 24) + 1;
    state.events.unshift({ message, day });
    state.events = state.events.slice(0, 7);
    renderEvents();
}

function showNotice(message) {
    const notice = document.getElementById('notice');
    notice.textContent = message;
    notice.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.remove('show'), 1800);
}

function renderResources() {
    const groups = [
        { key: 'materials', zh: '建材', en: 'Materials' },
        { key: 'food', zh: '食物', en: 'Food' }
    ];
    document.getElementById('resources').innerHTML = groups.map(group => `
        <div class="resource-group">
            <strong>${t(group.zh, group.en)}</strong>
            ${Object.entries(resourceInfo).filter(([, info]) => info.group === group.key).map(([key, info]) => `
                <span class="resource-item" title="${t(info.zh, info.en)}"><i>${info.icon}</i>${Math.floor(state.resources[key])}</span>
            `).join('')}
        </div>
    `).join('');
}

function renderBuildList() {
    const list = document.getElementById('build-list');
    list.innerHTML = Object.entries(buildDefs).filter(([, def]) => def.tab === state.activeTab).map(([key, def]) => {
        const locked = key === 'field' && !hasBuilding('farm');
        return `<button class="build-item ${state.selectedBuild === key ? 'selected' : ''} ${locked ? 'locked' : ''}" data-build="${key}" type="button">
            <span class="build-icon">${def.icon}</span><span class="build-name">${t(def.zh, def.en)}</span><span class="build-cost">${buildMetaText(def)}</span>
        </button>`;
    }).join('');
    list.querySelectorAll('[data-build]').forEach(button => button.addEventListener('click', () => {
        const key = button.dataset.build;
        if (key === 'field' && !hasBuilding('farm')) return showNotice(t('先修建一座农场。', 'Build a farm first.'));
        state.selectedBuild = state.selectedBuild === key ? null : key;
        state.selectedEntity = null;
        canvas.classList.toggle('building', !!state.selectedBuild);
        renderBuildList();
        renderSelection();
    }));
}

function happinessLabel(value) {
    if (value < 20) return '#d84e4e';
    if (value < 30) return '#d99d3b';
    return '#3d7b5a';
}

function renderHappiness() {
    const values = averageHappiness();
    const rows = [
        ['住房', 'Home', values.housing], ['食物', 'Food', values.food], ['工作', 'Work', values.work], ['平均', 'Average', values.average]
    ];
    document.getElementById('happiness').innerHTML = rows.map(([zh, en, value]) => `
        <div class="happiness-row"><span>${t(zh, en)}</span><div class="meter"><span style="width:${Math.max(0, value)}%;background:${happinessLabel(value)}"></span></div><b>${Math.round(value)}%</b></div>
    `).join('');
    document.getElementById('population-count').textContent = state.people.length;
}

function renderSelection() {
    const title = document.getElementById('selection-title');
    const desc = document.getElementById('selection-desc');
    const actions = document.getElementById('selection-actions');
    actions.innerHTML = '';
    if (state.selectedBuild) {
        const def = buildDefs[state.selectedBuild];
        title.textContent = `${def.icon} ${t(def.zh, def.en)}`;
        desc.textContent = t(def.descZh, def.descEn);
        return;
    }
    const entity = state.selectedEntity;
    if (!entity) {
        title.textContent = t('岛屿概况', 'Island overview');
        desc.textContent = t(`物资容量 ${materialTotal()}/${storageCapacity()}。岛上还有 ${state.trees.length} 棵树。`, `Storage ${materialTotal()}/${storageCapacity()}. ${state.trees.length} trees remain.`);
        return;
    }
    if (entity.group?.userData.kind === 'person') {
        title.textContent = `● ${entity.name}`;
        desc.textContent = t(`住房 ${Math.round(entity.housingMood)}% · 食物 ${Math.round(entity.foodMood)}% · 工作 ${Math.round(entity.workMood)}%${entity.job ? ` · 在${buildDefs[entity.job.type].zh}工作` : ' · 暂无工作'}`, `Home ${Math.round(entity.housingMood)}% · Food ${Math.round(entity.foodMood)}% · Work ${Math.round(entity.workMood)}%${entity.job ? ` · Works at ${buildDefs[entity.job.type].en}` : ' · Unemployed'}`);
        return;
    }
    if (entity.group?.userData.kind === 'tree') {
        const name = entity.type === 'timber' ? t('木材树', 'Timber tree') : entity.type === 'apple' ? t('苹果树', 'Apple tree') : t('柚子树', 'Pomelo tree');
        title.textContent = `🌳 ${name}`;
        desc.textContent = entity.type === 'timber' ? t('高大的木材树，砍伐可得到 2-5 个原木，树下可能有蘑菇。', 'A large timber tree yielding 2-5 logs; mushrooms may grow below it.') : t('较小的果树，可供采集者持续采果。', 'A small fruit tree that gatherers can harvest.');
        return;
    }
    const def = buildDefs[entity.type];
    title.textContent = `${def.icon} ${t(def.zh, def.en)}`;
    if (!entity.complete) {
        desc.textContent = t(`修建中：${Math.round(entity.progress * 100)}%`, `Building: ${Math.round(entity.progress * 100)}%`);
        return;
    }
    if (entity.type === 'field') {
        if (entity.crop) {
            const crop = cropInfo[entity.crop];
            const ratio = Math.min(1, entity.cropHours / (crop.days * 24));
            desc.textContent = t(`${crop.zh}生长中：${Math.round(ratio * 100)}%，成熟后收获 ${crop.yield} 个。`, `${crop.en} growing: ${Math.round(ratio * 100)}%, yielding ${crop.yield}.`);
        } else {
            desc.textContent = t('农田空闲，选择一种作物。', 'The field is idle. Choose a crop.');
            Object.entries(cropInfo).forEach(([key, crop]) => {
                const button = document.createElement('button');
                button.className = 'action-button primary';
                button.textContent = `${t(crop.zh, crop.en)} · ${crop.days}${t('天', 'd')}`;
                button.addEventListener('click', () => plantCrop(entity, key));
                actions.appendChild(button);
            });
        }
    } else {
        const workers = state.people.filter(person => person.job === entity).length;
        const jobText = def.jobs ? t(`工人 ${workers}/${def.jobs}。`, `Workers ${workers}/${def.jobs}.`) : '';
        desc.textContent = `${t(def.descZh, def.descEn)} ${jobText}`;
    }
}

function renderEvents() {
    document.getElementById('events').innerHTML = state.events.map((event, index) => `<p class="event ${index === 0 ? 'new' : ''}">${t('第', 'Day ')}${event.day}${lang === 'zh' ? '天' : ''} · ${event.message}</p>`).join('');
}

function renderClock() {
    const day = Math.floor(state.hour / 24) + 1;
    const hour = Math.floor(state.hour % 24);
    const minute = Math.floor((state.hour % 1) * 60);
    document.getElementById('clock').textContent = lang === 'en'
        ? `Day ${day} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        : `第 ${day} 天 · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function updateCamera() {
    camera.position.set(
        cameraTarget.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance,
        cameraTarget.y + Math.sin(cameraPitch) * cameraDistance,
        cameraTarget.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance
    );
    camera.lookAt(cameraTarget);
}

function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
}

function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const objects = [...tileMeshes, ...structureGroup.children, ...treeGroup.children, ...peopleGroup.children];
    return raycaster.intersectObjects(objects, true);
}

function rootEntity(object) {
    let current = object;
    while (current && !current.userData?.kind) current = current.parent;
    return current?.userData || null;
}

function tileFromIntersections(intersections) {
    for (const hit of intersections) {
        let current = hit.object;
        while (current && current.parent !== tileGroup) current = current.parent;
        if (current?.userData.kind === 'tile') return current.userData;
    }
    // Buildings and trees stand over a tile; infer its grid cell from the hit point.
    if (intersections[0]) {
        const x = Math.round((intersections[0].point.x - centerOffset.x) / TILE);
        const z = Math.round((intersections[0].point.z - centerOffset.z) / TILE);
        if (inIsland(x, z)) return { x, z };
    }
    return null;
}

canvas.addEventListener('pointerdown', event => {
    pointerDown = { x: event.clientX, y: event.clientY, yaw: cameraYaw, pitch: cameraPitch };
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', event => {
    if (pointerDown) {
        const dx = event.clientX - pointerDown.x;
        const dy = event.clientY - pointerDown.y;
        if (Math.hypot(dx, dy) > 3) {
            canvas.classList.add('dragging');
            cameraYaw = pointerDown.yaw - dx * 0.007;
            cameraPitch = THREE.MathUtils.clamp(pointerDown.pitch + dy * 0.005, 0.3, 1.2);
            updateCamera();
        }
        return;
    }
    const hits = pick(event);
    const tile = tileFromIntersections(hits);
    if (hoveredTile && hoveredTile.material) hoveredTile.material.emissive?.setHex(0x000000);
    hoveredTile = tile ? validTiles.get(gridKey(tile.x, tile.z)) : null;
    if (hoveredTile?.material.emissive) hoveredTile.material.emissive.setHex(state.selectedBuild ? 0x274427 : 0x162218);
    const info = hits.map(hit => rootEntity(hit.object)).find(Boolean);
    const tooltip = document.getElementById('tooltip');
    if (info?.entity && !state.selectedBuild) {
        const entity = info.entity;
        let label = entity.name || (entity.type && buildDefs[entity.type] ? t(buildDefs[entity.type].zh, buildDefs[entity.type].en) : t('树木', 'Tree'));
        tooltip.textContent = label;
        tooltip.style.left = `${event.clientX + 13}px`;
        tooltip.style.top = `${event.clientY + 13}px`;
        tooltip.style.display = 'block';
    } else tooltip.style.display = 'none';
});

canvas.addEventListener('pointerup', event => {
    const moved = pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5;
    pointerDown = null;
    canvas.classList.remove('dragging');
    if (moved) return;
    const hits = pick(event);
    if (state.selectedBuild) {
        const tile = tileFromIntersections(hits);
        if (tile) placeStructure(state.selectedBuild, tile.x, tile.z);
        return;
    }
    const info = hits.map(hit => rootEntity(hit.object)).find(data => data?.entity);
    state.selectedEntity = info?.entity || null;
    renderSelection();
});

canvas.addEventListener('wheel', event => {
    event.preventDefault();
    cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.025, 20, 62);
    updateCamera();
}, { passive: false });

document.querySelectorAll('.tool-tab').forEach(button => button.addEventListener('click', () => {
    state.activeTab = button.dataset.tab;
    document.querySelectorAll('.tool-tab').forEach(item => item.classList.toggle('active', item === button));
    renderBuildList();
}));

document.getElementById('cancel-build').addEventListener('click', () => {
    state.selectedBuild = null;
    canvas.classList.remove('building');
    renderBuildList();
    renderSelection();
});

document.getElementById('pause').addEventListener('click', () => {
    state.paused = !state.paused;
    document.getElementById('pause').textContent = state.paused ? '▶' : 'Ⅱ';
});

document.querySelectorAll('.speed-button').forEach(button => button.addEventListener('click', () => {
    state.speed = Number(button.dataset.speed);
    state.paused = false;
    document.getElementById('pause').textContent = 'Ⅱ';
    document.querySelectorAll('.speed-button').forEach(item => item.classList.toggle('active', item === button));
}));

document.getElementById('restart').addEventListener('click', () => location.reload());

function applyI18n() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh][data-en]').forEach(element => { element.textContent = element.dataset[lang]; });
}

function animate() {
    requestAnimationFrame(animate);
    const realDelta = Math.min(clock.getDelta(), 0.05);
    const gameHours = state.paused ? 0 : realDelta * HOURS_PER_REAL_SECOND * state.speed;
    simulate(gameHours, realDelta);
    updateFallingTrees(realDelta * (state.paused ? 0 : state.speed));
    updateDayNight();
    if (performance.now() - lastUiUpdate > 250) {
        renderResources();
        renderHappiness();
        renderClock();
        if (state.selectedEntity) renderSelection();
        lastUiUpdate = performance.now();
    }
    // A slow water shimmer adds motion without making the interface distracting.
    const water = scene.children.find(child => child.material === materials.water);
    if (water) water.material.opacity = 0.86 + Math.sin(performance.now() * 0.0008) * 0.035;
    renderer.render(scene, camera);
}

applyI18n();
createIsland();
placeInitialTrees();
for (let i = 0; i < 4; i++) state.people.push(createResident(i));
assignHomesAndJobs();
addEvent(t('4 名居民带着物资登上了小岛。', 'Four settlers arrived with supplies.'));
renderResources();
renderBuildList();
renderHappiness();
renderSelection();
renderClock();
resize();
updateCamera();
window.addEventListener('resize', resize);
try { window.parent?.postMessage({ type: 'omg-game-event', event: 'start' }, '*'); } catch {}
animate();
