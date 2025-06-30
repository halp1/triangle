import { Social } from ".";
import type { Social as SocialTypes } from "../../types";
import { Client } from "../client";

export class Relationship {
  private social: Social;
  private client: Client;

  /** ID of the account on the other side of the relationsihp */
  id: string;
  /** ID of the relationship */
  relationshipID: string;
  /** Username of the account on the other side of the relationship */
  username: string;
  /** Avatar ID of the account on the other side of the relationship */
  avatar: number;
  /** The DMs that have been sent and received. You may need to call `loadDms` to populate this information */
  dms: SocialTypes.DM[];

  /** Promise that resolves when the dms have been loaded. This will not resovle if `Relationship.lazyLoadDms` is set to true. */
  ready: Promise<void>;
  /** Whether or not the dms have been loaded */
  dmsLoaded = false;

  static lazyLoadDms = true;

  constructor(
    options: {
      id: string;
      relationshipID: string;
      username: string;
      avatar: number;
    },
    social: Social,
    client: Client
  ) {
    this.id = options.id;
    this.relationshipID = options.relationshipID;
    this.username = options.username;
    this.avatar = options.avatar;

    this.social = social;
    this.client = client;

    this.dms = [];

    this.ready = Relationship.lazyLoadDms
      ? new Promise<never>(() => {})
      : new Promise<void>(async (resolve) => {
          await this.loadDms();
          resolve();
        });
  }

  /**
   * Send a dm to the user.
   * @example
   * relationship.dm("Hello!");
   */
  async dm(content: string) {
    await this.social.dm(this.id, content);
  }

  /**
   * Mark the dms as read
   * @example
   * relationship.markAsRead();
   */
  markAsRead() {
    this.client.emit("social.relation.ack", this.id);
  }

  /**
   * Load the DMs for this relationship
   * @example
   * await relationship.loadDms();
   */
  async loadDms() {
    const dms = (await this.client.api.social.dms(this.id)).reverse();
    this.dms = dms;
    this.dmsLoaded = true;
    return dms;
  }

  /**
   * Invite the user to a game
   * @example
   * relationship.invite();
   */
  invite() {
    this.social.invite(this.id);
  }
}
