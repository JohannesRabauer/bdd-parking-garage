// Tiny 3x5 bitmap font, drawn pixel by pixel so it stays crisp at the low internal resolution.
const GLYPHS = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111'],
    'A': ['010', '101', '111', '101', '101'],
    'B': ['110', '101', '110', '101', '110'],
    'C': ['011', '100', '100', '100', '011'],
    'D': ['110', '101', '101', '101', '110'],
    'E': ['111', '100', '110', '100', '111'],
    'F': ['111', '100', '110', '100', '100'],
    'G': ['011', '100', '101', '101', '011'],
    'H': ['101', '101', '111', '101', '101'],
    'I': ['111', '010', '010', '010', '111'],
    'J': ['001', '001', '001', '101', '010'],
    'K': ['101', '101', '110', '101', '101'],
    'L': ['100', '100', '100', '100', '111'],
    'M': ['101', '111', '111', '101', '101'],
    'N': ['110', '101', '101', '101', '101'],
    'O': ['010', '101', '101', '101', '010'],
    'P': ['110', '101', '110', '100', '100'],
    'Q': ['010', '101', '101', '110', '011'],
    'R': ['110', '101', '110', '101', '101'],
    'S': ['011', '100', '010', '001', '110'],
    'T': ['111', '010', '010', '010', '010'],
    'U': ['101', '101', '101', '101', '111'],
    'V': ['101', '101', '101', '101', '010'],
    'W': ['101', '101', '111', '111', '101'],
    'X': ['101', '101', '010', '101', '101'],
    'Y': ['101', '101', '010', '010', '010'],
    'Z': ['111', '001', '010', '100', '111'],
    '.': ['0', '0', '0', '0', '1'],
    ':': ['0', '1', '0', '1', '0'],
    '!': ['1', '1', '1', '0', '1'],
    '/': ['001', '001', '010', '100', '100'],
    '-': ['000', '000', '111', '000', '000'],
    '+': ['000', '010', '111', '010', '000'],
    '#': ['101', '111', '101', '111', '101'],
    '?': ['111', '001', '010', '000', '010'],
    ' ': ['00', '00', '00', '00', '00'],
};

function glyph(ch) {
    return GLYPHS[ch] || GLYPHS['?'];
}

export const FONT_HEIGHT = 5;

export function textWidth(text, scale = 1) {
    let width = 0;
    for (const ch of text.toUpperCase()) {
        width += (glyph(ch)[0].length + 1) * scale;
    }
    return Math.max(0, width - scale);
}

export function drawText(ctx, text, x, y, color, scale = 1) {
    ctx.fillStyle = color;
    let cx = Math.round(x);
    y = Math.round(y);
    for (const ch of text.toUpperCase()) {
        const rows = glyph(ch);
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                if (rows[r][c] === '1') {
                    ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
                }
            }
        }
        cx += (rows[0].length + 1) * scale;
    }
}

/** Text with a dark 1px outline, readable on any background. */
export function drawOutlinedText(ctx, text, x, y, color, outline = '#000', scale = 1) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) {
        drawText(ctx, text, x + dx, y + dy, outline, scale);
    }
    drawText(ctx, text, x, y, color, scale);
}

const glowCache = new Map();

/** Arcade-style glowing text, rendered once and cached as an image. */
export function drawGlowText(ctx, text, x, y, color, glow, scale = 1) {
    const key = `${text}|${color}|${glow}|${scale}`;
    let img = glowCache.get(key);
    if (!img) {
        const pad = 4;
        img = document.createElement('canvas');
        img.width = textWidth(text, scale) + pad * 2;
        img.height = FONT_HEIGHT * scale + pad * 2;
        const g = img.getContext('2d');
        g.shadowColor = glow;
        g.shadowBlur = 3;
        drawText(g, text, pad + 1, pad + 1, '#0a2a0a', scale);
        drawText(g, text, pad, pad, color, scale);
        g.shadowBlur = 0;
        drawText(g, text, pad, pad, color, scale);
        if (glowCache.size > 300) {
            glowCache.clear();
        }
        glowCache.set(key, img);
    }
    ctx.drawImage(img, Math.round(x) - 4, Math.round(y) - 4);
}
