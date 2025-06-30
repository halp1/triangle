// export * as API from "./wrapper";
import { CONSTANTS } from "../constants";
import { type Get, type Post, basic } from "./basic";
import { channel } from "./channel";
import { relationship } from "./relationship";
import { rooms } from "./rooms";
import { server } from "./server";
import { users } from "./users";

export interface APIDefaults {
  token: string;
  userAgent: string;
  /** a cf_clearance Cloudflare turnstile token. */
  turnstile: string | null;
}

export class API {
  readonly defaults: APIDefaults = {
    token: "",
    userAgent: CONSTANTS.userAgent,
    turnstile: null
  };

  get!: Get;
  post!: Post;

  rooms!: ReturnType<typeof rooms>;
  server!: ReturnType<typeof server>;
  users!: ReturnType<typeof users>;
  social!: ReturnType<typeof relationship>;
  channel!: ReturnType<typeof channel>;

  /** @hideconstructor */
  constructor(options: Partial<APIDefaults> = {}) {
    this.update(options);
  }

  update(options: Partial<APIDefaults> = {}) {
    (Object.keys(options) as (keyof APIDefaults)[]).forEach((key) => {
      this.defaults[key] = options[key]!;
    });

    const b = basic(this.defaults);
    this.get = b.get;
    this.post = b.post;

    this.rooms = rooms(this.get, this.post, this.defaults);
    this.server = server(this.get, this.post, this.defaults);
    this.users = users(this.get, this.post, this.defaults);
    this.social = relationship(this.get, this.post, this.defaults);
    this.channel = channel(this.get, this.post, this.defaults);
  }
}

export * as APITypes from "./wrapper";
