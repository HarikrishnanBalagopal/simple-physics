clean:
	rm -rf target/ && rm -rf pkg/

build:
	wasm-pack build

www-install-and-start:
	cd www/ && corepack enable && pnpm install && pnpm start
