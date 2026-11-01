// Pixel sprites drawn in code: cars in four directions and a coin.

export const CAR_COLORS = {
    yellow: ['#f4c20d', '#ffe66b', '#b88a00'],
    blue: ['#2f6fe0', '#6aa0ff', '#1c47a0'],
    green: ['#3cc43c', '#84f07a', '#238a2a'],
    purple: ['#9b4fe0', '#c890ff', '#6a2aa8'],
    cyan: ['#2ec8d0', '#8af0f0', '#17868f'],
    orange: ['#f08a24', '#ffbc6a', '#b25a0e'],
    red: ['#e03a3a', '#ff8080', '#9c1c1c'],
    white: ['#e4e6ea', '#ffffff', '#9ea2aa'],
    pink: ['#ec5aa8', '#ff9ad0', '#a8306e'],
};

// 12x20, facing up (front at the top).
const CAR = [
    '..kkkkkkkk..',
    '.khbbbbbbhk.',
    'kbbllllllbbk',
    'kbbbbbbbbbbk',
    'kbwwwwwwwwbk',
    'kbwgwwwwwwbk',
    'kbwwwwwwwwbk',
    'kdbllllllbdk',
    'kdbllllllbdk',
    'kdbllllllbdk',
    'kdbbbbbbbbdk',
    'kdbbbbbbbbdk',
    'kdbbbbbbbbdk',
    'kbwwwwwwwwbk',
    'kbwgwwwwwwbk',
    'kbbbbbbbbbbk',
    'kbbddddddbbk',
    'kbbbbbbbbbbk',
    '.ktbbbbbbtk.',
    '..kkkkkkkk..',
];

export const CAR_L = 20;

function paint(pattern, palette) {
    const c = document.createElement('canvas');
    c.width = pattern[0].length;
    c.height = pattern.length;
    const g = c.getContext('2d');
    for (let y = 0; y < pattern.length; y++) {
        for (let x = 0; x < pattern[y].length; x++) {
            const color = palette[pattern[y][x]];
            if (color) {
                g.fillStyle = color;
                g.fillRect(x, y, 1, 1);
            }
        }
    }
    return c;
}

function rotated(src, quarterTurns) {
    const c = document.createElement('canvas');
    const swap = quarterTurns % 2 === 1;
    c.width = swap ? src.height : src.width;
    c.height = swap ? src.width : src.height;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.translate(c.width / 2, c.height / 2);
    g.rotate(quarterTurns * Math.PI / 2);
    g.drawImage(src, -src.width / 2, -src.height / 2);
    return c;
}

/** { colorName: { up, right, down, left } } */
export function buildCarSprites() {
    const sprites = {};
    for (const [name, [base, light, dark]] of Object.entries(CAR_COLORS)) {
        const up = paint(CAR, {
            k: '#141418', b: base, l: light, d: dark,
            w: '#24303c', g: '#8fc0e0', h: '#fff4a8', t: '#ff2a2a',
        });
        sprites[name] = { up, right: rotated(up, 1), down: rotated(up, 2), left: rotated(up, 3) };
    }
    return sprites;
}

export const COIN = paint([
    '..kkkk..',
    '.kyyyyk.',
    'kyllyyok',
    'kyloyyok',
    'kyloyyok',
    'kyyyyook',
    '.kyoook.',
    '..kkkk..',
], { k: '#3a2a00', y: '#ffd23f', l: '#fff3a0', o: '#d89a00' });
