# Multi-Timer Application

A TypeScript-based multi-timer application built with Vite, following SOLID principles and clean architecture.

## Project Structure

```
├── src/
│   ├── main.ts                 # Entry point
│   ├── Application.ts          # Main orchestrator (DIP)
│   ├── types/
│   │   └── index.ts           # Interfaces and type definitions (ISP)
│   ├── services/
│   │   ├── TimerService.ts    # Timer business logic (SRP)
│   │   └── AudioService.ts    # Audio playback (SRP)
│   ├── ui/
│   │   ├── UIRenderer.ts      # UI rendering (SRP)
│   │   └── FormHandler.ts     # Form input handling (SRP)
│   ├── utils/
│   │   ├── TimeFormatter.ts   # Time formatting utility (SRP)
│   │   └── HtmlSanitizer.ts   # HTML escaping utility (SRP)
│   └── styles/
│       └── main.css           # Stylesheet
├── index.html                  # HTML entry point
├── package.json               # Dependencies
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── tsconfig.node.json        # TypeScript Node configuration
```

## SOLID Principles Implementation

### 1. Single Responsibility Principle (SRP)

Each class has a single, well-defined responsibility:

- **AudioService**: Only handles audio playback
- **TimerService**: Only manages timer state and business logic
- **UIRenderer**: Only renders the UI
- **FormHandler**: Only handles form inputs
- **TimeFormatter**: Only formats time values
- **HtmlSanitizer**: Only escapes HTML

### 2. Open/Closed Principle (OCP)

The application is open for extension but closed for modification:

- Services can be extended through new methods
- New observers can be added without modifying existing code
- UI components can be replaced without changing the core logic

### 3. Liskov Substitution Principle (LSP)

Interfaces define proper contracts:

- `ICountdownTimerState` and `ICountupTimerState` properly extend `ITimerState`
- All timer types can be used interchangeably where `TimerState` is expected

### 4. Interface Segregation Principle (ISP)

Clients depend only on interfaces they use:

- `IAudioService`: Only audio-related methods
- `ITimerService`: Only timer-related methods
- `IUIRenderer`: Only rendering-related methods
- `ITimerObserver`: Only observer-related methods
- `ITimerState`: Specific state interfaces for countdown/countup

### 5. Dependency Inversion Principle (DIP)

High-level modules depend on abstractions, not concrete implementations:

- `TimerService` depends on `IAudioService`, not `AudioService`
- `UIRenderer` depends on `ITimerService`, not concrete `TimerService`
- `Application` creates dependencies through dependency injection

## Setup and Running

### Prerequisites

- Node.js (16+)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:3000`

### Build

```bash
npm run build
```

Outputs production build to the `dist/` directory

### Preview

```bash
npm run preview
```

Preview the production build locally

## Architecture Overview

### Data Flow

1. **User Input** → `FormHandler` (UI layer)
2. **Command Execution** → `TimerService` (business logic)
3. **State Update** → `TimerService` (state management)
4. **Observer Notification** → `UIRenderer` (view layer)
5. **DOM Update** → Browser renders the UI

### Key Design Patterns

#### Observer Pattern

The Observer pattern is used for reactive updates:

- `ITimerObserver` interface defines the contract
- `UIRenderer` implements `ITimerObserver`
- `TimerService` maintains a set of observers
- When timers change, all observers are notified

#### Dependency Injection

Dependencies are injected at construction time:

```typescript
const audioService = new AudioService()
const timerService = new TimerService(audioService)
const uiRenderer = new UIRenderer(timerService)
```

#### Factory Pattern

The `Application` class acts as a factory, creating and wiring up all dependencies.

## Features

- ⏱️ **Countdown Timers**: Set a duration and count down to zero
- ⏲️ **Countup Timers**: Start from zero and count upwards indefinitely
- 🏷️ **Custom Labels**: Label each timer for easy identification
- ⏸️ **Start/Pause**: Control timer execution
- 🔄 **Reset**: Reset countup timers to zero
- 🔊 **Audio Alert**: Beep notification when countdown completes
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- ⚡ **Real-time Updates**: Instant UI updates as timers change

## Type Safety

The project uses strict TypeScript with:

- `strict: true` for strict null checks and type checking
- `noImplicitAny: true` to require explicit types
- `noUnusedLocals: true` to catch unused variables
- `noUnusedParameters: true` to catch unused parameters
- `noImplicitReturns: true` to ensure all code paths return

## Code Quality

- **No external dependencies** (except Vite and TypeScript for development)
- **100% TypeScript** for type safety
- **Modular architecture** for maintainability
- **Dependency injection** for testability
- **Observer pattern** for loose coupling
- **SOLID principles** throughout

## Future Enhancements

- Unit tests with Jest
- E2E tests with Cypress
- Timer persistence to localStorage
- Multiple audio alert options
- Timer categories/groups
- Keyboard shortcuts
- Theme switching (dark/light mode)
- Export/import timer configurations
