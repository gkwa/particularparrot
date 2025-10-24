# Multi-Timer Application - Just recipes

set shell := ["bash", "-c"]

# Default recipe - show help
default:
    @just --list

# Setup: Install dependencies with pnpm
setup:
    @echo "📦 Setting up project dependencies..."
    pnpm install
    @echo "✅ Setup complete!"

# Build: Build the project for production
build:
    @echo "🔨 Building project..."
    pnpm build
    @echo "✅ Build complete!"

# Test: Run type checking and build verification
test:
    @echo "🧪 Running tests (building project)..."
    just build
    @echo "✅ Tests passed!"

# Teardown: Clean up build artifacts and node_modules
teardown:
    @echo "🧹 Cleaning up..."
    rm -rf node_modules dist .turbo
    @echo "✅ Teardown complete!"
