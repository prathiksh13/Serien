// socket.js

import { io } from "socket.io-client";
import { socketUrl } from "./api";

export const socket = io(socketUrl(), {
  transports: ["websocket"],
});
