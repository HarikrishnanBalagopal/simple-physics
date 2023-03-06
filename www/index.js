import { Universe, Cell, PhysicsUniverse } from "simple-physics";
import { memory } from 'simple-physics/simple_physics_bg';

const W = 640;
const H = W;
const NUM_SUB_STEPS = 4;
const NUM_PARTICLES = 100;
const GRAVITY = 0.001;
const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

function main() {
    const output_wasm = document.querySelector('#output-wasm');
    const output_wasm_canvas = document.querySelector('#output-wasm-canvas');
    const output_wasm_physics_canvas = document.querySelector('#output-wasm-physics-canvas');
    const button_add_particle = document.querySelector('#button-add-particle');
    const button_clear_particle = document.querySelector('#button-clear-particle');
    const button_fountain = document.querySelector('#button-fountain');
    const output_fps = document.querySelector('#output-fps');
    const output_num_particles = document.querySelector('#output-num-particles');
    let avg_fps = 0;
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
    button_clear_particle.addEventListener('click', () => physicsUniverse.delete_all_particles());

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

    console.log('physicsUniverse', physicsUniverse);
    console.log('physicsUniverse.get_num', physicsUniverse.get_num());
    const PARTICLE_MEM_SIZE = physicsUniverse.get_particles_mem_size();
    const PARTICLE_MEM_SIZE_IN_FLOATS = Math.floor(PARTICLE_MEM_SIZE / 4);
    console.log('physicsUniverse.get_particles_mem_size', PARTICLE_MEM_SIZE, 'PARTICLE_MEM_SIZE_IN_FLOATS', PARTICLE_MEM_SIZE_IN_FLOATS);
    const CURR_NUM_PARTICLES = physicsUniverse.get_num_particles();
    console.log('physicsUniverse.get_num_particles', CURR_NUM_PARTICLES);
    const particlesPtr = physicsUniverse.get_particles_offset();
    console.log('particlesPtr', particlesPtr);
    let particlesMemArray = new Float32Array(memory.buffer, particlesPtr, CURR_NUM_PARTICLES * PARTICLE_MEM_SIZE_IN_FLOATS);
    // console.log('particlesMemArray', particlesMemArray);

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

    // const drawParticles = () => {
    //     physicsCtx.save();
    //     const dataStr = physicsUniverse.render();
    //     // console.log('dataStr', dataStr);
    //     const data = JSON.parse(dataStr);
    //     // console.log('data', data);

    //     for (let p of data) {
    //         physicsCtx.fillStyle = `hsl(${p.color}, 100%, 50%)`;
    //         physicsCtx.beginPath();
    //         physicsCtx.arc(p.pos[0], p.pos[1], p.radius, 0, 2 * Math.PI);
    //         physicsCtx.fill();
    //     }

    //     physicsCtx.restore();
    // };
    let LAST_CURR_NUM_PARTICLES = CURR_NUM_PARTICLES;
    let LAST_POINTER = particlesPtr;
    const drawParticles = () => {
        physicsCtx.save();
        const CURR_NUM_PARTICLES = physicsUniverse.get_num_particles();
        // console.log('physicsUniverse.get_num_particles', CURR_NUM_PARTICLES);
        const particlesPtr = physicsUniverse.get_particles_offset();
        // console.log('physicsUniverse.get_particles_offset', particlesPtr);
        if (LAST_CURR_NUM_PARTICLES !== CURR_NUM_PARTICLES || LAST_POINTER !== particlesPtr) {
            // console.log('LAST_CURR_NUM_PARTICLES !== CURR_NUM_PARTICLES', LAST_CURR_NUM_PARTICLES, 'particlesPtr', particlesPtr);
            LAST_CURR_NUM_PARTICLES = CURR_NUM_PARTICLES;
            LAST_POINTER = particlesPtr;
            particlesMemArray = new Float32Array(memory.buffer, particlesPtr, CURR_NUM_PARTICLES * PARTICLE_MEM_SIZE_IN_FLOATS);
            // console.log('particlesMemArray', particlesMemArray);
        }

        for (let i = 0; i < CURR_NUM_PARTICLES * PARTICLE_MEM_SIZE_IN_FLOATS; i += PARTICLE_MEM_SIZE_IN_FLOATS) {
            const x = particlesMemArray[i + 0];
            const y = particlesMemArray[i + 1];
            const radius = particlesMemArray[i + 4];
            const color = particlesMemArray[i + 5];
            // console.log(x, y, radius, color);
            physicsCtx.fillStyle = `hsl(${color}, 100%, 50%)`;
            physicsCtx.beginPath();
            physicsCtx.arc(x, y, radius < 0 ? 1. : radius, 0, 2 * Math.PI);
            physicsCtx.fill();
        }

        physicsCtx.restore();
    };

    let last_t = 0;
    let stepping_mutex = false;
    const step = (t) => {
        requestAnimationFrame(step);
        if (stepping_mutex) return;
        stepping_mutex = true;
        const dt = t - last_t;
        if (dt < 1) return;
        {
            const fps = 1000 / dt;
            avg_fps = 0.9 * avg_fps + 0.1 * fps;
            output_fps.textContent = Math.floor(avg_fps*100)/100;
        }
        {
            output_num_particles.textContent = physicsUniverse.get_num_particles();
        }
        last_t = t;
        universe.tick();
        output_wasm.textContent = universe.render();

        drawGrid();
        drawCells();

        // physicsUniverse.tick(dt);
        for (let i = 0; i < NUM_SUB_STEPS; i++) {
            physicsUniverse.tick(dt / NUM_SUB_STEPS);
        }
        drawBackground();
        drawParticles();
        stepping_mutex = false;
    };

    let fountain_activated = false;
    button_fountain.addEventListener('click', () => {
        fountain_activated = !fountain_activated;
        if (fountain_activated) {
            const add = () => {
                if (!fountain_activated) return;
                const scale = 10.;
                const scaled_t = last_t*0.01;
                physicsUniverse.add_particle_at_pos(W/2, H/2, W/2+scale*Math.cos(0.1*scaled_t), H/2+scale*Math.sin(0.1*scaled_t), 5.+5*Math.random(), scaled_t);
                setTimeout(add, 100);
            };
            setTimeout(add);
        }
    });

    requestAnimationFrame(step);
}

main();
