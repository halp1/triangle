# Troubleshooting Triangle.js

## Common Issues

### Native WebSocket not found

Starting with `v22.4.0`, Node.js has a native WebSocket implementation. If you are using an older version of Node.js, upgrade your Node.js version.

If you are unable to upgrade your Node.js version, do the following:

1. Install the `ws` package:
   ```bash
   npm install ws
   ```
2. At the top of your code, (or anywhere before calling your first `Client.create`), add the following code:
   **ES6/Import:**

   ```ts
   import { WebSocket } from "ws";

   globalThis.WebSocket = WebSocket;
   ```

   **CommonJS:**

   ```ts
   const { WebSocket } = require("ws");
   globalThis.WebSocket = WebSocket;
   ```
