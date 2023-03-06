mod utils;

use rand::rngs::ThreadRng;
use rand::Rng;
use serde::Serialize;
use serde_json;
use std::fmt::Display;
use std::ops::{Add, Sub};
use wasm_bindgen::prelude::*;
extern crate rand;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[repr(C)]
pub struct Vec2(f32, f32);

impl Vec2 {
    pub fn zero() -> Self {
        Vec2(0., 0.)
    }
    pub fn scale(self, scale: f32) -> Self {
        Vec2(self.0 * scale, self.1 * scale)
    }
    pub fn len_sq(self) -> f32 {
        self.0 * self.0 + self.1 * self.1
    }
    pub fn len(self) -> f32 {
        (self.0 * self.0 + self.1 * self.1).sqrt()
    }
    pub fn norm(self) -> Self {
        let l = self.len() + f32::EPSILON;
        Vec2(self.0 / l, self.1 / l)
    }
}

impl Display for Vec2 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}, {}]", self.0, self.1)
    }
}

impl Add for Vec2 {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self(self.0 + rhs.0, self.1 + rhs.1)
    }
}

impl Sub for Vec2 {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        Self(self.0 - rhs.0, self.1 - rhs.1)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[repr(C)]
pub struct Particle {
    pub pos: Vec2,
    pub old_pos: Vec2,
    pub radius: f32,
    pub color: f32,
}

#[wasm_bindgen]
pub struct PhysicsUniverse {
    pub gravity: f32,
    pub response_coeff: f32,
    pub circle_constraint_center_x: f32,
    pub circle_constraint_center_y: f32,
    pub circle_constraint_radius: f32,
    particles: Vec<Particle>,
    rng: ThreadRng,
}

#[wasm_bindgen]
impl PhysicsUniverse {
    pub fn new(num_particles: u32) -> PhysicsUniverse {
        let mut rng = rand::thread_rng();
        let particles = (0..num_particles)
            .map(|_| PhysicsUniverse::new_particle(&mut rng))
            .collect();
        PhysicsUniverse {
            gravity: 0.00001,
            response_coeff: 1.,
            circle_constraint_center_x: 320.,
            circle_constraint_center_y: 320.,
            circle_constraint_radius: 320.,
            particles,
            rng,
        }
    }
    fn new_particle_at_pos(
        x: f32,
        y: f32,
        old_x: f32,
        old_y: f32,
        radius: f32,
        color: f32,
    ) -> Particle {
        Particle {
            pos: Vec2(x, y),
            old_pos: Vec2(old_x, old_y),
            radius,
            color,
        }
    }
    fn new_particle(rng: &mut ThreadRng) -> Particle {
        Particle {
            pos: Vec2(rng.gen(), rng.gen()).scale(320.),
            old_pos: Vec2::zero(),
            radius: 10. + 20. * rng.gen::<f32>(),
            color: 360. * rng.gen::<f32>(),
        }
    }
    pub fn get_num(&self) -> i32 {
        44
    }
    pub fn get_particles_offset(&self) -> *const Particle {
        self.particles.as_ptr()
    }
    pub fn get_particles_mem_size(&self) -> usize {
        std::mem::size_of::<Particle>()
    }
    pub fn get_num_particles(&self) -> usize {
        self.particles.len()
    }
    pub fn add_particle(&mut self) {
        let p = PhysicsUniverse::new_particle(&mut self.rng);
        self.particles.push(p);
    }
    pub fn add_particle_at_pos(
        &mut self,
        x: f32,
        y: f32,
        old_x: f32,
        old_y: f32,
        radius: f32,
        color: f32,
    ) {
        let p =
            PhysicsUniverse::new_particle_at_pos(x, y, old_x, old_y, radius, color);
        self.particles.push(p);
    }
    pub fn delete_all_particles(&mut self) {
        self.particles.clear();
    }
    pub fn set_gravity(&mut self, g: f32) {
        self.gravity = g;
    }
    pub fn update_particles(&mut self, dt: f32) {
        self.particles = self
            .particles
            .iter()
            .map(|p| self.update_particle(*p, dt))
            .collect();
    }
    pub fn solve_collisions(&mut self) {
        let l = self.particles.len();
        for i in 0..l {
            for j in (i + 1)..l {
                let (pi, pj) = self.solve_collision(self.particles[i], self.particles[j]);
                self.particles[i] = pi;
                self.particles[j] = pj;
            }
        }
    }
    pub fn apply_constraints(&mut self) {
        self.particles = self
            .particles
            .iter()
            .map(|p| self.constrain_particle(*p))
            .collect();
    }
    pub fn tick(&mut self, dt: f32) {
        self.update_particles(dt);
        self.solve_collisions();
        self.apply_constraints();
    }
    pub fn render(&self) -> String {
        serde_json::to_string(&self.particles).unwrap()
    }
    fn update_particle(&self, p: Particle, dt: f32) -> Particle {
        let acc = Vec2(0., self.gravity);
        let old_v_dt = p.pos - p.old_pos;
        let old_pos = p.pos;
        let pos = p.pos + old_v_dt + acc.scale(dt * dt);
        // log(format!("{}", pos).as_str());
        Particle { pos, old_pos, ..p }
    }
    fn constrain_particle(&self, p: Particle) -> Particle {
        let center = Vec2(
            self.circle_constraint_center_x,
            self.circle_constraint_center_y,
        );
        let to_p = p.pos - center;
        let max_dist = self.circle_constraint_radius - p.radius;
        if to_p.len() <= max_dist {
            p
        } else {
            let pos = to_p.norm().scale(max_dist) + center;
            // let pos = Vec2(320.,320.);
            // log(format!("constrain center {} max_dist {} p.pos {} to_p {} pos {}", center, max_dist, p.pos, to_p, pos).as_str());
            Particle { pos, ..p }
        }
    }
    fn solve_collision(&self, p1: Particle, p2: Particle) -> (Particle, Particle) {
        let p1_p2 = p1.pos - p2.pos;
        let dist = p1_p2.len();
        let req_dist = p1.radius + p2.radius;
        if dist > req_dist {
            return (p1, p2);
        }
        let diff = req_dist - dist;
        let m1 = p1.radius / (p1.radius + p2.radius);
        let m2 = 1. - m1;
        let dir = p1_p2.norm();
        let new_p1_pos = p1.pos + dir.scale(m2 * self.response_coeff * diff);
        let new_p2_pos = p2.pos + dir.scale(-m1 * self.response_coeff * diff);
        let new_p1 = Particle {
            pos: new_p1_pos,
            ..p1
        };
        let new_p2 = Particle {
            pos: new_p2_pos,
            ..p2
        };
        return (new_p1, new_p2);
    }
}

// -----------------------

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1,
}

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<Cell>,
}

#[wasm_bindgen]
impl Universe {
    pub fn new() -> Universe {
        let width = 64;
        let height = 64;
        let cells = (0..width * height)
            .map(|i| {
                if i % 2 == 0 || i % 7 == 0 {
                    Cell::Alive
                } else {
                    Cell::Dead
                }
            })
            .collect();
        Universe {
            width,
            height,
            cells,
        }
    }
    pub fn width(&self) -> u32 {
        self.width
    }
    pub fn height(&self) -> u32 {
        self.height
    }
    pub fn cells(&self) -> *const Cell {
        self.cells.as_ptr()
    }
    fn get_index(&self, row: u32, column: u32) -> usize {
        (row * self.width + column) as usize
    }
    fn live_neighbour_count(&self, row: u32, column: u32) -> u8 {
        let tl = self.get_index(
            (row - 1 + self.height) % self.height,
            (column - 1 + self.width) % self.width,
        );
        let tc = self.get_index((row - 1 + self.height) % self.height, column);
        let tr = self.get_index(
            (row - 1 + self.height) % self.height,
            (column + 1) % self.width,
        );

        let ml = self.get_index(row, (column - 1 + self.width) % self.width);
        let mr = self.get_index(row, (column + 1) % self.width);

        let bl = self.get_index(
            (row + 1) % self.height,
            (column - 1 + self.width) % self.width,
        );
        let bc = self.get_index((row + 1) % self.height, column);
        let br = self.get_index((row + 1) % self.height, (column + 1) % self.width);
        self.cells[tl] as u8
            + self.cells[tc] as u8
            + self.cells[tr] as u8
            + self.cells[ml] as u8
            + self.cells[mr] as u8
            + self.cells[bl] as u8
            + self.cells[bc] as u8
            + self.cells[br] as u8
    }
    pub fn tick(&mut self) {
        let mut next = self.cells.clone();
        for row in 0..self.height {
            for column in 0..self.width {
                let idx = self.get_index(row, column);
                let count = self.live_neighbour_count(row, column);
                let curr_cell = self.cells[idx];
                let next_cell = match (curr_cell, count) {
                    (Cell::Alive, x) if x < 2 || x > 3 => Cell::Dead,
                    (Cell::Dead, x) if x == 3 => Cell::Alive,
                    (_, _) => curr_cell,
                };
                next[idx] = next_cell;
            }
        }
        self.cells = next;
    }
    pub fn render(&self) -> String {
        self.to_string()
    }
}

impl Display for Universe {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut board = String::new();
        for row in 0..self.height {
            let mut row_str = String::from("");
            for column in 0..self.width {
                let curr_cell = self.cells[self.get_index(row, column)];
                row_str.push_str(if curr_cell == Cell::Alive {
                    "◼"
                } else {
                    "◻"
                })
            }
            row_str.push_str("\n");
            board.push_str(row_str.as_str());
        }
        write!(f, "{}", board)
    }
}
