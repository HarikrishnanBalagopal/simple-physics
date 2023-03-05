# Simply Physics Engine

Written in Rust and targetting WebAssembly, published as an NPM package.
Meant for use in web apps for rendering physics simulations.

## Steps to build and run sample app

### Prerequisites

- Rust and Cargo https://www.rust-lang.org/tools/install
- wasm-pack https://rustwasm.github.io/wasm-pack/installer/
- NodeJS (For runing sample app. Use NVM https://github.com/nvm-sh/nvm to install Node 16)

### Steps

1. Build the NPM package using `wasm-pack`
    ```
    $ make build
    ```
1. Run the sample web app that uses the NPM package
    ```
    $ make www-install-and-start
    ```
1. Go to http://localhost:8080/ in a browser

## References

- tutorials: https://rustwasm.github.io/docs/wasm-pack/tutorials/index.html
