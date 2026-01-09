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
