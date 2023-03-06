import { PhysicsUniverse } from "@haribala/simple-physics";
import { memory } from '@haribala/simple-physics/simple_physics_bg.wasm';

const W = 640;
const H = W;
const NUM_SUB_STEPS = 4;
const NUM_PARTICLES = 100;
const GRAVITY = 0.001;
const PARTICLES_STRUCT_X_OFFSET = 1;
const PARTICLES_STRUCT_Y_OFFSET = 2;
const PARTICLES_STRUCT_R_OFFSET = 5;
const PARTICLES_STRUCT_C_OFFSET = 6;

function main() {
    // model
    const physicsUniverse = PhysicsUniverse.new(NUM_PARTICLES);
    physicsUniverse.set_gravity(GRAVITY);
    console.log('physicsUniverse', physicsUniverse);
    console.log('physicsUniverse.get_num', physicsUniverse.get_num());
    physicsUniverse.tick(0.1);
    const PARTICLE_MEM_SIZE = physicsUniverse.get_particles_mem_size();
    const PARTICLE_MEM_SIZE_IN_FLOATS = Math.floor(PARTICLE_MEM_SIZE / 4);
    console.log('physicsUniverse.get_particles_mem_size', PARTICLE_MEM_SIZE, 'PARTICLE_MEM_SIZE_IN_FLOATS', PARTICLE_MEM_SIZE_IN_FLOATS);
    const CURR_NUM_PARTICLES = physicsUniverse.get_num_particles();
    console.log('physicsUniverse.get_num_particles', CURR_NUM_PARTICLES);
    const particlesPtr = physicsUniverse.get_particles_offset();
    console.log('particlesPtr', particlesPtr);
    let particlesMemArray = new Float32Array(memory.buffer, particlesPtr, CURR_NUM_PARTICLES * PARTICLE_MEM_SIZE_IN_FLOATS);
    console.log('particlesMemArray', particlesMemArray);

    // output
    const output_fps = document.querySelector('#output-fps');
    const output_num_particles = document.querySelector('#output-num-particles');
    const output_wasm_physics_canvas = document.querySelector('#output-wasm-physics-canvas');
    output_wasm_physics_canvas.width = W;
    output_wasm_physics_canvas.height = H;
    const physicsCtx = output_wasm_physics_canvas.getContext('2d');

    // input
    const button_pause = document.querySelector('#button-pause');
    const button_add_particle = document.querySelector('#button-add-particle');
    const button_clear_particle = document.querySelector('#button-clear-particle');
    const button_fountain = document.querySelector('#button-fountain');
    const checkbox_chain = document.querySelector('#checkbox-chain');
    button_add_particle.addEventListener('click', () => console.log('added particle with id:', physicsUniverse.add_particle()));
    button_clear_particle.addEventListener('click', () => physicsUniverse.delete_all_particles());

    // rendering
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
            const x = particlesMemArray[i + PARTICLES_STRUCT_X_OFFSET];
            const y = particlesMemArray[i + PARTICLES_STRUCT_Y_OFFSET];
            const radius = particlesMemArray[i + PARTICLES_STRUCT_R_OFFSET];
            const color = particlesMemArray[i + PARTICLES_STRUCT_C_OFFSET];
            // console.log(x, y, radius, color);
            physicsCtx.fillStyle = `hsl(${color}, 100%, 50%)`;
            physicsCtx.beginPath();
            physicsCtx.arc(x, y, radius < 0 ? 1. : radius, 0, 2 * Math.PI);
            physicsCtx.fill();
        }

        physicsCtx.restore();
    };

    // update
    let playing = true;
    let fountain_activated = false;
    let avg_fps = 0;
    let last_t = 0;
    let last_fountain_t = 0;
    let last_fountain_chain_id = -1;
    const step = (t) => {
        if (!playing) return;
        requestAnimationFrame(step);
        if (!last_t) last_t = t;
        if (!last_fountain_t) last_fountain_t = t;
        const dt = t - last_t;
        if (dt < 1) return;
        {
            const fps = 1000 / dt;
            avg_fps = 0.9 * avg_fps + 0.1 * fps;
            output_fps.textContent = Math.floor(avg_fps * 100) / 100;
        }
        {
            output_num_particles.textContent = physicsUniverse.get_num_particles();
        }
        last_t = t;
        if (fountain_activated && t - last_fountain_t > 100) {
            last_fountain_t = t;
            const scale = 10.;
            const scaled_t = last_t * 0.01;
            const old_x = W / 2 + scale * Math.cos(0.1 * scaled_t);
            const old_y = H / 2 + scale * Math.sin(0.1 * scaled_t);
            const fountain_chain_id = physicsUniverse.add_particle_at_pos(W / 2, H / 2, old_x, old_y, 5. + 5 * Math.random(), scaled_t);
            if (checkbox_chain.checked && last_fountain_chain_id >= 0) physicsUniverse.link_particles(fountain_chain_id, last_fountain_chain_id);
            last_fountain_chain_id = fountain_chain_id;
        }

        for (let i = 0; i < NUM_SUB_STEPS; i++) {
            physicsUniverse.tick(dt / NUM_SUB_STEPS);
        }
        drawBackground();
        drawParticles();
    };

    // fountain
    button_fountain.addEventListener('click', () => {
        fountain_activated = !fountain_activated;
        last_fountain_chain_id = -1;
    });

    button_pause.addEventListener('click', () => {
        playing = !playing;
        if (playing) {
            requestAnimationFrame(step);
            button_pause.textContent = 'Pause';
        }
        else {
            last_t = 0;
            last_fountain_t = 0;
            button_pause.textContent = 'Play';
        }
    });

    requestAnimationFrame(step);
}

main();
