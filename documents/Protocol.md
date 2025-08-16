# Triangle.js Adapter Protocol Documentation

This document describes the JSON-based communication protocol used by Triangle.js adapters to interface with external engines. The protocol enables bidirectional communication between Triangle.js and external processes through a communication channel such as standard input/output or a WebSocket.

Transparency note: this document was AI-generated based on the Triangle.js adapter source code.

## Overview

The adapter protocol is implemented by the `AdapterIO` class and uses line-delimited JSON messages. Each message is a single JSON object. The protocol supports three main types of outgoing messages and two types of incoming messages.

## Message Flow

1. **Initialization**: The adapter starts an external process and waits for an `info` message
2. **Configuration**: The adapter sends a `config` message with game rules and settings
3. **Game Loop**: The adapter alternates between sending `state` updates and `play` requests, receiving `move` responses

## Outgoing Messages (Triangle.js → External Process)

These messages are sent from Triangle.js to the external engine.

### Config Message

Sent once at the beginning to configure the game rules and settings.

```json
{
  "type": "config",
  "boardWidth": 10,
  "boardHeight": 20,
  "kicks": "SRS",
  "spins": {
    "t": { "mini": 100, "full": 400 },
    "all": { "mini": 100, "full": 400 }
  },
  "comboTable": [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5],
  "b2bCharing": false,
  "b2bChargeAt": 0,
  "b2bChargeBase": 0,
  "b2bChaining": true,
  "garbageMultiplier": 1.0,
  "garbageCap": 8,
  "garbageSpecialBonus": false,
  "pcB2b": 0,
  "pcGarbage": 10,
  "queue": ["T", "S", "Z", "I", "O", "J", "L"],
  "data": null
}
```

**Fields:**
- `type`: Always `"config"`
- `boardWidth`: Width of the game board (typically 10)
- `boardHeight`: Height of the visible game board (typically 20)
- `kicks`: Kick table name (e.g., "SRS", "SRS+", etc)
- `spins`: Spin detection settings for T-spins and other piece spins
- `comboTable`: Array defining combo multipliers
- `b2bCharing`: Whether back-to-back bonus charging is enabled
- `b2bChargeAt`: Frame count when B2B charging begins
- `b2bChargeBase`: Base value for B2B charging
- `b2bChaining`: Whether back-to-back chaining is enabled
- `garbageMultiplier`: Global garbage damage multiplier
- `garbageCap`: Maximum garbage lines that can be sent at once
- `garbageSpecialBonus`: Whether special attack bonuses are enabled
- `pcB2b`: Back-to-back bonus for perfect clears
- `pcGarbage`: Garbage lines sent for perfect clears
- `queue`: Initial piece queue as array of piece symbols
- `data`: Custom data field for engine-specific configuration

### State Message

Sent to update the external process with the current game state.

```json
{
  "type": "state",
  "board": [
		...,
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
    ["T", "T", "T", null, null, null, null, null, null, null],
    [null, "T", null, null, null, null, null, null, null, null]
  ],
  "current": "I",
  "hold": "O",
  "queue": ["L", "J", "S", "Z", "T", ...],
  "garbage": [4, 2, 1],
  "combo": -1,
  "b2b": -1,
  "data": null
}
```

**Fields:**
- `type`: Always `"state"`
- `board`: 2D array representing the game board, where each cell is either `null` (empty) or a piece symbol string. Row 0 is the bottom of the board
- `current`: Symbol of the currently falling piece
- `hold`: Symbol of the held piece, or `null` if no piece is held
- `queue`: Array of upcoming piece symbols
- `garbage`: Array of incoming garbage amounts (in lines)
- `combo`: Current combo count
- `b2b`: Current back-to-back count
- `data`: Custom data field for engine-specific state information

### Pieces Message

Sent when new pieces are added to the queue.

```json
{
	"type": "pieces",
	"pieces": ["T", "S", "Z", "I", "O", "J", "L"],
	"data": null
}
```

**Fields:**
- `type`: Always `"pieces"`
- `pieces`: Array of new piece symbols
- `data`: Custom data field for engine-specific piece information

### Play Message

Sent when requesting a move from the external process.

```json
{
  "type": "play",
  "garbageMultiplier": 1.0,
  "garbageCap": 8,
  "data": null
}
```

**Fields:**
- `type`: Always `"play"`
- `garbageMultiplier`: Current garbage damage multiplier
- `garbageCap`: Current garbage cap for this turn
- `data`: Custom data field for engine-specific play parameters

## Incoming Messages (External Process → Triangle.js)

These messages are received by Triangle.js from the external engine.

### Info Message

Sent once at startup to identify the external process.

```json
{
  "type": "info",
  "name": "MyBot",
  "version": "1.0.0",
  "author": "Developer Name",
  "data": null
}
```

**Fields:**
- `type`: Always `"info"`
- `name`: Display name of the bot/engine
- `version`: Version string
- `author`: Author/developer name
- `data`: Custom data field for engine-specific information

### Move Message

Sent in response to a `play` message to specify the desired move.

```json
{
  "type": "move",
  "keys": ["moveLeft", "moveLeft", "rotateCCW", "hardDrop"],
  "data": null
}
```

**Fields:**
- `type`: Always `"move"`
- `keys`: Array of key actions to perform in sequence
- `data`: Custom data field for engine-specific move information

## Key Actions

The `keys` array in move messages can contain the following actions:

**Standard Game Keys:**
- `moveLeft` - Move piece left
- `moveRight` - Move piece right
- `softDrop` - Move piece down
- `hardDrop` - Drop piece to bottom
- `rotateCW` - Rotate piece clockwise
- `rotateCCW` - Rotate piece counterclockwise
- `rotate180` - Rotate piece 180 degrees
- `hold` - Hold current piece

**Extended Keys:**
- `dasLeft` - Delayed Auto Shift left (instant movement)
- `dasRight` - Delayed Auto Shift right (instant movement)

## Custom Data Fields

Each message type includes a `data` field that can be used to pass custom information specific to your adapter implementation. This field should be `null` if not used, or can contain any JSON-serializable data structure.

To use custom data, extend the `CustomMessageData` interface:

```typescript
interface MyCustomData extends CustomMessageData {
  info: { capabilities: string[] };
  move: { confidence: number };
  config: { difficulty: number };
  state: { evaluation: number };
  play: { timeLimit: number };
}
```

## Error Handling

- **Invalid JSON**: Malformed JSON messages will be logged but ignored.

## Implementation Example

Here's a minimal external process implementation in Python:

```python
import json
import sys

def send_message(msg):
    print(json.dumps(msg), flush=True)

def receive_message():
    line = sys.stdin.readline()
    return json.loads(line.strip())

# Send info message
send_message({
    "type": "info",
    "name": "SimpleBot",
    "version": "1.0.0",
    "author": "Example"
})

# Main loop
while True:
		msg = receive_message()
		
		if msg["type"] == "config":
				# Store configuration
				pass
		elif msg["type"] == "state":
				# Update internal state
				pass
		elif msg["type"] == "play":
				# Calculate and send move
				send_message({
						"type": "move",
						"keys": ["hardDrop"]
				})
```

## Best Practices

1. **Flush Output**: Always flush stdout after sending messages to ensure immediate delivery
2. **Performance**: Minimize processing time for `play` requests to maintain smooth gameplay

## Process Lifecycle

1. **Startup**: External process starts and sends `info` message
2. **Configuration**: Triangle.js sends `config` message with game settings
3. **Game Loop**: Triangle.js alternates between `state` and `play` messages
4. **Shutdown**: Triangle.js sends SIGINT signal and cleans up resources

The adapter ensures proper cleanup of the external process and handles termination gracefully.
