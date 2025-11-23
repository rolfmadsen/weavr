import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';

const PADDING_Y = 12;
const LINE_HEIGHT = 18;
const STEREOTYPE_HEIGHT = 16;
const FONT_FAMILY = 'Roboto, sans-serif';
const FONT_SIZE = '14px'; // 0.9rem approx

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function getContext() {
    if (!canvas) {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
    }
    return ctx;
}

export function measureTextWidth(text: string, font: string): number {
    const context = getContext();
    if (!context) return 0;
    context.font = font;
    return context.measureText(text).width;
}

export function wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = words[0];

    const context = getContext();
    if (!context) return [text];
    context.font = `${FONT_SIZE} ${FONT_FAMILY}`;

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

export function calculateNodeHeight(name: string): number {
    const maxWidth = NODE_WIDTH - 20; // Padding
    const lines = wrapText(name, maxWidth);

    let requiredHeight = PADDING_Y * 2;
    requiredHeight += STEREOTYPE_HEIGHT;
    requiredHeight += lines.length * LINE_HEIGHT;

    // Round up to nearest multiple of 40 (2 * GRID_SIZE) to ensure center alignment on 20px grid
    const GRID_UNIT = 40;
    const rawHeight = Math.max(MIN_NODE_HEIGHT, requiredHeight);
    return Math.ceil(rawHeight / GRID_UNIT) * GRID_UNIT;
}
