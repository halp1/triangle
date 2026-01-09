import { polyfills } from "../utils";

export interface GarbageRecord {
  amount: number;
  iid: number;
}

export interface PlayerData {
  incoming: number;
  outgoing: GarbageRecord[];
}

export interface IGEHandlerSnapshot {
  iid: number;
  players: { [key: number]: PlayerData };
}
/**
 * Manages network IGE cancelling
 */
export class IGEHandler {
  #players: polyfills.Map<number, PlayerData>;
  #iid = 0;

  /**
   * Manages network IGE cancelling
   * @param players - list of player ids
   */
  constructor(players: number[]) {
    this.#players = new polyfills.Map();
    players.forEach((player) => {
      this.#players.set(player, { incoming: 0, outgoing: [] });
    });
  }

  /**
   * Sends a message to a player.
   * Adds the player to the players list if it does not exist.
   * @param options - info on sending player
   * @param options.playerID - The ID of the player to send the message to.
   * @param options.amount - The amount of the message.
   */
  send({ playerID, amount }: { playerID: number; amount: number }) {
    if (amount === 0) return;
    let player = this.#players.get(playerID);
    const iid = ++this.#iid;

    if (!player) {
      player = { incoming: 0, outgoing: [] };
      this.#players.set(playerID, player);
    }

    this.#players.set(playerID, {
      incoming: player.incoming,
      outgoing: [...player.outgoing, { iid, amount }]
    });

    // console.log(
    //   "send",
    //   playerID,
    //   Object.fromEntries(
    //     [...this.#players.entries()].map(([k, v]) => [k, this.extract(v)])
    //   )
    // );
  }

  /**
   * Receives a garbage from a player and processes it.
   * Adds the player to the players list if it does not exist.
   * @param garbage - garbage object of data
   * @param garbage.playerID - The ID of the player sending the garbage.
   * @param garbage.ackiid - The IID of the last acknowledged item.
   * @param garbage.iid - The IID of the incoming item.
   * @param garbage.amount - The amount of the incoming item.
   * @returns The remaining amount after processing the message.
   */
  receive({
    playerID,
    ackiid,
    iid,
    amount
  }: {
    playerID: number;
    ackiid: number;
    iid: number;
    amount: number;
  }) {
    let player = this.#players.get(playerID);
    if (!player) {
      player = { incoming: 0, outgoing: [] };
      this.#players.set(playerID, player);
    }

    const incomingIID = Math.max(iid, player.incoming ?? 0);

    const newIGEs: GarbageRecord[] = [];

    let runningAmount = amount;
    player.outgoing.forEach((item) => {
      if (item.iid <= ackiid) return;
      const amt = Math.min(item.amount, runningAmount);
      item.amount -= amt;
      runningAmount -= amt;
      if (item.amount > 0) newIGEs.push(item);
    });

    this.#players.set(playerID, { incoming: incomingIID, outgoing: newIGEs });

    // console.log(
    //   "receive",
    //   playerID,
    //   Object.fromEntries(
    //     [...this.#players.entries()].map(([k, v]) => [k, this.extract(v)])
    //   )
    // );

    return runningAmount;
  }

  snapshot(): IGEHandlerSnapshot {
    return {
      players: Object.fromEntries(this.#players.entries()),
      iid: this.#iid
    };
  }

  fromSnapshot(snapshot: IGEHandlerSnapshot) {
    this.#players = new polyfills.Map(
      Object.entries(snapshot.players).map(([k, v]) => [Number(k), v])
    );
    this.#iid = snapshot.iid;
  }
}
