# Triangle.js Migration Guide

This migration guide currently covers migrating from Triangle.js v3 to Triangle.js v4. It is recommended that you migrate as soon as possible, because v3 has reached end-of-life and will no longer receive updates or patches for TETR.IO compatibility issues.

If you are using typescript, the best way to see what you need to update is to simply run `npx tsc --noEmit` on your project after updating the package. The typescript compiler will point out all the errors caused by breaking changes in the v4 update. You can refer to this guide for explanations on how to fix them.

## Breaking changes

### `Client.connect` is now `Client.create`

The static method `Client.connect` has been renamed to `Client.create` for consistency across the package. The usage remains the same, for example:

```ts
const client = await Client.create({
  token: "your_token_here"
});
```

### Gameplay control has been moved to `client.game.self`

All gameplay control methods and properties that were previously a part of the `Game` class have been moved to the `Self` class accessible via `client.game.self`. this includes the client's own `Engine` and player data, ige controls, and targeting setters/getters.

Instead of being able to read from `client.game.over`, `client.game.self` is automatically deleted when the client's gameplay ends (top out or game end).

### `Codec` is now `Transport`

The type `Codec` has been renamed to `Transport`, and has two possible values: `"binary"` and `"json"`.
Binary is always the recommended transport, as it is more performant.

Likewise, the `codec` property in `RibbonOptions` has been renamed to `transport`. This means to use json transport, you would do:

```ts
const client = await Client.create({
  ribbon: {
    transport: "json"
  }
  // other options...
});
```

### `Engine['queue']` is now an array

The `Queue` class (accessible via `engine.queue`) has been changed to extend the native `Array` class. This means that all array methods are now available on `engine.queue`, such as `map`, `filter`, and `forEach`. Instead of reading queue data from `queue.value`, you can now read it directly from `queue`.

To get a raw Array instead of a Queue, use `queue.raw()`.

### The `Board` now holds tile connection data by default

The previous `ConnectedBoard` class has been merged into the main `Board` class. You can now access tile connection data directly from `engine.board`. `engine.board.state` is now a 2D array of `Tile` objects, which contain both the `Mino` (as the `mino` property) and the connection data (as the `connections` property). Similarly to v3 and prior, empty tiles are represented as `null`. The `BoardSquare` type has been removed to prevent confusion.

### The `client.dm` event has been reworked

The `client.dm` event now contains the following properties:

- `relationship`: The `Relationship` repesenting the DM relationship.
- `raw`: The raw `Social.DM` data received from the server.
- `content`: The message content.
- `reply`: A function that can be used to directly reply to the received dm.

Importantly, `client.dm` **no longer fires** when the dm's sender is the client itself.

### `client.api.rooms` change

The `client.api.rooms` method has been renamed to `client.api.rooms.list`. Additionally, a new method `client.api.rooms.menu` has been added to fetch the room menu data.

Note that you should generally use `client.rooms.list()` instead of directly accessing the API.

### `EventEmitter['maxListeners']` change

The `maxListeners` property on `EventEmitter` instances is now an object with the following structure:

```ts
export class EventEmitter<T extends Record<string, any>> {
  #maxListeners = {
    default: 10,
    overrides: new Map<keyof T, number>()
  };
}
```

Instead of setting `emitter.maxListeners = 20`, you would now do `emitter.setMaxListeners(20)` or `emitter.setMaxListeners(event, 20)` to set the max listeners for a specific event.

### Rooom property changes

The `Room` class has had some property changes:

- The `autostart` property has been split into two properties:
  - `auto`: The autostart state of the room, of type `RoomTypes.Autostart`.
  - `autoStart`: The autostart config of the room, representing the time in seconds before autostart triggers.

This has been changed to match the way TETR.IO handles autostart internally.

### Other changes

- `client.destroy()` now gracefully disconnects from the server naturally instead of leaving the room first and then disconnecting. It wait for the server to close the connection before resolving.
  This means that calling `await client.destroy()` in a room will now result in a `<name> disconnected` message instead of a `<name> left the room` message.

- Engine snapshots now work for bags like `7+x`.

- The `ribbon` object of options in `ClientOptions` now has a `debug` property. When `true`, it logs any messages that don't match known event types to the console for debugging purposes. If you think Triangle.js has a event interface that has missing or incorrect properties, turn on debug mode to verify the issue and then contact `haelp` on discord with the relevant logs.
