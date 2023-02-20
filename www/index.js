import { greet, Universe, Cell, PhysicsUniverse } from "wasm-game-of-life";
import { memory } from 'wasm-game-of-life/wasm_game_of_life_bg';

const W = 640;
const H = W;
const NUM_PARTICLES = 100;
const GRAVITY = 0.001;
const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

function main() {
    greet('John');
    const output_wasm = document.querySelector('#output-wasm');
    const output_wasm_canvas = document.querySelector('#output-wasm-canvas');
    const output_wasm_physics_canvas = document.querySelector('#output-wasm-physics-canvas');
    const button_add_particle = document.querySelector('#button-add-particle');
    const ctx = output_wasm_canvas.getContext('2d');
    const physicsCtx = output_wasm_physics_canvas.getContext('2d');
    const universe = Universe.new();
    universe.tick();

    const physicsUniverse = PhysicsUniverse.new(NUM_PARTICLES);
    physicsUniverse.set_gravity(GRAVITY);
    console.log('physicsUniverse', physicsUniverse);
    physicsUniverse.tick(0.1);
    const dataStr = physicsUniverse.render();
    const data = JSON.parse(dataStr);
    console.log('data', data);

    output_wasm.textContent = universe.render();
    const width = universe.width();
    const height = universe.height();
    const offset = universe.cells();

    console.log('width', width, 'height', height, 'offset', offset);

    output_wasm_canvas.width = (CELL_SIZE + 1) * width + 1;
    output_wasm_canvas.height = (CELL_SIZE + 1) * height + 1;
    output_wasm_physics_canvas.width = W;
    output_wasm_physics_canvas.height = H;

    button_add_particle.addEventListener('click', () => physicsUniverse.add_particle());

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
        // console.log('cellsPtr', cellsPtr);
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

    const drawBackground = () => {
        physicsCtx.save();
        physicsCtx.fillStyle = 'black';
        physicsCtx.fillRect(0, 0, W, H);
        physicsCtx.fillStyle = '#222222';
        physicsCtx.beginPath();
        physicsCtx.arc(W / 2, H / 2, W / 2, 0, 2 * Math.PI);
        physicsCtx.fill();
        physicsCtx.restore();
    }

    const drawParticles = () => {
        physicsCtx.save();
        const dataStr = physicsUniverse.render();
        // console.log('dataStr', dataStr);
        const data = JSON.parse(dataStr);
        // console.log('data', data);

        for (let p of data) {
            physicsCtx.fillStyle = `hsl(${p.color}, 100%, 50%)`;
            physicsCtx.beginPath();
            physicsCtx.arc(p.pos[0], p.pos[1], p.radius, 0, 2 * Math.PI);
            physicsCtx.fill();
        }

        physicsCtx.restore();
    };

    let last_t = 0;
    const step = (t) => {
        requestAnimationFrame(step);
        const dt = t - last_t;
        if (dt < 1) return;
        last_t = t;
        universe.tick();
        output_wasm.textContent = universe.render();

        drawGrid();
        drawCells();

        physicsUniverse.tick(dt);
        drawBackground();
        drawParticles();
    };
    requestAnimationFrame(step);
}

main();
