import { drawText, drawOutlinedText, drawGlowText, textWidth } from './font.js';
import { buildCarSprites, CAR_COLORS, CAR_L, COIN } from './sprites.js';
import { fetchFee, checkout } from './api.js';

// ---------------------------------------------------------------------------------------------
// Layout (internal resolution, scaled up with image-rendering: pixelated)
// ---------------------------------------------------------------------------------------------
const W = 480;
const H = 270;
const HUD_H = 22;
const HUD_X = 48;
const LANE_IN_X = 30;
const LANE_OUT_X = 452;
const LANE_HALF = 12;
const BAY_W = 23;
const BAY_DEPTH = 28;
const BAYS_X0 = 60;
const BAYS_PER_ROW = 16;
const BAYS_X1 = BAYS_X0 + BAY_W * BAYS_PER_ROW;
const ROW_TOPS = [32, 96, 160];
const ENTRY_BARRIER_Y = 37;
const EXIT_BARRIER_Y = 236;
const ENTRY_STOP_Y = ENTRY_BARRIER_Y - 12;
const EXIT_STOP_Y = EXIT_BARRIER_Y - 12;
const SPAWN = { x: LANE_IN_X, y: -14 };
const PILLAR_XS = [0, 4, 8, 12, 16].map(i => BAYS_X0 + i * BAY_W);

const aisleY = row => ROW_TOPS[row] + BAY_DEPTH + 12;

// ---------------------------------------------------------------------------------------------
// Simulated clock: lives only here, the backend gets both timestamps with every request.
// Times are UTC-based millis used as zone-less "local" date-times.
// ---------------------------------------------------------------------------------------------
const START = Date.UTC(2026, 10, 5, 7, 0, 0); // Thu 05.11.2026 07:00, stream day
const SPEEDS = [
    // drive: pixels per real second, pause: real seconds a car stands at a barrier
    { label: 'PAUSE', simPerSec: 0, drive: 0, pause: 1 },
    { label: '1 MIN/S', simPerSec: 60, drive: 40, pause: 1.2 },
    { label: '10 MIN/S', simPerSec: 600, drive: 60, pause: 0.8 },
    { label: '1 H/S', simPerSec: 3600, drive: 110, pause: 0.4 },
];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
// cars per simulated hour, by hour of day
const ARRIVALS_PER_HOUR = [0.5, 0.4, 0.3, 0.3, 0.4, 0.8, 2, 5, 7, 6, 5, 5, 5, 5, 5, 5, 6, 6, 4, 3, 2, 1.5, 1, 0.7];
const MAX_ARRIVAL_RATE = Math.max(...ARRIVALS_PER_HOUR);
// Roughly how many cars per simulated day lose their ticket; they pay the lost-ticket fee at the exit.
const LOST_TICKETS_PER_DAY = 10;
const LOST_TICKET_PROBABILITY = LOST_TICKETS_PER_DAY / ARRIVALS_PER_HOUR.reduce((a, b) => a + b, 0);
const MAX_QUEUE = 3;
// The exit handles roughly one car per second, so only a few cars head for it at once;
// the others stay parked a little longer (and keep paying) instead of jamming the aisles.
const MAX_LEAVING = 4;

const pad2 = n => String(n).padStart(2, '0');
const iso = ms => new Date(ms).toISOString().slice(0, 19);
const clock = ms => {
    const d = new Date(ms);
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
};
const dateLine = ms => {
    const d = new Date(ms);
    return `${DAYS[d.getUTCDay()]} ${pad2(d.getUTCDate())}.${pad2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
};
const duration = ms => {
    const minutes = Math.max(0, Math.floor(ms / 60000));
    const h = Math.floor(minutes / 60);
    return h > 0 ? `${h}H ${pad2(minutes % 60)}M` : `${minutes}M`;
};
const randomBetween = (a, b) => a + Math.random() * (b - a);

function sampleStayMinutes() {
    const p = Math.random();
    if (p < 0.2) return randomBetween(5, 30);
    if (p < 0.55) return randomBetween(30, 180);
    if (p < 0.8) return randomBetween(180, 540);
    if (p < 0.94) return randomBetween(540, 1200);
    return randomBetween(1200, 2400);
}

// ---------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------
const state = {
    simMs: START,
    speed: 2,
    lastSpeed: 2,
    rt: 0, // animation time in seconds, stops while paused
    cars: [],
    nextId: 1,
    queue: [],
    nextCandidate: START,
    revenueCents: 0,
    paidCount: 0,
    turnedAway: 0,
    fullUntil: 0,
    backendError: false,
    selectedId: null,
    popups: [],
    entryBarrier: { openAt: -9, closeAt: -9 },
    exitBarrier: { openAt: -9, closeAt: -9 },
};

const bays = [];
ROW_TOPS.forEach((top, row) => {
    for (let i = 0; i < BAYS_PER_ROW; i++) {
        bays.push({ row, x: BAYS_X0 + i * BAY_W + 12, y: top + 14, carId: null });
    }
});

const carSprites = buildCarSprites();
const colorNames = Object.keys(CAR_COLORS);

// ---------------------------------------------------------------------------------------------
// Cars
// ---------------------------------------------------------------------------------------------
function newCar(bay, stayMs) {
    const car = {
        id: state.nextId++,
        color: colorNames[Math.floor(Math.random() * colorNames.length)],
        x: SPAWN.x, y: SPAWN.y, mx: 0, my: 1, face: 'down',
        bay, stayMs,
        state: 'entering',
        path: entryPath(bay),
        entryMs: null, exitMs: null, departAt: null,
        fee: null, feeFlashUntil: 0, feeFlashColor: null,
        inflight: false, lastFetchSim: null, lastFetchWall: 0,
        waitUntil: 0, awaitingPayment: false, paid: null,
        willLoseTicket: Math.random() < LOST_TICKET_PROBABILITY, ticketLost: false,
    };
    bay.carId = car.id;
    state.cars.push(car);
    return car;
}

function entryPath(bay) {
    const ay = aisleY(bay.row);
    return [
        { x: LANE_IN_X, y: ENTRY_STOP_Y, action: 'ticket' },
        { x: LANE_IN_X, y: ay },
        { x: bay.x, y: ay },
        { x: bay.x, y: bay.y, action: 'park' },
    ];
}

function exitPath(bay) {
    const ay = aisleY(bay.row);
    return [
        { x: bay.x, y: ay, reverse: true, action: 'leftBay' },
        { x: LANE_OUT_X, y: ay },
        { x: LANE_OUT_X, y: EXIT_STOP_Y, action: 'pay' },
        { x: LANE_OUT_X, y: H + 16, action: 'remove' },
    ];
}

function freeBays() {
    return bays.filter(b => b.carId === null);
}

function arrive() {
    if (freeBays().length <= state.queue.length) {
        state.turnedAway++;
        state.fullUntil = state.rt + 2;
        return;
    }
    if (state.queue.length >= MAX_QUEUE) {
        state.turnedAway++;
        return;
    }
    state.queue.push({ stayMs: sampleStayMinutes() * 60000 });
}

function spawnClear() {
    return !state.cars.some(c => Math.hypot(c.x - SPAWN.x, c.y - SPAWN.y) < 26);
}

function trySpawn() {
    if (!state.queue.length || !spawnClear()) return;
    const free = freeBays();
    if (!free.length) return;
    const { stayMs } = state.queue.shift();
    newCar(free[Math.floor(Math.random() * free.length)], stayMs);
}

/** Some cars are already parked when the page opens, so the stream starts busy. */
function prefill(count) {
    const free = freeBays().sort(() => Math.random() - 0.5).slice(0, count);
    for (const bay of free) {
        const car = newCar(bay, 0);
        const parkedFor = randomBetween(10, 600) * 60000;
        car.x = bay.x;
        car.y = bay.y;
        car.face = 'up';
        car.path = [];
        car.state = 'parked';
        car.entryMs = START - parkedFor;
        car.departAt = car.entryMs + parkedFor + sampleStayMinutes() * 60000;
    }
}

function faceOf(mx, my) {
    if (Math.abs(mx) > Math.abs(my)) return mx > 0 ? 'right' : 'left';
    return my > 0 ? 'down' : 'up';
}

const isActive = c => c.state !== 'parked' && c.state !== 'gone';

function inCorridor(fromX, fromY, mx, my, other, minAlong) {
    const rx = other.x - fromX;
    const ry = other.y - fromY;
    const along = rx * mx + ry * my;
    const lateral = Math.abs(rx * my - ry * mx);
    return along > minAlong && along < 23 && lateral < 12;
}

/** Is `other` in front of `car`, also looking around the next corner when close to it. */
function rawBlocks(car, other) {
    if (inCorridor(car.x, car.y, car.mx, car.my, other, 0)) return true;
    const [wp, next] = car.path;
    if (wp && next && Math.hypot(wp.x - car.x, wp.y - car.y) < 14) {
        const len = Math.hypot(next.x - wp.x, next.y - wp.y) || 1;
        return inCorridor(wp.x, wp.y, (next.x - wp.x) / len, (next.y - wp.y) / len, other, -6);
    }
    return false;
}

function isBlocked(car) {
    for (const other of state.cars) {
        if (other === car || !isActive(other)) continue;
        if (rawBlocks(car, other)) {
            // two cars waiting for each other: the older one goes first
            if (rawBlocks(other, car) && car.id < other.id) continue;
            return true;
        }
    }
    return false;
}

function aisleClearFor(car) {
    const ay = aisleY(car.bay.row);
    return !state.cars.some(o => o !== car && isActive(o)
        && Math.abs(o.y - ay) < 16 && Math.abs(o.x - car.bay.x) < 36);
}

function leavingCount() {
    return state.cars.filter(c => c.state === 'leaving' || c.state === 'paying').length;
}

function updateCar(car, dt) {
    if (car.state === 'parked') {
        if (state.simMs >= car.departAt && leavingCount() < MAX_LEAVING && aisleClearFor(car)) {
            car.state = 'leaving';
            if (car.willLoseTicket) {
                car.ticketLost = true;
                car.fee = null;
                popup(car.x, car.y - 12, ['TICKET LOST!'], '#ff6060', 1.6);
            }
            car.path = exitPath(car.bay);
        } else {
            return;
        }
    }
    if (car.waitUntil > state.rt || car.awaitingPayment) return;
    const wp = car.path[0];
    if (!wp) return;
    const dx = wp.x - car.x;
    const dy = wp.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) {
        reach(car, wp);
        return;
    }
    car.mx = dx / dist;
    car.my = dy / dist;
    if (!wp.reverse) car.face = faceOf(car.mx, car.my);
    if (isBlocked(car)) return;
    const step = Math.min(dist, SPEEDS[state.speed].drive * dt);
    car.x += car.mx * step;
    car.y += car.my * step;
    if (step === dist) reach(car, wp);
}

function reach(car, wp) {
    car.path.shift();
    switch (wp.action) {
        case 'ticket':
            car.entryMs = state.simMs;
            car.waitUntil = state.rt + pause() * 0.4;
            state.entryBarrier = { openAt: state.rt + pause() * 0.2, closeAt: state.rt + pause() * 0.4 + 0.6 };
            popup(LANE_IN_X + 15, ENTRY_BARRIER_Y + 8, [`IN ${clock(state.simMs)}`], '#ffffff', 1.2);
            break;
        case 'park':
            car.state = 'parked';
            car.face = 'up';
            car.departAt = state.simMs + car.stayMs;
            break;
        case 'leftBay':
            car.bay.carId = null;
            break;
        case 'pay':
            car.state = 'paying';
            car.exitMs = state.simMs;
            car.awaitingPayment = true;
            pay(car);
            break;
        case 'remove':
            car.state = 'gone';
            if (state.selectedId === car.id) state.selectedId = null;
            break;
    }
}

function pay(car) {
    // A lost ticket means the entry time is unknown: the backend then charges the lost-ticket fee.
    checkout(car.ticketLost ? null : iso(car.entryMs), iso(car.exitMs))
        .then(receipt => {
            state.backendError = false;
            car.paid = receipt;
            car.fee = receipt.display;
            car.awaitingPayment = false;
            car.waitUntil = state.rt + pause();
            state.revenueCents += Math.round(receipt.amount * 100);
            state.paidCount++;
            state.exitBarrier = { openAt: state.rt + pause() * 0.7, closeAt: state.rt + pause() + 0.6 };
            popup(LANE_OUT_X - 14, EXIT_STOP_Y - 14,
                [`PAID ${receipt.display} EUR`,
                    car.ticketLost ? 'TICKET LOST' : `${clock(car.entryMs)}-${clock(car.exitMs)}`],
                '#ffe14a', 2.2, true);
        })
        .catch(() => {
            state.backendError = true;
            setTimeout(() => pay(car), 1000);
        });
}

function pause() {
    return SPEEDS[state.speed].pause;
}

function popup(x, y, lines, color, ttl, coin = false) {
    state.popups.push({ x, y, lines, color, coin, t0: state.rt, ttl });
}

// ---------------------------------------------------------------------------------------------
// Running fees: every car that has a ticket asks the backend for its current fee.
// ---------------------------------------------------------------------------------------------
function pollFees() {
    const wall = performance.now();
    for (const car of state.cars) {
        if (car.entryMs === null || car.ticketLost || car.paid || car.state === 'paying' || car.state === 'gone') continue;
        if (car.inflight || car.lastFetchSim === state.simMs || wall - car.lastFetchWall < 300) continue;
        const at = state.simMs;
        car.inflight = true;
        car.lastFetchWall = wall;
        fetchFee(iso(car.entryMs), iso(at))
            .then(response => {
                state.backendError = false;
                car.lastFetchSim = at;
                if (car.paid || car.ticketLost) return;
                if (car.fee !== null && response.display !== car.fee) {
                    car.feeFlashUntil = performance.now() + 500;
                    car.feeFlashColor = Number(response.display) > Number(car.fee) ? '#ffffff' : '#4ff0ff';
                }
                car.fee = response.display;
            })
            .catch(() => { state.backendError = true; })
            .finally(() => { car.inflight = false; });
    }
}

// ---------------------------------------------------------------------------------------------
// Simulation step
// ---------------------------------------------------------------------------------------------
function update(dtReal) {
    const speed = SPEEDS[state.speed];
    if (speed.simPerSec === 0) return;
    state.rt += dtReal;
    state.simMs += dtReal * speed.simPerSec * 1000;

    // arrivals: Poisson process thinned by the hour-of-day rate
    while (state.nextCandidate <= state.simMs) {
        const hour = new Date(state.nextCandidate).getUTCHours();
        if (Math.random() < ARRIVALS_PER_HOUR[hour] / MAX_ARRIVAL_RATE) arrive();
        state.nextCandidate += -Math.log(1 - Math.random()) / MAX_ARRIVAL_RATE * 3600000;
    }
    trySpawn();

    for (const car of state.cars) updateCar(car, dtReal);
    state.cars = state.cars.filter(c => c.state !== 'gone');
    state.popups = state.popups.filter(p => state.rt - p.t0 < p.ttl);
}

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------
const canvas = document.getElementById('garage');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rect(g, color, x, y, w, h) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
}

function drawBush(g, rnd, x, y) {
    const r = 4 + Math.floor(rnd() * 3);
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const d = Math.hypot(dx, dy);
            if (d > r + 0.3) continue;
            let color = '#2f8f3a';
            if (d > r - 1.2) color = '#1d5c26';
            else if (dx + dy < -r / 2 && rnd() > 0.3) color = '#5cc45a';
            else if (rnd() > 0.85) color = '#3fa848';
            rect(g, color, x + dx, y + dy, 1, 1);
        }
    }
}

function drawArrow(g, x, y, dir) {
    const color = '#d8dade';
    const vertical = dir === 'down';
    if (vertical) {
        rect(g, color, x - 1, y - 6, 2, 8);
        for (let i = 0; i < 4; i++) rect(g, color, x - 4 + i, y + 2 + i, 8 - 2 * i, 1);
    } else {
        rect(g, color, x - 6, y - 1, 8, 2);
        for (let i = 0; i < 4; i++) rect(g, color, x + 2 + i, y - 4 + i, 1, 8 - 2 * i);
    }
}

function drawPillar(g, cx, top) {
    const x = cx - 3;
    rect(g, '#2a2c30', x + 1, top + 1, 7, 11); // shadow
    rect(g, '#a4a7ac', x, top, 6, 10);
    rect(g, '#c9ccd1', x, top, 6, 1);
    rect(g, '#7c7f84', x, top, 1, 10);
    for (let j = 3; j < 8; j++) {
        for (let i = 0; i < 6; i++) {
            rect(g, ((i + j) >> 1) % 2 ? '#f2c200' : '#1a1a1a', x + i, top + j, 1, 1);
        }
    }
}

function drawLamp(g, x, y) {
    rect(g, '#3a3c40', x - 1, y - 1, 3, 3);
    rect(g, '#e8f0ff', x, y, 1, 1);
}

const LAMPS = [
    ...ROW_TOPS.flatMap(top => PILLAR_XS.slice(0, 4).map(x => ({ x: x + 46, y: top + BAY_DEPTH + 12 }))),
    { x: LANE_IN_X, y: ENTRY_BARRIER_Y + 4 }, { x: LANE_IN_X, y: 136 },
    { x: LANE_OUT_X, y: 104 }, { x: LANE_OUT_X, y: 168 }, { x: LANE_OUT_X, y: EXIT_BARRIER_Y + 4 },
];

function buildBackground() {
    const bg = document.createElement('canvas');
    bg.width = W;
    bg.height = H;
    const g = bg.getContext('2d');
    const rnd = seededRandom(42);

    rect(g, '#5a5d63', 0, 0, W, H);
    for (let i = 0; i < 5000; i++) {
        rect(g, rnd() > 0.5 ? '#52555b' : '#63666c', Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
    }

    // grass edges with curbs
    const grass = (x, y, w, h) => {
        rect(g, '#2b6b2f', x, y, w, h);
        for (let i = 0; i < w * h / 6; i++) {
            rect(g, rnd() > 0.5 ? '#327a36' : '#245c28', x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), 1, 1);
        }
    };
    grass(0, 0, 14, H);
    rect(g, '#b8bcc0', 14, 0, 2, H);
    rect(g, '#7c8085', 16, 0, 1, H);
    grass(468, 60, 12, H - 60);
    rect(g, '#b8bcc0', 466, 60, 2, H - 60);
    grass(14, 258, LANE_OUT_X - LANE_HALF - 14, 12);
    rect(g, '#b8bcc0', 16, 256, LANE_OUT_X - LANE_HALF - 16, 2);
    rect(g, '#b8bcc0', LANE_OUT_X - LANE_HALF - 2, 240, 2, 30);

    // planter in the top right corner
    rect(g, '#8c8f94', 434, 24, 46, 32);
    rect(g, '#b0b3b8', 434, 24, 46, 2);
    grass(437, 27, 43, 26);
    for (let i = 0; i < 6; i++) drawBush(g, rnd, 442 + i * 7, 32 + (i % 2) * 10);

    for (let x = 4; x < 12; x += 9) {
        for (let y = 12; y < 250; y += 16 + Math.floor(rnd() * 14)) drawBush(g, rnd, x + 2, y);
    }
    for (let x = 24; x < 420; x += 14 + Math.floor(rnd() * 12)) drawBush(g, rnd, x, 266);
    for (let y = 80; y < 250; y += 22) drawBush(g, rnd, 474, y);

    // rows of bays
    ROW_TOPS.forEach(top => {
        rect(g, '#55585e', BAYS_X0, top, BAYS_X1 - BAYS_X0, BAY_DEPTH);
        // wall at the back of the row
        rect(g, '#3e4044', BAYS_X0 - 4, top - 6, BAYS_X1 - BAYS_X0 + 8, 5);
        rect(g, '#8c8f94', BAYS_X0 - 4, top - 6, BAYS_X1 - BAYS_X0 + 8, 4);
        rect(g, '#b0b3b8', BAYS_X0 - 4, top - 6, BAYS_X1 - BAYS_X0 + 8, 1);
        rect(g, '#e6e6e6', BAYS_X0, top, BAYS_X1 - BAYS_X0 + 1, 1);
        for (let i = 0; i <= BAYS_PER_ROW; i++) {
            rect(g, '#e6e6e6', BAYS_X0 + i * BAY_W, top, 1, BAY_DEPTH - 2);
        }
        PILLAR_XS.forEach(x => drawPillar(g, x, top - 8));
    });

    // painted arrows
    drawArrow(g, LANE_IN_X, 70, 'down');
    drawArrow(g, LANE_IN_X, 168, 'down');
    drawArrow(g, LANE_OUT_X, 140, 'down');
    drawArrow(g, LANE_OUT_X, 254, 'down');
    ROW_TOPS.forEach((top, row) => drawArrow(g, 420, aisleY(row), 'right'));
    drawText(g, 'IN', LANE_IN_X - 3, 50, '#d8dade');
    drawText(g, 'EXIT', LANE_OUT_X - 7, 214, '#d8dade');

    // sign, like on the session thumbnail
    rect(g, '#6a6d72', 70, 240, 2, 16);
    rect(g, '#6a6d72', 160, 240, 2, 16);
    rect(g, '#ffffff', 58, 220, 116, 24);
    rect(g, '#1d3fa0', 60, 222, 112, 20);
    rect(g, '#2a55c8', 60, 222, 112, 1);
    drawText(g, 'JUG OBERPFALZ', 116 - textWidth('JUG OBERPFALZ') / 2, 226, '#ffffff');
    drawText(g, 'LIVE 05.11.2026', 116 - textWidth('LIVE 05.11.2026') / 2, 234, '#9fc0ff');

    // entry ticket post and exit pay machine
    rect(g, '#2a2c30', 44, 32, 7, 10);
    rect(g, '#f2c200', 43, 31, 6, 9);
    rect(g, '#1a1a1a', 44, 33, 4, 3);
    rect(g, '#2a2c30', 467, EXIT_BARRIER_Y - 9, 11, 16);
    rect(g, '#f2c200', 466, EXIT_BARRIER_Y - 10, 10, 15);
    rect(g, '#c99a00', 466, EXIT_BARRIER_Y + 3, 10, 2);
    rect(g, '#1a2a3a', 468, EXIT_BARRIER_Y - 8, 6, 4);
    rect(g, '#5cff5c', 469, EXIT_BARRIER_Y - 7, 3, 1);
    rect(g, '#1a1a1a', 469, EXIT_BARRIER_Y - 2, 4, 1);

    LAMPS.forEach(l => drawLamp(g, l.x, l.y));
    return bg;
}

const background = buildBackground();
const nightCanvas = document.createElement('canvas');
nightCanvas.width = W;
nightCanvas.height = H;

function openness(barrier) {
    const t = state.rt;
    if (t < barrier.openAt) return 0;
    if (t < barrier.closeAt) return Math.min(1, (t - barrier.openAt) / 0.25);
    return Math.max(0, 1 - (t - barrier.closeAt) / 0.25);
}

function drawBarrierArm(pivotX, y, length, towardsLeft, open) {
    const len = Math.max(3, Math.round(length * (1 - open)));
    for (let i = 0; i < len; i++) {
        const x = towardsLeft ? pivotX - 1 - i : pivotX + i;
        const color = Math.floor(i / 4) % 2 ? '#ffffff' : '#e02828';
        rect(ctx, '#1a1a1a', x, y + 2, 1, 1);
        rect(ctx, color, x, y, 1, 2);
    }
}

function spriteOf(car) {
    return carSprites[car.color][car.face];
}

function drawCar(car) {
    const sprite = spriteOf(car);
    const x = Math.round(car.x - sprite.width / 2);
    const y = Math.round(car.y - sprite.height / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2, y + 2, sprite.width - 1, sprite.height - 1);
    ctx.drawImage(sprite, x, y);
}

function carBounds(car) {
    const sprite = spriteOf(car);
    return {
        x: Math.round(car.x - sprite.width / 2), y: Math.round(car.y - sprite.height / 2),
        w: sprite.width, h: sprite.height,
    };
}

function nightFactor() {
    const d = new Date(state.simMs);
    const h = d.getUTCHours() + d.getUTCMinutes() / 60;
    if (h >= 7 && h < 17) return 0;
    if (h >= 17 && h < 20) return (h - 17) / 3;
    if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
    return 1;
}

function drawNight(night) {
    if (night <= 0) return;
    const g = nightCanvas.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(6, 10, 40, ${0.58 * night})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.3)';
    for (const lamp of LAMPS) {
        for (const r of [22, 15, 9]) {
            g.beginPath();
            g.arc(lamp.x, lamp.y, r, 0, Math.PI * 2);
            g.fill();
        }
    }
    ctx.drawImage(nightCanvas, 0, 0);

    // headlights of moving cars
    const FRONT = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const car of state.cars) {
        if (car.state === 'parked') continue;
        const [fx, fy] = FRONT[car.face];
        for (let d = 1; d <= 10; d++) {
            ctx.fillStyle = `rgba(255, 240, 170, ${0.32 * night * (1 - d / 11)})`;
            const width = 8 + Math.floor(d / 2) * 2;
            const cx = Math.round(car.x + fx * (CAR_L / 2 + d));
            const cy = Math.round(car.y + fy * (CAR_L / 2 + d));
            if (fx) ctx.fillRect(cx, cy - width / 2, 1, width);
            else ctx.fillRect(cx - width / 2, cy, width, 1);
        }
    }
}

function drawFeeLabel(car) {
    if (car.fee === null) return;
    const flashing = performance.now() < car.feeFlashUntil;
    const text = car.fee;
    const w = textWidth(text) + 4;
    const b = carBounds(car);
    const x = Math.round(car.x - w / 2);
    const y = b.y - 8;
    rect(ctx, flashing ? car.feeFlashColor : '#0d3a10', x - 1, y - 1, w + 2, 9);
    rect(ctx, '#071407', x, y, w, 7);
    drawText(ctx, text, x + 2, y + 1, flashing ? car.feeFlashColor : '#7cff5b');
}

function drawSelection(car) {
    const b = carBounds(car);
    const phase = Math.floor(performance.now() / 120) % 4;
    for (let i = 0; i < 2 * (b.w + b.h + 8); i++) {
        if (((i + phase) >> 1) % 2) continue;
        let x;
        let y;
        const w = b.w + 4;
        const h = b.h + 4;
        if (i < w) { x = i; y = 0; }
        else if (i < w + h) { x = w - 1; y = i - w; }
        else if (i < 2 * w + h) { x = 2 * w + h - 1 - i; y = h - 1; }
        else { x = 0; y = 2 * (w + h) - 1 - i; }
        rect(ctx, '#ff3030', b.x - 2 + x, b.y - 2 + y, 1, 1);
    }
}

function drawPopups() {
    for (const p of state.popups) {
        const t = (state.rt - p.t0) / p.ttl;
        const rise = Math.round(t * 10);
        const widest = Math.max(...p.lines.map(l => textWidth(l)));
        const x = Math.round(Math.min(p.x, W - 4 - widest) - (p.coin ? widest : 0));
        const y = Math.round(p.y - rise);
        if (p.coin) {
            const bounce = Math.round(Math.abs(Math.sin(state.rt * 8)) * 2);
            ctx.drawImage(COIN, x - 11, y - bounce - 1);
        }
        p.lines.forEach((line, i) => drawOutlinedText(ctx, line, x, y + i * 7, i === 0 ? p.color : '#ffffff'));
    }
}

function drawPanel(x, y, w, h) {
    rect(ctx, '#2f7a2a', x - 1, y - 1, w + 2, h + 2);
    rect(ctx, '#071407', x, y, w, h);
}

function drawHud() {
    rect(ctx, '#0a120a', HUD_X, 0, W - HUD_X, HUD_H);
    rect(ctx, '#2f7a2a', HUD_X, HUD_H, W - HUD_X, 1);
    rect(ctx, '#2f7a2a', HUD_X - 1, 0, 1, HUD_H + 1);

    drawGlowText(ctx, 'BDD GARAGE', 54, 6, '#7cff5b', '#3cff3c', 2);

    const green = '#7cff5b';
    const dim = '#3f9a36';
    drawText(ctx, dateLine(state.simMs), 160, 3, dim);
    drawGlowText(ctx, clock(state.simMs), 160, 10, green, '#3cff3c', 2);
    drawText(ctx, nightFactor() >= 0.5 ? 'NIGHT' : 'DAY', 203, 15, dim);

    drawText(ctx, 'REVENUE', 236, 3, dim);
    const revenue = `${(state.revenueCents / 100).toFixed(2)} EUR`;
    drawGlowText(ctx, revenue, 236, 10, '#ffe14a', '#ffc000', 2);

    const free = freeBays().length;
    const full = free === 0 || state.rt < state.fullUntil;
    drawText(ctx, `FREE ${free}/${bays.length}`, 360, 3, full ? '#ff4040' : green);
    drawText(ctx, `PAID ${state.paidCount}`, 360, 9, green);
    drawText(ctx, `AWAY ${state.turnedAway}`, 360, 15, dim);
    drawText(ctx, SPEEDS[state.speed].label, 420, 3, state.speed === 0 ? '#ff4040' : green);
    drawText(ctx, `CARS ${state.cars.length}`, 420, 9, dim);

    if (full) {
        const blink = Math.floor(performance.now() / 400) % 2;
        drawPanel(LANE_IN_X + 22, 10 + HUD_H, 22, 9);
        if (blink) drawText(ctx, 'FULL', LANE_IN_X + 26, 12 + HUD_H, '#ff4040');
    }
}

function drawInfoPanel() {
    const x = 190;
    const y = 220;
    drawPanel(x, y, 230, 30);
    const car = state.cars.find(c => c.id === state.selectedId);
    const green = '#7cff5b';
    if (!car) {
        drawText(ctx, 'CLICK A CAR TO FOLLOW ITS TICKET', x + 4, y + 4, '#3f9a36');
        drawText(ctx, 'SPACE PAUSE  1-3 SPEED  C NEW CAR', x + 4, y + 12, '#3f9a36');
        drawText(ctx, 'FEES: JAVA FEECALCULATOR VIA /API/FEE', x + 4, y + 20, '#3f9a36');
        return;
    }
    drawText(ctx, `CAR #${car.id} ${car.color} - ${car.state}`, x + 4, y + 4, green);
    if (car.entryMs === null) {
        drawText(ctx, 'NO TICKET YET', x + 4, y + 12, green);
        return;
    }
    if (car.ticketLost) {
        drawText(ctx, 'TICKET LOST - MIN. DAILY FEE', x + 4, y + 12, '#ff6060');
        drawText(ctx, `FEE ${car.fee ?? '...'} EUR${car.paid ? ' PAID' : ''}`, x + 120, y + 20, '#ffe14a');
        return;
    }
    const until = car.exitMs ?? state.simMs;
    drawText(ctx, `IN  ${dateLine(car.entryMs)} ${clock(car.entryMs)}`, x + 4, y + 12, green);
    drawText(ctx, `STAY ${duration(until - car.entryMs)}`, x + 4, y + 20, green);
    drawText(ctx, `FEE ${car.fee ?? '...'} EUR${car.paid ? ' PAID' : ''}`, x + 120, y + 20, '#ffe14a');
}

function render() {
    ctx.drawImage(background, 0, 0);
    drawBarrierArm(43, ENTRY_BARRIER_Y - 1, LANE_HALF * 2 + 1, true, openness(state.entryBarrier));
    drawBarrierArm(466, EXIT_BARRIER_Y - 1, LANE_HALF * 2 + 2, true, openness(state.exitBarrier));

    const sorted = [...state.cars].sort((a, b) => a.y - b.y);
    sorted.forEach(drawCar);
    drawNight(nightFactor());
    sorted.filter(c => c.state === 'parked' || c.state === 'leaving' || c.state === 'paying')
        .forEach(drawFeeLabel);
    const selected = state.cars.find(c => c.id === state.selectedId);
    if (selected) drawSelection(selected);
    drawPopups();
    drawHud();
    drawInfoPanel();

    if (state.backendError) {
        drawPanel(170, 120, 140, 20);
        drawText(ctx, 'BACKEND OFFLINE', 240 - textWidth('BACKEND OFFLINE') / 2, 124, '#ff4040');
        drawText(ctx, 'IS SPRING BOOT RUNNING?', 240 - textWidth('IS SPRING BOOT RUNNING?') / 2, 132, '#ff8080');
    }
    if (state.speed === 0 && Math.floor(performance.now() / 500) % 2) {
        drawGlowText(ctx, 'PAUSED', 240 - textWidth('PAUSED', 3) / 2, 110, '#7cff5b', '#3cff3c', 3);
    }
}

// ---------------------------------------------------------------------------------------------
// Controls and main loop
// ---------------------------------------------------------------------------------------------
const buttons = [...document.querySelectorAll('[data-speed]')];

function setSpeed(index) {
    if (index !== 0) state.lastSpeed = index;
    state.speed = index;
    buttons.forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === index));
}

buttons.forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
document.getElementById('add-car').addEventListener('click', arrive);
document.addEventListener('keydown', e => {
    if (e.key === ' ') {
        e.preventDefault();
        setSpeed(state.speed === 0 ? state.lastSpeed : 0);
    } else if (['1', '2', '3'].includes(e.key)) {
        setSpeed(Number(e.key));
    } else if (e.key === 'c' || e.key === 'C') {
        arrive();
    }
});

canvas.addEventListener('click', e => {
    const box = canvas.getBoundingClientRect();
    const x = (e.clientX - box.left) * W / box.width;
    const y = (e.clientY - box.top) * H / box.height;
    const hit = state.cars.find(c => {
        const b = carBounds(c);
        return x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2;
    });
    state.selectedId = hit ? hit.id : null;
});

function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    document.documentElement.style.setProperty('--s', scale);
}
window.addEventListener('resize', fit);
fit();

prefill(18);
setSpeed(state.speed);
setInterval(pollFees, 100);

let last = performance.now();
function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// handy for poking around in the browser console during the stream
window.garage = {
    state, bays, setSpeed, arrive,
    step(seconds = 1 / 30) {
        update(seconds);
        render();
    },
};
