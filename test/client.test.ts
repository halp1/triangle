import { Client } from "../src";

import { test, expect } from "bun:test";

test("Client connect", async () => {
  const client = await Client.create({
    token: process.env.TOKEN!
  });

  expect(client.user).toBeDefined();
});
