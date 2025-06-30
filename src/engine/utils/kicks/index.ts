import { type BoardSquare } from "../../board";
import { Mino } from "../../queue/types";
import type { Rotation } from "../tetromino/types";
import { kicks } from "./data";

export { kicks as kickData };
export type KickTable = keyof typeof kicks;

export const legal = (blocks: [number, number][], board: BoardSquare[][]) => {
  if (board.length === 0) return false;
  for (const block of blocks) {
    if (block[0] < 0) return false;
    if (block[0] >= board[0].length) return false;
    if (block[1] < 0) return false;
    if (block[1] >= board.length) return false;
    if (board[block[1]][block[0]]) return false;
  }

  return true;
};

export const performKick = (
  kicktable: KickTable,
  piece: Mino,
  pieceLocation: [number, number],
  ao: [number, number],
  maxMovement: boolean,
  blocks: [number, number][],
  startRotation: Rotation,
  endRotation: Rotation,
  board: BoardSquare[][]
):
  | {
      kick: [number, number];
      newLocation: [number, number];
      id: string;
      index: number;
    }
  | boolean => {
  try {
    if (
      legal(
        blocks.map((block) => [
          pieceLocation[0] + block[0] - ao[0],
          Math.floor(pieceLocation[1]) - block[1] - ao[1]
        ]),
        board
      )
    )
      return true;

    const kickID = `${startRotation}${endRotation}`;
    const table = kicks[kicktable];
    const customKicksetID =
      `${piece.toLowerCase()}_kicks` as keyof typeof table;
    const kickset: [number, number][] =
      customKicksetID in table
        ? table[customKicksetID][
            kickID as keyof (typeof table)[typeof customKicksetID]
          ]
        : (table.kicks[kickID as keyof typeof table.kicks] as [
            number,
            number
          ][]);

    for (let i = 0; i < kickset.length; i++) {
      const [dx, dy] = kickset[i];

      const newY = maxMovement
        ? pieceLocation[1] - dy - ao[1]
        : Math.ceil(pieceLocation[1]) - 0.1 - dy - ao[1];

      if (
        legal(
          blocks.map((block) => [
            pieceLocation[0] + block[0] + dx - ao[0],
            Math.floor(newY) - block[1]
          ]),
          board
        )
      ) {
        return {
          newLocation: [pieceLocation[0] + dx - ao[0], newY],
          kick: [dx, -dy],
          id: kickID,
          index: i
        };
      }
    }

    return false;
  } catch {
    return false;
  }
};
