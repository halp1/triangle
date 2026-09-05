export interface Staff {
  /** In a normal TETR.IO client, this allows an admin to "eval" any code on any client. The code to evaluate is the string data passed. Triangle.js does not handle this message. */
  "staff.xrc": string;

  /** Fires when you are sending too many dms */
  "staff.spam": void;

  /** Fires when a TETR.IO moderator warns you. `banid` identifies the warning, `msg` is the moderator's message. */
  "staff.warn": { banid: string; msg: string };

  /** Fires when a TETR.IO moderator silences you. Silenced users may not chat or create public rooms, but may still play online and submit scores. `expires` is a date string. */
  "staff.silence": { banid: string; message: string; expires: string };

  /** Fires when a warning or ban is lifted. The data is the `banid` of the lifted warning/ban. */
  "staff.lift": string;
}
