<div align="center">
  <h1>Triangle.js</h1>
  <h2>A Typescript library and client for interacting with the TETR.IO main game API and the ch.tetr.io channel API.</h2>
  <h3>Used by the largest projects in the TETR.IO community:</h3>
</div>
<div align="center">
  <a href="https://ch.tetr.io/u/mochbot">
  <img src="https://tetr.io/user-content/avatars/65c4d8d9ce9cb4d6c9d73c13.jpg?rv=1707399902733" alt="MochBot" title="MochBot" width=100/></a>
  <a href="https://ch.tetr.io/u/zzztoj"><img src="https://misc.haelp.dev/static/zzztoj.svg" alt="ZZZTOJ" title="ZZZTOJ" width=100/></a>
  <a href="https://discord.gg/ATHwyMdSDf">
  <img src="https://cdn.discordapp.com/avatars/1192933531131838544/f45332afa1db00109829b5806d6f2ca4.webp?size=1024&format=webp&width=896&height=896" alt="MinoMuncher" title="MinoMuncher" width=100/></a>
</div>
<div align="center">
  <img alt="NPM Downloads" src="https://img.shields.io/npm/d18m/%40haelp%2Fteto">
<img alt="NPM Version" src="https://img.shields.io/npm/v/%40haelp%2Fteto">
</div>

## Disclaimer

> This library is not officially supported nor endorsed by TETR.IO. Use of the main game API is only permitted with an official bot account. You assume all responsibility for any actions that result in staff action (warnings/bans, etc). The main game API is not documented, and this library may break at any time.
> This restriction includes the use of the `Client` class and the `API` class.

> The Tetra Channel section of this library (imported through `@haelp/teto/ch`) and the Engine (imported through `@haelp/teto/engine`) are open to use by anyone.

---

Triangle.js was last known to work with TETR.IO Beta version **1.7.3.**

## [>> Quickstart <<](https://triangle.haelp.dev/documents/Quickstart.html)

## Installation

```bash
npm i @haelp/teto
```

or

```bash
git clone https://github.com/halp1/triangle triangle
```

> Note:
> Only looking to use the `ch.tetr.io` api? Check out the documentation [here](https://triangle.haelp.dev/documents/Channel.html).

## Setup (git installation only)

It is _highly_ recommended that you use a Typescript project for this library if you choose to clone from source. If you are not using Typescript, you will need to use a tool like `tsc` to compile the source code. This is because the TETR.IO api is complex and being able to use type checking will greatly reduce the chance of errors. Incorrectly formatted messages sent to the server may cause an account ban.

It is also recommended (but not required) that you add a typescript path mapping to the `src` directory in your `tsconfig.json` file. This will allow you to import the library like so:

```ts
import { Client } from "@triangle";
```

To do this, add the following to the "compilerOptions" object in your `tsconfig.json` file:

```json
"paths": {
  "@triangle": ["./path/to/triangle/src"]
}
```

## Setup (Bun only)

Run the following:

```bash
bun i buffer
```

Add the following to the top of your root file:

```ts
import { Buffer } from "buffer/";

globalThis.Buffer = Buffer;
```

## Usage

The following usage examples assume you are using Typescript. They also assume you can use top level await. If you cannot, you will need to wrap the code in an async function.

### Import

> Warning:
> Use the latest LTS version when using Node.js with Triangle.js. Triangle.js was last known to work with Node.js 22.x.

> Warning:
> Triangle.js uses Node.js/Bun's built-in WebSocket client. If you have to use Node.js < `v22.4.0`, use the `ws` package as a pollyfill:
> `globalThis.WebSocket = require("ws").WebSocket;`

> Tip:
> When using Node.js, add the `--enable-source-maps` flag to your node command to get better stack traces.

Node.js:

```ts
import { Client } from "@haelp/teto";
```

### Creating a client

```ts
const client = await Client.connect({
  username: "your-username",
  password: "your-password"
});
// or {token: "your-token"}
```

### Creating a room

```ts
const room = await client.rooms.create("private");
console.log("Joined room", room.id);
```

### Joining a public room

```ts
const rooms = await client.rooms.list();
const room = await client.rooms.join(rooms[0].id);
console.log("Joined room", room.id);
```

### Starting a game

The following example presses the hard drop key every 1/2 second

```ts
room.start();
const [tick, engine] = await client.wait("client.game.round.start");
tick(async (data) => {
  if (data.frame % 30 === 29) {
    return {
      keys: [
        {
          frame: data.frame,
          type: "keydown",
          data: {
            key: "hardDrop",
            subframe: 0
          }
        },
        {
          frame: data.frame,
          type: "keyup",
          data: {
            key: "hardDrop",
            subframe: 0
          }
        }
      ]
    };
  }
  return {};
});

await client.wait("game.end");
console.log("game over");
```

View more gameplay documentation [here](https://triangle.haelp.dev/documents/Gameplay.html) and [here](https://triangle.haelp.dev/documents/Engine.html).

### Chatting

```ts
room.chat("Hello, world!");
// send a pinned message (when host)
room.chat("Hello, world!", true);
```

### Listening for chat messages

```ts
client.on("room.chat", (data) => {
  console.log(data.user, "says", data.content);
});
```

## Events

The Triangle.js client follows an async/await based method, while TETR.IO generally has an event/callback based system. To help facilitate the connection between these two systems, the client provides several helper methods.

All of these methods are typed, so your ide will likely assist with autocomplete. All events are in src/types/events

`client.emit` - Takes in an event (sent as "command" to TETR.IO) and optionally a data parameter (sent as "data")

```ts
client.emit(<event>, <data>);
```

`client.wait` - Waits for an event to occur and returns a promise of the data in the event.

```ts
const data = await client.wait(<event>);
```

`client.wrap` - Sends an event and waits for a return event. Throws an error if the server responds with an "err" message while waiting.

```ts
const data = await client.wrap(<send event>, <data>, <receive event>);
```

For events that you might want to handle multiple times, you can use `client.on`, `client.off`, and `client.once` (node EventEmitter methods).

### Client Events

Client events are not sent by TETR.IO. They are events sent by the Triangle.js client itself to help make creating a bot easier.

For example, the `client.room.players` event fires every time a player moves their bracket, joins, or leaves. Rather than listening to several events and managing a players list yourself (with `room.player.add`, `room.player.remove`, `room.update`, `room.update.bracket`, etc), you can use the single `client.room.players`. See [src/types/events/in/client](https://triangle.haelp.dev/interfaces/src.Types.Events.in.Client.html) for more events you can use.

## Troubleshooting

Please see the [troubleshooting guide](https://triangle.haelp.dev/documents/Troubleshooting.html).

## Other notes

The code should only be used on an authorized bot account (or you risk being banned).
It is recommended to set a custom `userAgent` in the client options to identify your bot to the server.

Be careful with what variables you save and where. Due to the event-based nature of TETR.IO and this library, it is easy to accidentally create a memory leak.
For example, the "tick" function exposed on the "client.game.start" event is used for this reason.

## Building

Install bun if you haven't already:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then run:

```bash
bun run build
```

## Contributing

File an issue and make a pull request on GitHub.

### Tests

The `Engine` test suite requires a large number of replays that are not included in the repository. To download the test prerequisites, make sure you have Git LFS, `pv`, and `pigz` installed, then run:

```bash
bun download-test-data
```

If you add test replays for the engine, you can bundle them into a compressed archive with:

```bash
bun bundle-test-data
```

## Credits

- Made by [halp](https://github.com/halp1) [(website under construction)](https://haelp.dev)

- Thanks to [luke](https://github.com/encryptluke) and [redstone576](https://github.com/redstone576) for testing this library.

Enjoying Triangle.js? Leave a star!

Interested in contributing to the project? Contact `haelp` on Discord (Please come with some experience with TETR.IO API and an understanding of this library).
