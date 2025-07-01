# Triangle.js Engine Documentation

This is the documentation for the subsection of Triangle.js that simulates the TETR.IO core game engine. For the full documentation, see the [main README](https://triangle.haelp.dev).

## Engine

### State and config

An `Engine` is the wrapper class that handles an individual player's game. It takes in an [`EngineInitializeParams`](https://triangle.haelp.dev/interfaces/src.Engine.EngineInitializeParams.html), which are saved to the `Engine`'s `initializer` property.

An `Engine`'s state is made up of several different components, such as the falling piece state, garbage queue, and more. To save an `Engine`'s state, use the `engine.snapshot()` method. Then, you can restore the state using `engine.fromSnapshot(<snapshot>)` method.

The following is an example of how you would create a clone of an engine:

```ts
// assume `engine` has already been delared as an `Engine`

const newEngine = new Engine(engine.initializer);
newEngine.fromSnapshot(engine.snapshot());
```

### Events

An `Engine` has the `events` property, which functions very similarly to the Node `EventEmitter` class. You can view the list of events [here](https://triangle.haelp.dev/interfaces/src.Engine.Events.html).

### State manipulation

There are two main ways to manipulate state: using using the `engine.press(<key>)` function or by passing frames into the `engine.tick(<frames>)` function.

**`engine.press(<key>)`** performs the key press passed into the function. For example, running `engine.press("moveRight")` moves the falling piece 1 square right. There are also two non-standard keys (not valid for passing into `engine.tick`): `dasLeft` and `dasRight`.
The function returns a [`LockRes`](https://triangle.haelp.dev/interfaces/src.Engine.LockRes.html) if the move is `hardDrop`. Otherwise, it returns `true` if the move altered the falling piece position or rotation, and `false` if it did not.

**engine.tick(<frames>)** ticks 1 game frame and runs the frames passed in. The frames must be valid TETR.IO gameplay events. The full list of valid frames can be found [here](https://triangle.haelp.dev/modules/src.Types.Game.Replay.Frames.html), although the only relevant frames are of `type` `ige`, `keydown`, or `keyup`.

When using `engine.press` on the engine controlled by the [`Game`](https://triangle.haelp.dev/classes/src.Classes.Game.html) class, you must either save a snapshot before manipulating the state (recommended) or clone the engine before manipulating the state. Otherwise, the `Game`'s state will desync from the server's state.

## Queue

The `Engine`'s queue is available through the `engine.queue` property. It is an instance of the [`Queue`](https://triangle.haelp.dev/classes/src.Engine.Queue.html) class, which is a wrapper around the TETR.IO queue system. You may freely set `engine.queue.minLength`, which is the minimum number of pieces that must be in the queue. The queue will automatically refill to this length when it is below it.

## GarbageQueue

The `Engine`'s garbage queue is available through the `engine.garbageQueue` property. It is an instance of the [`GarbageQueue`](https://triangle.haelp.dev/classes/src.Engine.GarbageQueue.html) class, which is a wrapper around the TETR.IO garbage queue system.
The full size of the garbage queue can be accessed through `engine.garbageQueue.size`. You can also access the current garbage queue through `engine.garbageQueue.queue`, which is an array of [`IncomingGarbage`](https://triangle.haelp.dev/interfaces/src.Engine.IncomingGarbage.html) objects.
An `IncomingGarbage` will become tankable when the following is true:

```ts
item.frame + this.options.garbage.speed <= frame
```

Where `item` is the `IncomingGarbage` object, `this` is the `GarbageQueue` instance, and `frame` is the current game frame.

## Board

The `Engine`'s board is available through the `engine.board` property. It is an instance of the [`Board`](https://triangle.haelp.dev/classes/src.Engine.Board.html) class. The board has a 4 key properties:
- `board.width`: The width of the board.
- `board.height`: The height of the board.
- `board.fullHeight`: The full height of the board, which is the height of the board plus the board buffer.
- `board.state`: The 2D array (array of rows) of the board state, where each element is a [`BoardSquare`](https://triangle.haelp.dev/types/src.Engine.BoardSquare.html). The 0th row is at the bottom of the board, and the last row is at the top of the board.

## Falling Piece

The `Engine`'s falling piece is available through the `engine.falling` property. It is an instance of the [`Tetromino`](https://triangle.haelp.dev/classes/src.Engine.Tetromino.html) class. A `Tetromino` instance has a few important properties:

- `tetromino.symbol`: One of `Mino.I`, `Mino.J`, `Mino.L`, `Mino.O`, `Mino.S`, `Mino.T`, or `Mino.Z`.
- `tetromino.x`: The x position of the tetromino on the board. This is the same as `tetromino.location[0]`.
- `tetromino.y`: The y position of the tetromino on the board, rounded down to the nearest integer. This is NOT the same as `tetromino.location[1]`, which is a float.
- `tetromino.rotation`: The `Rotation` of the tetromino, which one of `0`, `1`, `2`, or `3`. Setting `Rotation` will normalize the rotation to the range of `0` to `3`, but will not perform kicks or boundary checks.
- `tetromino.location`: The location of the tetromino on the board, which is an array of `[x, y]` where `x` is the x position and `y` is the y position. `[0, 0]` is the bottom left corner of the board.
- 