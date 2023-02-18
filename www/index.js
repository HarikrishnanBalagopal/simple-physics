import { greet, Universe, Cell } from "wasm-game-of-life";
import { memory } from 'wasm-game-of-life/wasm_game_of_life_bg';

const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

function main() {
    greet('John');
    const output_wasm = document.querySelector('#output-wasm');
    const output_wasm_canvas = document.querySelector('#output-wasm-canvas');
    const ctx = output_wasm_canvas.getContext('2d');
    const universe = Universe.new();
    universe.tick();
    output_wasm.textContent = universe.render();
    const width = universe.width();
    const height = universe.height();
    const offset = universe.cells();

    console.log('width', width, 'height', height, 'offset', offset);

    output_wasm_canvas.width = (CELL_SIZE + 1) * width + 1;
    output_wasm_canvas.height = (CELL_SIZE + 1) * height + 1;

    const drawGrid = () => {
        ctx.beginPath();
        ctx.strokeStyle = GRID_COLOR;

        // Vertical lines.
        for (let i = 0; i <= width; i++) {
            ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
            ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
        }

        // Horizontal lines.
        for (let j = 0; j <= height; j++) {
            ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
            ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
        }

        ctx.stroke();
    };

    const getIndex = (row, column) => {
        return row * width + column;
    };

    const drawCells = () => {
        const cellsPtr = universe.cells();
        console.log('cellsPtr', cellsPtr);
        const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

        ctx.beginPath();

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const idx = getIndex(row, col);

                ctx.fillStyle = cells[idx] === Cell.Dead
                    ? DEAD_COLOR
                    : ALIVE_COLOR;

                ctx.fillRect(
                    col * (CELL_SIZE + 1) + 1,
                    row * (CELL_SIZE + 1) + 1,
                    CELL_SIZE,
                    CELL_SIZE
                );
            }
        }

        ctx.stroke();
    };

    let last_t = 0;
    const step = (t) => {
        requestAnimationFrame(step);
        if (t - last_t < 1) return;
        last_t = t;
        universe.tick();
        output_wasm.textContent = universe.render();

        drawGrid();
        drawCells();
    };
    requestAnimationFrame(step);
}

main();
