import { NODE_WIDTH, MIN_NODE_HEIGHT, FONT_FAMILY, FONT_SIZE, LINE_HEIGHT, NODE_PADDING, GRID_SIZE } from '../constants';

const PADDING_Y = 12;
const STEREOTYPE_HEIGHT = 16;

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
    const paragraphs = text.split('\n');
    const allLines: string[] = [];
    const context = getContext();
    if (!context) return [text];
    context.font = `500 ${FONT_SIZE}px ${FONT_FAMILY}`; // Match Konva font weight

    paragraphs.forEach(paragraph => {
        const words = paragraph.split(/\s+/);
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = context.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                allLines.push(currentLine);
                currentLine = word;
            }
        }
        allLines.push(currentLine);
    });

    return allLines;
}

export function calculateNodeHeight(name: string): number {
    const maxWidth = NODE_WIDTH - (NODE_PADDING * 2);
    const lines = wrapText(name, maxWidth);

    let requiredHeight = PADDING_Y * 2;
    requiredHeight += STEREOTYPE_HEIGHT;
    requiredHeight += lines.length * (FONT_SIZE * LINE_HEIGHT);

    // Round up to nearest multiple of GRID_SIZE to ensure alignment
    const rawHeight = Math.max(MIN_NODE_HEIGHT, requiredHeight);
    return Math.ceil(rawHeight / GRID_SIZE) * GRID_SIZE;
}
