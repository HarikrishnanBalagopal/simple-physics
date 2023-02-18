mod utils;

use std::fmt::Display;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(format!("Hello {}, from wasm-game-of-life!", name).as_str());
}

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
        let cells = (0..width * height).map(|i| {
            if i % 2 == 0 || i % 7 == 0 {
                Cell::Alive
            } else {
                Cell::Dead
            }
        }).collect();
        Universe { width, height, cells }
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
        let mut board = String::from("");
        for row in 0..self.height {
            let mut row_str = String::from("");
            for column in 0..self.width {
                let curr_cell = self.cells[self.get_index(row, column)];
                row_str.push_str(if curr_cell == Cell::Alive { "◼" } else { "◻" })
            }
            row_str.push_str("\n");
            board.push_str(row_str.as_str());
        }
        write!(f, "{}", board)
    }
}
