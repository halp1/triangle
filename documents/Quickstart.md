# Triangle.JS Quickstart Guide

This document outlines the fastest way to connect your bot to TETR.IO via Triangle.js. It provides a step-by-step explanation of the example code. If you want to avoid using Typescript as much as possible, this document is for you. If you are more experienced with Typescript and want fine-grained control over your client, you may want to refer to the [full documentation](https://triangle.haelp.dev).

## Step 0: Create an engine and compile it

Before beginning, you need an engine that can play TETR.IO and interact with the [Triangle.JS Adapter Protocol](https://triangle.haelp.dev/documents/Protocol.html). You can find an extremely minimal example [here](https://github.com/halp1/triangle/tree/main/example/solver).

## Step 1: Setup

### Using Bun

The fastest way to get started with Triangle.js is with the Bun runtime.

Windows:

```powershell
powershell -c "irm bun.sh/install.ps1|iex"
```

Linux/Macos:

```bash
curl -fsSL https://bun.com/install | bash
```

> Note: you might need to install `unzip` on Linux.

### Creating a project

In an empty directory for the project, run:

```bash
bun init -y
bun install @haelp/teto
```

Finally, add your bot credentials to a new `.env` file:

```
USERNAME=your-bot-username
PASSWORD=your-bot-password
```

## Step 2: Creating the client

In the `index.ts` file, start by importing the required modules:

```ts
import { Client } from "@haelp/teto";
import { BotWrapper, adapters } from "@haelp/teto/utils";
```

Then, create a `Client`:

```ts
const client = await Client.create({
  username: process.env.USERNAME!,
  password: process.env.PASSWORD!
});
```

## Step 3: Joining a room

Next, allow the bot to join the first room it is invited to:

```ts
const { roomid } = await client.wait("social.invite");

await client.rooms.join(roomid);
await client.room?.switch("player");
```

## Step 4: Playing the game

First, you need to listen for when a round begins:

```ts
client.on("client.game.round.start", async ([tick, engine]) => {});
```

Inside the callback, create a new Adapter. This creates a bridge between your typescript logic and a binary program.

```ts
const adapter = new adapters.IO({
  path: path.join(__dirname, "./your-binary")
});
```

Then, create a `BotWrapper`. This wraps around the adapter and controls the gameplay logic:

```ts
const wrapper = new BotWrapper(adapter, { pps: 1 });
const initPromise = wrapper.init(engine);
```

The BotWrapper then needs to be used in the game loop:

```ts
tick(async ({ engine, events }) => {
  await initPromise; // ensure the BotWrapper is ready before using it
  return {
    keys: await wrapper.tick(engine, events)
  };
});
```

Finally, when the round ends, we need to clean up the engine process:

```ts
await client.wait("client.game.over");
wrapper.stop();
```

Your bot is complete! Here's what the final code should look like:

```ts
import { Client } from "@haelp/teto";
import { BotWrapper, adapters } from "@haelp/teto/utils";
import path from "path";

const client = await Client.create({
  username: process.env.USERNAME!,
  password: process.env.PASSWORD!
});

// Or:
// const client = await Client.create({
//   token: process.env.TOKEN!
// });

const { roomid } = await client.wait("social.invite");
await client.rooms.join(roomid);
await client.room?.switch("player").catch(() => {});

client.on("client.game.round.start", async ([tick, engine]) => {
  const adapter = new adapters.IO({
    path: path.join(__dirname, "./solver/target/release/triangle-rust-demo")
  });
  const wrapper = new BotWrapper(adapter, {
    pps: 1
  });
  const initPromise = wrapper.init(engine);

  tick(async ({ engine, events }) => {
    await initPromise;
    return {
      keys: await wrapper.tick(engine, events)
    };
  });

  await client.wait("client.game.over");
  wrapper.stop();
});
```

## Next steps

Now that your bot is complete, you can explore additional features and improvements:

- Read the other core documents to understand how Triangle.JS works
- Adding chat commands to control the bot, using the `room.chat` event
- Allow the bot to join multiple rooms by spawning a new `Client` on each invite
