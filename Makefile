clean:
	rm -rf target/ && rm -rf pkg/

build:
# https://rustwasm.github.io/docs/wasm-pack/tutorials/npm-browser-packages/packaging-and-publishing.html
	wasm-pack build --release --scope haribala

www-install-and-start:
	cd www/ && corepack enable && pnpm install && pnpm start

publish:
# https://rustwasm.github.io/docs/wasm-pack/tutorials/npm-browser-packages/packaging-and-publishing.html
	wasm-pack publish --access=public
