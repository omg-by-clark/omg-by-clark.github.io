const WORLD_SIZE = 100;
const WORLD_HEIGHT = 4;
const CHUNK_SIZE = 10;
const PLAYER_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.32;
const STEP_HEIGHT = 1;
const EYE_HEIGHT = 1.55;
const SNEAK_EYE_HEIGHT = 1.25;
const WALK_SPEED = 3;                // 走路速度 blk/s
const SPRINT_SPEED_MULTIPLIER = 2.5; // 疾跑速度是正常速度的几倍
const SNEAK_SPEED_MULTIPLIER = 0.5;
const SNEAK_JUMP_HEIGHT_MULTIPLIER = 1;
const JUMP_SPEED = 8.2;
const JUMP_BUFFER_MS = 180;
const GRAVITY = 22;
const MAX_PLACE_HEIGHT = WORLD_HEIGHT + 40;
const MAX_REACH = 7;
const MAX_PITCH = Math.PI / 2 - 0.01;
const VOID_DEATH_Y = -100;
const RESPAWN_DELAY_MS = 3000;
const SPAWN_X = WORLD_SIZE / 2;
const SPAWN_Y = WORLD_HEIGHT + 0.04;
const SPAWN_Z = WORLD_SIZE / 2;

const canvas = document.getElementById('world');
const coordsLabel = document.getElementById('coords');
const hotbarSlots = [...document.querySelectorAll('.slot')];
const deathScreen = document.getElementById('death-screen');
const deathReasonZhLabel = document.getElementById('death-reason-zh');
const respawnCountdownLabel = document.getElementById('respawn-countdown');

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

const faceHighlight = new THREE.Group();
const faceLightness = new THREE.Mesh(
    facePlaneGeometry,
    new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide
    })
);
const faceOutline = new THREE.Group();
const faceOutlineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    side: THREE.DoubleSide
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

scene.add(new THREE.HemisphereLight(0xd9f2e5, 0x4a5e38, 0.88));
const sun = new THREE.DirectionalLight(0xfff1bd, 0.62);
sun.position.set(-45, 70, 36);
scene.add(sun);

const keys = new Set();
const worldBlocks = new Map();
const chunkGroups = new Map();
let selectedBlock = 'grass';
let jumpQueuedUntil = 0;
let cameraStepOffset = 0;
let isDead = false;
let respawnAt = 0;

const player = {
    pos: new THREE.Vector3(SPAWN_X, SPAWN_Y, SPAWN_Z),
    velocity: new THREE.Vector3(),
    yaw: Math.PI,
    pitch: -0.38,
    onGround: false,
    sprinting: false,
    sprintArmed: false,
    sneaking: false
};

const textureLoader = new THREE.TextureLoader();

function loadBlockMaterial(blockType, faceNumber) {
    const texture = textureLoader.load(`texture-packs/default-1/${blockType}${faceNumber}.png`);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return new THREE.MeshLambertMaterial({ color: 0xffffff, map: texture });
}

const blockMaterials = {};
for (const blockType of ['grass', 'dirt', 'stone', 'bedrock']) {
    blockMaterials[blockType] = [];
    for (let faceNumber = 1; faceNumber <= 5; faceNumber++) {
        blockMaterials[blockType].push(loadBlockMaterial(blockType, faceNumber));
    }
}

function keyOf(x, y, z) {
    return `${x},${y},${z}`;
}

function parseKey(key) {
    return key.split(',').map(Number);
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

function createInitialWorld() {
    const layers = ['bedrock', 'stone', 'dirt', 'grass'];
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                worldBlocks.set(keyOf(x, y, z), layers[y]);
            }
        }
    }
}

const NEIGHBOR_DIRECTIONS = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1]
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
    bucket.indices.push(
        vertexOffset, vertexOffset + 1, vertexOffset + 2,
        vertexOffset, vertexOffset + 2, vertexOffset + 3
    );
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
                    if (blockAt(x + dx, y + dy, z + dz) !== 'air') continue;
                    const materialIndex = Math.min(faceIndex, 4);
                    const materialKey = `${blockType}:${materialIndex}`;
                    appendBlockFace(faceBuckets[materialKey], x, y, z, face);
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
        const materialIndex = Number(materialIndexText);
        const mesh = new THREE.Mesh(geometry, blockMaterials[blockType][materialIndex]);
        mesh.userData.kind = 'chunk-faces';
        mesh.userData.blockType = blockType;
        chunkGroup.add(mesh);
    }

    if (chunkGroup.children.length) {
        worldGroup.add(chunkGroup);
        chunkGroups.set(key, chunkGroup);
    }
}

function rebuildAllChunks() {
    while (worldGroup.children.length) worldGroup.remove(worldGroup.children[0]);
    chunkGroups.clear();

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
        chunks.add(chunkKey(
            chunkCoordinate(x + dx),
            chunkCoordinate(y + dy),
            chunkCoordinate(z + dz)
        ));
    }
    for (const key of chunks) {
        const [cx, cy, cz] = parseKey(key);
        rebuildChunk(cx, cy, cz);
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

function updateCoords() {
    const movementState = player.sneaking ? '  ·  潜行' : player.sprinting ? '  ·  疾跑' : '';
    coordsLabel.textContent = `X ${Math.floor(player.pos.x)}  Y ${Math.floor(player.pos.y)}  Z ${Math.floor(player.pos.z)}${movementState}`;
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
    faceHighlight.visible = false;
    deathReasonZhLabel.textContent = reasonZh;
    respawnCountdownLabel.textContent = String(Math.ceil(RESPAWN_DELAY_MS / 1000));
    deathScreen.hidden = false;
}

function respawnPlayer() {
    player.pos.set(SPAWN_X, SPAWN_Y, SPAWN_Z);
    player.velocity.set(0, 0, 0);
    player.yaw = Math.PI;
    player.pitch = -0.38;
    player.onGround = false;
    player.sprinting = false;
    player.sprintArmed = false;
    player.sneaking = false;
    cameraStepOffset = 0;
    jumpQueuedUntil = 0;
    keys.clear();
    isDead = false;
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

    if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
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

    const speedMultiplier = player.sneaking
        ? SNEAK_SPEED_MULTIPLIER
        : player.sprinting ? SPRINT_SPEED_MULTIPLIER : 1;
    player.velocity.x = wish.x * WALK_SPEED * speedMultiplier;
    player.velocity.z = wish.z * WALK_SPEED * speedMultiplier;

    const now = performance.now();
    if (keys.has('Space')) jumpQueuedUntil = now + JUMP_BUFFER_MS;
    if (player.onGround && jumpQueuedUntil >= now) {
        const jumpMultiplier = player.sneaking ? Math.sqrt(SNEAK_JUMP_HEIGHT_MULTIPLIER) : 1;
        player.velocity.y = JUMP_SPEED * jumpMultiplier;
        player.onGround = false;
        jumpQueuedUntil = 0;
    } else if (jumpQueuedUntil < now) {
        jumpQueuedUntil = 0;
    }

    player.velocity.y = Math.max(player.velocity.y - GRAVITY * delta, -30);
    const wasOnGround = player.onGround;
    player.onGround = false;

    const preventLedgeFall = player.sneaking && wasOnGround;
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
            normalX = -stepX;
            normalY = 0;
            normalZ = 0;
        } else if (maxY <= maxZ) {
            y += stepY;
            distance = maxY;
            maxY += deltaY;
            normalX = 0;
            normalY = -stepY;
            normalZ = 0;
        } else {
            z += stepZ;
            distance = maxZ;
            maxZ += deltaZ;
            normalX = 0;
            normalY = 0;
            normalZ = -stepZ;
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
    faceBlockCenter.set(
        hit.block.x + 0.5,
        hit.block.y + 0.5,
        hit.block.z + 0.5
    );

    faceHighlight.position.copy(faceBlockCenter).addScaledVector(faceNormal, 0.502);
    faceHighlight.quaternion.setFromUnitVectors(faceForward, faceNormal);
    faceHighlight.visible = true;
}

function wouldBlockPlayer(x, y, z) {
    return x + 1 > player.pos.x - PLAYER_RADIUS &&
        x < player.pos.x + PLAYER_RADIUS &&
        z + 1 > player.pos.z - PLAYER_RADIUS &&
        z < player.pos.z + PLAYER_RADIUS &&
        y + 1 > player.pos.y &&
        y < player.pos.y + PLAYER_HEIGHT;
}

function selectBlock(blockType) {
    if (!blockMaterials[blockType]) return;
    selectedBlock = blockType;
    for (const slot of hotbarSlots) {
        const isSelected = slot.dataset.block === selectedBlock;
        slot.classList.toggle('selected', isSelected);
        slot.setAttribute('aria-pressed', String(isSelected));
    }
}

function placeBlock(hit) {
    if (!hit) return;

    const x = hit.block.x + hit.normal.x;
    const y = hit.block.y + hit.normal.y;
    const z = hit.block.z + hit.normal.z;

    if (!inWorldXZ(x, z) || y < 0 || y >= MAX_PLACE_HEIGHT) return;
    if (blockAt(x, y, z) !== 'air') return;
    if (wouldBlockPlayer(x, y, z)) return;

    worldBlocks.set(keyOf(x, y, z), selectedBlock);
    rebuildChunksAround(x, y, z);
}

function removeBlock(hit) {
    if (!hit) return;
    worldBlocks.delete(keyOf(hit.block.x, hit.block.y, hit.block.z));
    rebuildChunksAround(hit.block.x, hit.block.y, hit.block.z);
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
        if (isDead) return;
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });

    document.addEventListener('mousemove', (event) => {
        if (isDead || document.pointerLockElement !== canvas) return;
        player.yaw -= event.movementX * 0.0023;
        player.pitch -= event.movementY * 0.0023;
        player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch));
    });

    document.addEventListener('keydown', (event) => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();
        }
        if (isDead) return;
        keys.add(event.code);

        if (event.code === 'KeyX' && !event.repeat && !player.sneaking) {
            const cancelSprint = player.sprinting || player.sprintArmed;
            player.sprinting = false;
            player.sprintArmed = !cancelSprint;
        }

        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            player.sneaking = true;
            player.sprinting = false;
            player.sprintArmed = false;
        }

        if (event.code === 'Digit1' || event.code === 'Numpad1') selectBlock('grass');
        if (event.code === 'Digit2' || event.code === 'Numpad2') selectBlock('dirt');
        if (event.code === 'Digit3' || event.code === 'Numpad3') selectBlock('stone');
        if (event.code === 'Digit4' || event.code === 'Numpad4') selectBlock('bedrock');

        if (event.code === 'Space' && !event.repeat) {
            jumpQueuedUntil = performance.now() + JUMP_BUFFER_MS;
        }
    });

    document.addEventListener('keyup', (event) => {
        keys.delete(event.code);
        if (event.code === 'Space') jumpQueuedUntil = 0;
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            player.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
        }
    });
    window.addEventListener('blur', () => {
        keys.clear();
        player.sprinting = false;
        player.sprintArmed = false;
        player.sneaking = false;
        jumpQueuedUntil = 0;
    });

    canvas.addEventListener('mousedown', (event) => {
        if (isDead) return;
        const hit = getAimHit();
        if (event.button === 0) removeBlock(hit);
        if (event.button === 2) placeBlock(hit);
    });

    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    if (isDead) {
        updateDeathState(performance.now());
    } else {
        updatePlayer(delta);
        if (player.pos.y <= VOID_DEATH_Y) {
            killPlayer('坠入虚空');
        } else {
            updateFaceHighlight();
        }
    }
    renderer.render(scene, camera);
}

createInitialWorld();
rebuildAllChunks();
resize();
setupInput();
updatePlayer(0);
window.addEventListener('resize', resize);
animate();
