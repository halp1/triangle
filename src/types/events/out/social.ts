import type { Social as SocialTypes } from "../../social";

export interface Social {
  "social.presence": {
    status: SocialTypes.Status;
    detail: SocialTypes.Detail | String; // keep this as String for autocomplete
  };

  "social.dm": {
    recipient: string;
    msg: string;
  };

  "social.invite": string;

  "social.notification.ack": void;
  "social.relation.ack": string;
}
