# Triangle.js Adapters Documentation

This document describes the adapter system in Triangle.js, which provides a standardized interface for integrating external engines and bots with the Triangle.js game engine. Adapters abstract away the communication layer, allowing developers to focus on game logic rather than protocol implementation.

Transparency note: this document was AI-generated based on the Triangle.js adapter source code.

## Overview

The adapter system consists of:

- **Abstract Base Class**: `Adapter<T>` provides the core interface and helper methods
- **Built-in Implementations**: Ready-to-use adapters like `AdapterIO`
- **Custom Message Data**: Type-safe extension mechanism for adapter-specific data
- **Protocol Standardization**: Consistent JSON-based communication (see [Protocol.md](./Protocol.md))

## Base Adapter Class

The `Adapter<T>` abstract class defines the core interface that all adapters must implement:

```typescript
import { adapters } from "@haelp/teto/utils";

abstract class Adapter<T extends adapters.Types.CustomMessageData> {
  // Must be implemented by subclasses
  abstract initialize(): Promise<adapters.Types.Incoming.Info<T>>;
  abstract config(engine: Engine, data?: T["config"]): void;
  abstract update(engine: Engine, data?: T["state"]): void;
  abstract play(
    engine: Engine,
    data?: T["play"]
  ): Promise<adapters.Types.Incoming.Move<T>>;
  abstract stop(): void;

  // Helper methods provided by base class
  protected configFromEngine(
    engine: Engine
  ): Omit<adapters.Types.Outgoing.Config<T>, "type" | "data">;
  protected stateFromEngine(
    engine: Engine
  ): Omit<adapters.Types.Outgoing.State<T>, "type" | "data">;
  protected playFromEngine(
    engine: Engine
  ): Omit<adapters.Types.Outgoing.Play<T>, "type" | "data">;
}
```

### Helper Methods

The base class provides three helper methods that extract relevant data from the Triangle.js `Engine`:

**`configFromEngine(engine)`** - Extracts game configuration:

- Board dimensions (`boardWidth`, `boardHeight`)
- Game rules (`kicks`, `spins`, `comboTable`)
- Back-to-back settings (`b2bCharing`, `b2bChargeAt`, etc.)
- Garbage mechanics (`garbageMultiplier`, `garbageCap`, etc.)
- Perfect clear bonuses (`pcB2b`, `pcGarbage`)
- Initial piece queue

**`stateFromEngine(engine)`** - Extracts current game state:

- Board state as 2D array
- Current piece, held piece, and upcoming queue
- Incoming garbage queue
- Combo and back-to-back counters

**`playFromEngine(engine)`** - Extracts play-specific data:

- Current garbage multiplier and cap

## Built-in Adapters

### AdapterIO

The `AdapterIO` class communicates with external processes via standard input/output using JSON messages. It's available through the `adapters.IO` export.

```typescript
import { adapters } from "@haelp/teto/utils";

const adapter = new adapters.IO({
  path: "./my-bot", // Required: path to executable
  name: "MyBot", // Optional: display name (default: "AdapterIO")
  verbose: true, // Optional: enable debug logging (default: false)
  env: { RUST_BACKTRACE: "1" }, // Optional: environment variables
  args: ["--mode", "fast"] // Optional: command line arguments
});

// Initialize and use
const info = await adapter.initialize();
console.log(`Connected to ${info.name} v${info.version} by ${info.author}`);

// Configure the external process
adapter.config(engine);

// Send state updates
adapter.update(engine);

// Request moves (used during `tick`)
const move = await adapter.play(engine);
console.log("Received keys:", move.keys);

// Clean shutdown
adapter.stop();
```

#### Configuration Options

```typescript
interface AdapterIOConfig {
  name: string; // Adapter name for logging
  verbose: boolean; // Enable detailed logging
  path: string; // Path to executable (required)
  env: NodeJS.ProcessEnv; // Environment variables
  args: string[]; // Command line arguments
}
```

#### Logging

When `verbose: true`, AdapterIO logs:

- All outgoing JSON messages
- All incoming JSON messages
- Non-JSON output from the external process
- Error messages from stderr

## Custom Message Data

Extend the `CustomMessageData` interface to add adapter-specific data to messages:

```typescript
interface MyBotData extends adapters.Types.CustomMessageData {
  info: {
    capabilities: string[];
    supportedModes: string[];
  };
  move: {
    confidence: number;
    evaluationTime: number;
    nodesSearched: number;
  };
  config: {
    difficulty: "easy" | "medium" | "hard";
    searchDepth: number;
  };
  state: {
    boardEvaluation: number;
    threatLevel: number;
  };
  play: {
    timeLimit: number;
    allowHold: boolean;
  };
}

// Use with adapter
const adapter = new adapters.IO<MyBotData>({
  path: "./my-advanced-bot"
});

// Send config with custom data
adapter.config(engine, {
  difficulty: "hard",
  searchDepth: 7
});

// Send state with custom data
adapter.update(engine, {
  boardEvaluation: 0.75,
  threatLevel: 2
});

// Request move with custom data
const move = await adapter.play(engine, {
  timeLimit: 1000,
  allowHold: true
});

// Access custom move data
console.log(`Move confidence: ${move.data.confidence}%`);
console.log(`Nodes searched: ${move.data.nodesSearched}`);
```
