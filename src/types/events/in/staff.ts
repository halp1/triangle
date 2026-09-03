export interface Staff {
  /** In a normal TETR.IO client, this allows an admin to "eval" any code on any client. The code to evaluate is the string data passed. Triangle.js does not handle this message. */
  "staff.xrc": string;

  /** Fires when you are sending too many dms */
  "staff.spam": void;
}
