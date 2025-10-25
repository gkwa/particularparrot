set dotenv-load

dev:
    pnpm dev

clean:
    rm -rf dist/
    rm -rf node_modules/.vite

build:
    pnpm build && mv dist/index.html dist/particularparrot.html

preview:
    pnpm preview

build-and-preview: build preview

test:
    pnpm test

build-test: build test

ci: clean build test
