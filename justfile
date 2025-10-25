# Multi-Timer Application - Just recipes

set shell := ["bash", "-c"]

build:
    pnpm build && mv dist/index.html dist/particularparrot.html

dev:
    pnpm dev

preview:
    pnpm preview

open-dist:
    open dist/particularparrot.html

build-and-preview:
    just build && pnpm preview

build-and-open:
    just build && just open-dist
