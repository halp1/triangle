import { Events, type Social as SocialTypes } from "../../types";
import { APITypes } from "../../utils";
import type { Client } from "../client";
import { Relationship } from "./relationship";

import _ from "lodash";

interface SocialInitData {
  online: number;
  notifications: SocialTypes.Notification[];
  friends: ReturnType<typeof processRelationship>[];
  other: ReturnType<typeof processRelationship>[];
  blocked: SocialTypes.Blocked[];
}

const processRelationship = (r: SocialTypes.Relationship, selfID: string) => ({
  ...r,
  user: {
    id: r.from._id === selfID ? r.to._id : r.from._id,
    username: r.from._id === selfID ? r.to.username : r.from.username,
    avatar:
      r.from._id === selfID ? r.to.avatar_revision : r.from.avatar_revision
  }
});

export class Social {
  private client: Client;

  /** The current number of people online */
  public online: number;
  /** List of the client's friends */
  public friends: Relationship[];
  /** List of "pending" relationships (shows in `other` tab on TETR.IO) */
  public other: Relationship[];
  /** people you block */
  public blocked: SocialTypes.Blocked[];
  /** Notifications */
  public notifications: SocialTypes.Notification[];
  /** Social config */
  public config: SocialTypes.Config;

  public static defaultConfig: SocialTypes.Config = {
    suppressDMErrors: false,
    autoLoadDMs: true
  };

  /** @hideconstructor */
  private constructor(
    client: Client,
    config: Partial<SocialTypes.Config>,
    init: SocialInitData
  ) {
    this.client = client;
    this.config = _.merge(Social.defaultConfig, config);

    this.init();
    this.online = init.online;
    this.friends = init.friends.map(
      (r) =>
        new Relationship(
          {
            id: r.user.id,
            relationshipID: r._id,
            username: r.user.username,
            avatar: r.user.avatar
          },
          this,
          this.client
        )
    );
    this.other = init.other.map(
      (r) =>
        new Relationship(
          {
            id: r.user.id,
            relationshipID: r._id,
            username: r.user.username,
            avatar: r.user.avatar
          },
          this,

          this.client
        )
    );
    this.blocked = init.blocked;
    this.notifications = init.notifications;
  }

  static async create(
    client: Client,
    config: Partial<SocialTypes.Config>,
    initData: Events.in.Client["client.ready"]["social"]
  ) {
    const rel = initData.relationships.map((r) =>
      processRelationship(r, client.user.id)
    );
    const data: SocialInitData = {
      online: initData.total_online,
      notifications: initData.notifications,
      friends: rel.filter((r) => r.type === "friend"),
      other: rel.filter((r) => r.type === "pending"),

      blocked: rel
        .filter((r) => r.type === "block")
        .map((r) => ({
          id: r.user.id,
          username: r.user.username,
          avatar: r.user.avatar
        }))
    };

    return new Social(client, config, data);
  }

  private get api() {
    return this.client.api;
  }

  private init() {
    setTimeout(
      () =>
        this.notifications.forEach((n) => {
          if (n.type === "friend") {
            if (!n.seen) {
              const rel = processRelationship(
                n.data.relationship,
                this.client.user.id
              );
              this.client.emit("client.friended", {
                id: rel.user.id,
                name: rel.user.username,
                avatar: rel.user.avatar
              });
            }
          }
        }),
      0
    );

    this.client.on("social.online", (count) => {
      this.online = count;
    });

    this.client.on("social.notification", async (n) => {
      this.notifications.splice(0, 0, n);

      if (n.type === "friend") {
        const rel = processRelationship(
          n.data.relationship,
          this.client.user.id
        );
        this.client.emit("client.friended", {
          id: rel.user.id,
          name: rel.user.username,
          avatar: rel.user.avatar
        });

        const user = this.get({ id: rel.user.id });

        if (!user) {
          this.other.push(
            new Relationship(
              {
                id: rel.user.id,
                username: rel.user.username,
                avatar: rel.user.avatar,
                relationshipID: ""
              },
              this,
              this.client
            )
          );
        }
      }
    });

    this.client.on("social.dm", async (dm) => {
      let user = this.get({ id: dm.data.user });
      if (user) {
        if (!user.dmsLoaded && this.config.autoLoadDMs) await user.loadDms();
        else user.dms.push(dm);
      } else {
        const u = await this.who(dm.data.user);
        this.other.push(
          new Relationship(
            {
              id: u._id,
              username: u.username,
              avatar: u.avatar_revision,
              relationshipID: ""
            },
            this,
            this.client
          )
        );

        user = this.get({ id: dm.data.user })!;
        if (this.config.autoLoadDMs) await user.loadDms();
      }

      this.client.emit("client.dm", {
        user,
        content: dm.data.content,
        reply: (content: string) => this.dm(dm.data.user, content)
      });
    });
  }

  /**
   * Marks all notifications as read
   * @example
   * client.social.markNotificationsAsRead();
   */
  markNotificationsAsRead() {
    this.client.emit("social.notification.ack");
  }

  /**
   * Get a user + social data from the list of users and pending friends (OTHER tab in TETR.IO)
   * @example
   * const user = await client.social.get('halp')
   * @example
   * const user = await client.social.get('646f633d276f42a80ba44304');
   * @example
   * const user = await client.social.get({ username: 'halp' });
   * @example
   * const user = await client.social.get({ id: '646f633d276f42a80ba44304 });
   * @example
   * // You can then use the object to read user data and interact with the user
   * await user.dm('wanna play?');
   * await user.invite();
   */
  get(target: string): Relationship | null;
  get(target: { id: string }): Relationship | null;
  get(target: { username: string }): Relationship | null;
  get(
    target: string | { id: string } | { username: string }
  ): Relationship | null {
    if (typeof target === "string")
      return (
        this.friends.find((r) => r.id === target || r.username === target) ||
        this.other.find((r) => r.id === target || r.username === target) ||
        null
      );
    else if ("id" in target)
      return (
        this.friends.find((r) => r.id === target.id) ||
        this.other.find((r) => r.id === target.id) ||
        null
      );
    else
      return (
        this.friends.find((r) => r.username === target.username) ||
        this.other.find((r) => r.username === target.username) ||
        null
      );
  }

  /**
   * Get the user id given a username
   */
  async resolve(username: string) {
    return await this.api.users.resolve(username);
  }

  /** Get a users' information based on their userid or username
   * @example
   * const user = await client.social.who(await client.social.resolve('halp'));
   */
  who(id: string): Promise<APITypes.Users.User>;
  async who(id: string): Promise<APITypes.Users.User> {
    return this.api.users.get({ id });
  }

  /**
   * Send a message to a specified user (based on id)
   * @example
   * await client.social.dm(await client.social.resolve('halp'), 'what\'s up?');
   */
  dm(userID: string, message: string) {
    const res = this.client.wrap(
      "social.dm",
      {
        recipient: userID,
        msg: message
      },
      "social.dm",
      ["social.dm.fail", "client.error"]
    );

    if (this.config.suppressDMErrors) res.catch(() => {});

    return res;
  }

  /**
   * Send a user a friend request
   * @example
   * await client.social.friend(await client.social.resolve('halp'));
   * @returns false if the user is already friended, true otherwise
   * @throws {Error} If an error occurs (such as the user has blocked the client, etc)
   */
  async friend(userID: string) {
    if (this.friends.find((r) => r.id === userID)) return false;
    await this.api.social.friend(userID);
    const userData = await this.who(userID);
    this.friends.push(
      new Relationship(
        {
          id: userData._id,
          relationshipID: "",
          username: userData.username,
          avatar: userData.avatar_revision
        },
        this,
        this.client
      )
    );

    return true;
  }

  /**
   * Unfriend a user. Note: unfriending a user will unblock them if they are blocked.
   * @example
   * await client.social.unfriend(await client.social.resolve('halp'));
   * @returns false if the user is not unfriended, true otherwise
   */
  async unfriend(userID: string) {
    if (!this.friends.find((r) => r.id === userID)) return false;
    await this.api.social.unfriend(userID);
    this.friends = this.friends.filter((r) => r.id !== userID);

    return true;
  }

  /**
   * Block a user
   * @example
   * await client.social.block(await client.social.resolve('halp'));
   * @returns false if the user is already blocked, true otherwise
   */
  async block(userID: string) {
    if (this.blocked.find((r) => r.id === userID)) return false;
    await this.api.social.block(userID);
  }

  /**
   * Unblock a user. Note: unblocking a user will unfriend them if they are friended.
   * @example
   * await client.social.unblock(await client.social.resolve('halp'));
   * @returns false if the user is not unblocked, true otherwise
   */
  async unblock(userID: string) {
    await this.api.social.unblock(userID);
  }

  /**
   * Invite a user to your room
   * @example
   * await client.social.invite(await client.social.resolve('halp'));
   */
  invite(userID: string) {
    return new Promise<void>(async (resolve, reject) => {
      let r = false;
      this.client.emit("social.invite", userID);
      const l = (e: string) => {
        if (r) return;
        r = true;
        reject(e);
      };
      this.client.once("client.error", l);
      await new Promise((r) => setTimeout(r, 100));
      this.client.off("client.error", l);
      r = true;
      resolve();
    });
  }

  /**
   * Set the client's status
   * @example
   * client.social.status('online', 'lobby:X-QP');
   */
  status(status: SocialTypes.Status, detail: SocialTypes.Detail | String = "") {
    this.client.emit("social.presence", { status, detail });
  }
}

export * from "./relationship";
