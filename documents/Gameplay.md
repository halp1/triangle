# Triangle.js Gameplay API

This is the documentation for the subsection of Triangle.js that is directly connected to gameplay. For the full documentation, see the [main README](https://triangle.haelp.dev).

This page assumes you have created a Client named `client` that is in a room.

## Game start and end events

### Game start

`client.game.start`
Runs when a game is started. Contains information about first to, win by, and the players that are playing.

### Game end

`client.game.end`

Runs when a game ends gracefully. Contains information about the winner, the players, and the scoreboard.

### Game abort

`client.game.abort`
Runs when a game is aborted through the `/abort` command.

### Game over

`client.game.over`

Runs in any game over scenario. This includes when a player disconnects, when a game is aborted, and when a game ends gracefully. If the game ends gracefully, contains information about how the game ended.

### Game round start

`client.game.round.start`

Runs when a round starts. Contains a ticker callback and a reference to the game's internal engine.
Opponent information is available through `client.game.opponents`.

### Game round end

`client.game.round.end`

Runs when a round ends. Contains the gameid of the winning player.

## Playing a game

### Starting a game

```ts
client.room.start();
```

### Waiting for a game start

You should listen for the `client.game.start` event. In the handler, this is where you should initialize your gameplay engine, keyfinder, etc.

```ts
client.on("client.game.start", (data) => {
  // initialize your engine here
  console.log(
    "playing a game against",
    data.players.map((p) => p.name).join(", ")
  );
});
```

### Waiting for a round to start

You should listen for the `client.game.round.start` event. In the handler, this is where you should pass in your tick callback. You can also process engine data here.

```ts
client.on("client.game.round.start", ([tick, engine]) => {
  console.log(
    "the game board has a width of",
    engine.board.width,
    "and a height of",
    engine.board.height
  );

  tick(tickerCallback);
});
```

### Processing a tick (frame)

> Note: if the `Game` has an active `BotWrapper` in use, the tick callback will not be called.

The tick callback is called every frame. It can be asynchronous, but you should optimize it to be as fast as possible. The tick callback takes in the engine and incoming events, and should return data about keys pressed, etc. The keys returned by the callback may have a `frame` property in the future: they will be queued to be played at the assigned frame.

```ts
const tickerCallback = async ({
  gameid,
  frame,
  events,
  engine
}: Types.Game.Tick.In): Promise<Types.Game.Tick.Out> => {
  // First, process incoming events

  let garbageAdded = false;
  for (const event of events) {
    if (event.type === "garbage") garbageAdded = true;
  }

  if (garbageAdded)
    // If your solve maintains an internal state, you should update it here
    // Tell your solver (what you use to calculate moves) that garbage has been tanked and needs to be updated
    solver.update(engine);

  // For example, playing 1 piece every second.

  let keys: Types.Game.Tick.Keypress[] = [];
  if (frame % 60 === 0) {
    // If your solver does not maintain an internal state, you can pass in the engine to the solver
    const move = solver.getMove();
    // Any move must have a set of keys
    const solvedKeys = solver.findKeys(move);
    let runningSubframe = 0;
    solvedKeys.forEach((key) => {
      keys.push({
        frame,
        type: "keydown",
        data: {
          key,
          subframe: runningSubframe
        }
      });
      if (key === "softDrop") {
        runningSubframe += 0.1;
      }
      keys.push({
        frame: frame,
        type: "keyup",
        data: {
          key,
          subframe: runningSubframe
        }
      });
    });
  }

  return { keys };
};
```

### Running a callback after the frame is processed

If you need to run something right after a frame is processed internally, you can return a runAfter property from the tick callback. This will run after the frame is processed, but before the tick is called. This is useful for things like logging.

```ts
const tickerCallback = async ({
  gameid,
  frame,
  events,
  engine
}: Types.Game.Tick.In): Promise<Types.Game.Tick.Out> => {
  // your code here

  return { keys, runAfter: [() => console.log("Frame processed")] };
};
```
