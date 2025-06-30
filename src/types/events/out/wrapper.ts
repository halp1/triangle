import type { Client } from "../in/client";
import type { Game } from "./game";
import type { Ribbon } from "./ribbon";
import type { Room } from "./room";
import type { Social } from "./social";

export * from "./social";
export * from "./room";
export * from "./game";
export * from "./ribbon";

export * from "../in/client";

export type all = Social & Room & Game & Client & Ribbon;
