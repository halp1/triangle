import { type APIDefaults } from ".";
import type { Get, Post } from "./basic";

// @ts-expect-error post is unused
export const channel = (get: Get, post: Post, __: APIDefaults) => {
  return {
    replay: async (id: string) => {
      const res = await get<{ game: any }>({
        // TODO: type
        uri: `games/${id}`
      });
      if (res.success === false) throw new Error(res.error.msg);
      return res.game;
    }
  };
};
