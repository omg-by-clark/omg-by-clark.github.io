import * as THREE from '../civilization-island/vendor/three.module.js';

const WORLD_SIZE = 100;
const WORLD_HEIGHT = 20;
const PLAYER_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.32;
const EYE_HEIGHT = 1.55;
const WALK_SPEED = 5.4;
const JUMP_SPEED = 8.2;
const GRAVITY = 24;
const MAX_PLACE_HEIGHT = WORLD_HEIGHT + 40;

const canvas = document.getElementById('world');
const coordsLabel = document.getElementById('coords');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x8fd0e4, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd0e4);
scene.fog = new THREE.Fog(0x8fd0e4, 90, 170);

const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 180);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

const worldGroup = new THREE.Group();
const placedGroup = new THREE.Group();
scene.add(worldGroup, placedGroup);

scene.add(new THREE.HemisphereLight(0xd9f2e5, 0x4a5e38, 0.88));
const sun = new THREE.DirectionalLight(0xfff1bd, 0.62);
sun.position.set(-45, 70, 36);
scene.add(sun);

const keys = new Set();
const placedBlocks = new Map();

const player = {
    pos: new THREE.Vector3(WORLD_SIZE / 2, WORLD_HEIGHT + 0.04, WORLD_SIZE / 2),
    velocity: new THREE.Vector3(),
    yaw: Math.PI,
    pitch: -0.38,
    onGround: false
};

function makeTexture(kind, repeatX = 1, repeatY = 1) {
    const source = document.createElement('canvas');
    source.width = 64;
    source.height = 64;
    const ctx = source.getContext('2d');
    const colors = kind === 'grass'
        ? ['#5c9439', '#679f43', '#4f8232', '#6fa94b']
        : ['#765038', '#68442f', '#875d40', '#5b3a27'];

    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, 64, 64);

    const cells = [
        [0, 0, 16, 16, 1], [16, 0, 16, 16, 0], [32, 0, 16, 16, 2], [48, 0, 16, 16, 0],
        [0, 16, 16, 16, 0], [16, 16, 16, 16, 3], [32, 16, 16, 16, 0], [48, 16, 16, 16, 1],
        [0, 32, 16, 16, 2], [16, 32, 16, 16, 0], [32, 32, 16, 16, 1], [48, 32, 16, 16, 0],
        [0, 48, 16, 16, 0], [16, 48, 16, 16, 1], [32, 48, 16, 16, 0], [48, 48, 16, 16, 2]
    ];

    for (const [x, y, w, h, index] of cells) {
        ctx.fillStyle = colors[index];
        ctx.globalAlpha = kind === 'grass' ? 0.34 : 0.28;
        ctx.fillRect(x, y, w, h);
    }

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = kind === 'grass' ? '#385f28' : '#3e281c';
    for (let i = 0; i < 14; i++) {
        const x = (i * 19 + 7) % 64;
        const y = (i * 29 + 11) % 64;
        ctx.fillRect(x, y, 8, 4);
    }

    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(source);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

function makeMaterial(kind, repeatX = 1, repeatY = 1) {
    return new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeTexture(kind, repeatX, repeatY) });
}

const blockGrassTopMaterial = makeMaterial('grass');
const blockDirtMaterial = makeMaterial('dirt');
const landGrassTopMaterial = makeMaterial('grass', WORLD_SIZE / 2, WORLD_SIZE / 2);
const landDirtSideMaterial = makeMaterial('dirt', WORLD_SIZE, WORLD_HEIGHT);
const landDirtBottomMaterial = makeMaterial('dirt', WORLD_SIZE, WORLD_SIZE);
const grassBlockMaterials = [
    blockDirtMaterial,
    blockDirtMaterial,
    blockGrassTopMaterial,
    blockDirtMaterial,
    blockDirtMaterial,
    blockDirtMaterial
];
const landMaterials = [
    landDirtSideMaterial,
    landDirtSideMaterial,
    landGrassTopMaterial,
    landDirtBottomMaterial,
    landDirtSideMaterial,
    landDirtSideMaterial
];

function keyOf(x, y, z) {
    return `${x},${y},${z}`;
}

function parseKey(key) {
    return key.split(',').map(Number);
}

function inWorldXZ(x, z) {
    return x >= 0 && x < WORLD_SIZE && z >= 0 && z < WORLD_SIZE;
}

function isLandBlock(x, y, z) {
    return inWorldXZ(x, z) && y >= 0 && y < WORLD_HEIGHT;
}

function blockAt(x, y, z) {
    if (placedBlocks.has(keyOf(x, y, z))) return 'grass';
    if (isLandBlock(x, y, z)) return y === WORLD_HEIGHT - 1 ? 'grass' : 'dirt';
    return 'air';
}

function isSolidAt(x, y, z) {
    return blockAt(x, y, z) !== 'air';
}

function createLand() {
    const land = new THREE.Mesh(new THREE.BoxGeometry(WORLD_SIZE, WORLD_HEIGHT, WORLD_SIZE), landMaterials);
    land.position.set(WORLD_SIZE / 2, WORLD_HEIGHT / 2, WORLD_SIZE / 2);
    land.frustumCulled = false;
    land.userData.kind = 'land';
    worldGroup.add(land);

    const grid = new THREE.GridHelper(WORLD_SIZE, WORLD_SIZE, 0x2d6d2e, 0x2d6d2e);
    grid.position.set(WORLD_SIZE / 2, WORLD_HEIGHT + 0.012, WORLD_SIZE / 2);
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.frustumCulled = false;
    grid.userData.kind = 'grid';
    worldGroup.add(grid);
}

function rebuildPlacedBlocks() {
    while (placedGroup.children.length) placedGroup.remove(placedGroup.children[0]);
    for (const key of placedBlocks.keys()) {
        const [x, y, z] = parseKey(key);
        const mesh = new THREE.Mesh(cubeGeometry, grassBlockMaterials);
        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        mesh.frustumCulled = false;
        mesh.userData.kind = 'placed';
        mesh.userData.block = { x, y, z };
        placedGroup.add(mesh);
    }

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

function moveAxis(axis, amount) {
    if (!amount) return;
    const next = player.pos.clone();
    next[axis] += amount;
    if (!playerCollides(next)) {
        player.pos.copy(next);
        return;
    }
    if (axis === 'y') {
        player.velocity.y = 0;
        if (amount < 0) player.onGround = true;
    }
}

function clampPlayerToLand() {
    player.pos.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_SIZE - PLAYER_RADIUS, player.pos.x));
    player.pos.z = Math.max(PLAYER_RADIUS, Math.min(WORLD_SIZE - PLAYER_RADIUS, player.pos.z));
}

function updateCoords() {
    coordsLabel.textContent = `X ${Math.floor(player.pos.x)}  Y ${Math.floor(player.pos.y)}  Z ${Math.floor(player.pos.z)}`;
}
function updatePlayer(delta) {
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const wish = new THREE.Vector3();

    if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    player.velocity.x = wish.x * WALK_SPEED;
    player.velocity.z = wish.z * WALK_SPEED;
    player.velocity.y = Math.max(player.velocity.y - GRAVITY * delta, -30);
    player.onGround = false;

    moveAxis('x', player.velocity.x * delta);
    moveAxis('z', player.velocity.z * delta);
    clampPlayerToLand();
    moveAxis('y', player.velocity.y * delta);

    if (player.pos.y < WORLD_HEIGHT + 0.02) {
        player.pos.y = WORLD_HEIGHT + 0.02;
        player.velocity.y = 0;
        player.onGround = true;
    }

    camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT, player.pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    updateCoords();
}

function getAimHit() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 7;
    const targets = [...worldGroup.children.filter((mesh) => mesh.userData.kind === 'land'), ...placedGroup.children];
    return raycaster.intersectObjects(targets, true)[0] || null;
}

function wouldBlockPlayer(x, y, z) {
    return x + 1 > player.pos.x - PLAYER_RADIUS &&
        x < player.pos.x + PLAYER_RADIUS &&
        z + 1 > player.pos.z - PLAYER_RADIUS &&
        z < player.pos.z + PLAYER_RADIUS &&
        y + 1 > player.pos.y &&
        y < player.pos.y + PLAYER_HEIGHT;
}

function placeGrass(hit) {
    if (!hit) return;

    let x;
    let y;
    let z;

    if (hit.object.userData.kind === 'placed') {
        const block = hit.object.userData.block;
        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round();
        x = block.x + normal.x;
        y = block.y + normal.y;
        z = block.z + normal.z;
    } else {
        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        if (normal.y < 0.5) return;
        x = Math.max(0, Math.min(WORLD_SIZE - 1, Math.floor(hit.point.x)));
        y = WORLD_HEIGHT;
        z = Math.max(0, Math.min(WORLD_SIZE - 1, Math.floor(hit.point.z)));
    }

    if (!inWorldXZ(x, z) || y < WORLD_HEIGHT || y >= MAX_PLACE_HEIGHT) return;
    if (blockAt(x, y, z) !== 'air') return;
    if (wouldBlockPlayer(x, y, z)) return;

    placedBlocks.set(keyOf(x, y, z), true);
    rebuildPlacedBlocks();
}

function removePlacedGrass(hit) {
    if (!hit || hit.object.userData.kind !== 'placed') return;
    const block = hit.object.userData.block;
    placedBlocks.delete(keyOf(block.x, block.y, block.z));
    rebuildPlacedBlocks();
}

function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
}

function setupInput() {
    canvas.addEventListener('click', () => {
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });

    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement !== canvas) return;
        player.yaw -= event.movementX * 0.0023;
        player.pitch -= event.movementY * 0.0023;
        player.pitch = Math.max(-1.2, Math.min(-0.08, player.pitch));
    });

    document.addEventListener('keydown', (event) => {
        keys.add(event.code);
        if (event.code === 'Space' && player.onGround) {
            player.velocity.y = JUMP_SPEED;
            player.onGround = false;
        }
    });

    document.addEventListener('keyup', (event) => keys.delete(event.code));
    window.addEventListener('blur', () => keys.clear());

    canvas.addEventListener('mousedown', (event) => {
        const hit = getAimHit();
        if (event.button === 0) removePlacedGrass(hit);
        if (event.button === 2) placeGrass(hit);
    });

    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

function animate() {
    requestAnimationFrame(animate);
    updatePlayer(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
}

createLand();
rebuildPlacedBlocks();
resize();
setupInput();
updatePlayer(0);
window.addEventListener('resize', resize);
animate();