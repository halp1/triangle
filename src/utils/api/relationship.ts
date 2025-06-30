import { type APIDefaults } from ".";
import type { Social } from "../../types";
import type { Get, Post } from "./basic";

export const relationship = (get: Get, post: Post, __: APIDefaults) => {
  const removeRelationship = async (id: string) => {
    const res = await post<{ success: boolean }>({
      uri: "relationships/remove",
      body: { user: id }
    });

    if (res.success === false) throw new Error("Failed to remove relationship");
    return true;
  };

  return {
    /** Block a user */
    block: async (id: string) => {
      const res = await post<{}>({
        uri: "relationships/block",
        body: { user: id }
      });

      if (res.success === false) throw new Error(res.error.msg);
      return res.success;
    },

    /** Unblock a user. Note: unblocking a user will unfriend them if they are friended. */
    unblock: removeRelationship,

    /** Friend a user */
    friend: async (id: string) => {
      const res = await post<{}>({
        uri: "relationships/friend",
        body: { user: id }
      });

      if (res.success === false) throw new Error(res.error.msg);
      return res.success;
    },

    /** Unfriend a user. Note: unfriending a user will unblock them if they are blocked. */
    unfriend: removeRelationship,

    dms: async (id: string) => {
      const res = await get<{
        dms: Social.DM[];
      }>({
        uri: `dms/${id}`
      });
      if (res.success === false) throw new Error(res.error.msg);
      return res.dms;
    }
  };
};
