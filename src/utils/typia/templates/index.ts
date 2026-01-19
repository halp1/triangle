import type { Packet } from "../../../classes/ribbon";

import typia from "typia";

export const validateIncomingMessage = typia.createValidateEquals<Packet>();
