use rand::rngs::ThreadRng;
use rand::Rng;
use std::collections::{HashMap, HashSet};
use std::fmt::Display;
use std::ops::{Add, Sub};
use wasm_bindgen::prelude::*;
extern crate rand;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Clone, Copy, Debug, PartialEq)]
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

#[derive(Clone, Copy, Debug, PartialEq)]
#[repr(C)]
pub struct Particle {
    pub id: u32,
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
    fixed: HashSet<u32>,
    chain_links: HashMap<u32, u32>,
    rng: ThreadRng,
}

#[wasm_bindgen]
impl PhysicsUniverse {
    pub fn new(num_particles: u32) -> PhysicsUniverse {
        let mut rng = rand::thread_rng();
        let particles = (0..num_particles)
            .map(|i| {
                let mut p = PhysicsUniverse::new_particle(&mut rng);
                p.id = i;
                p
            })
            .collect();
        PhysicsUniverse {
            gravity: 0.00001,
            response_coeff: 1.,
            circle_constraint_center_x: 320.,
            circle_constraint_center_y: 320.,
            circle_constraint_radius: 320.,
            particles,
            fixed: HashSet::new(),
            chain_links: HashMap::new(),
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
            id: 0,
            pos: Vec2(x, y),
            old_pos: Vec2(old_x, old_y),
            radius,
            color,
        }
    }
    fn new_particle(rng: &mut ThreadRng) -> Particle {
        Particle {
            id: 0,
            pos: Vec2(rng.gen(), rng.gen()).scale(320.),
            old_pos: Vec2::zero(),
            radius: 10. + 20. * rng.gen::<f32>(),
            color: 360. * rng.gen::<f32>(),
        }
    }
    pub fn get_num(&self) -> i32 {
        45
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
    pub fn add_particle(&mut self) -> u32 {
        let mut p = PhysicsUniverse::new_particle(&mut self.rng);
        p.id = self.particles.len() as u32;
        self.particles.push(p);
        p.id
    }
    pub fn add_particle_at_pos(
        &mut self,
        x: f32,
        y: f32,
        old_x: f32,
        old_y: f32,
        radius: f32,
        color: f32,
    ) -> u32 {
        let mut p = PhysicsUniverse::new_particle_at_pos(x, y, old_x, old_y, radius, color);
        p.id = self.particles.len() as u32;
        self.particles.push(p);
        p.id
    }
    pub fn delete_all_particles(&mut self) {
        self.particles.clear();
        self.fixed.clear();
        self.chain_links.clear();
    }
    pub fn fix_particle(&mut self, id: u32) {
        self.fixed.insert(id);
    }
    pub fn link_particles(&mut self, id1: u32, id2: u32) {
        self.chain_links.insert(id1, id2);
        self.chain_links.insert(id2, id1);
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
        if self.fixed.contains(&p1.id) && self.fixed.contains(&p2.id) {
            return (p1, p2);
        }
        let p1_p2 = p1.pos - p2.pos;
        let dist = p1_p2.len();
        let req_dist = p1.radius + p2.radius;
        if dist > req_dist {
            match self.chain_links.get(&p1.id) {
                None => {
                    return (p1, p2);
                }
                Some(&x) => {
                    if x != p2.id {
                        return (p1, p2);
                    }
                }
            };
        }
        let diff = req_dist - dist;
        let m1 = {
            if self.fixed.contains(&p1.id) {
                1.
            } else if self.fixed.contains(&p2.id) {
                0.
            } else {
                p1.radius / (p1.radius + p2.radius)
            }
        };
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
