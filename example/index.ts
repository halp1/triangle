import { Client } from "@haelp/teto";

(async () => {
  const client = await Client.connect({
    username: "test",
    password: "password" // not a real password, use bot credentials instead
  });

  console.log("connected to", client.user.username);

  const room = await client.rooms.create();

  console.log(`<${room.id}> ${room.name}`);

	await client.destroy();
})();
