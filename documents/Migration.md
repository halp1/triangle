# Triangle.js Migration Guide

This migration guide currently covers migrating from Triangle.js v3 to Triangle.js v4.

If you are using typescript, the best way to see what you need to update is to simply run `npx tsc --noEmit` on your project after updating the package. The typescript compiler will point out all the errors caused by breaking changes in the v4 update. You can refer to this guide for explanations on how to fix them.

## Breaking changes

### `Client.connect` is now `Client.create`

The static method `Client.connect` has been renamed to `Client.create` for consistency across the package. The usage remains the same, for example:

```ts
const client = await Client.create({
  token: "your_token_here"
});
```

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

### `client.room.public` property removed

The `public` property on the `client.room` object has been removed. To check if a room is public, read the `type` property instead, which can have a value of `"public"` or `"private"`.

### `client.api.rooms` change

The `client.api.rooms` method has been renamed to `client.api.rooms.list`. Additionally, a new method `client.api.rooms.menu` has been added to fetch the room menu data.

Note that you should generally use `client.rooms.list()` instead of directly accessing the API.

### Other changes

- `client.destroy()` now gracefully disconnects from the server naturally instead of leaving the room first and then disconnecting. It wait for the server to close the connection before resolving.
  This means that calling `await client.destroy()` in a room will now result in a `<name> disconnected` message instead of a `<name> left the room` message.

- Engine snapshots now work for bags like `7+x`.
