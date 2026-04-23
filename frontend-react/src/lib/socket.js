import { io } from "socket.io-client"
import { nodeApi } from "./api"

export const socket = io(nodeApi(), {
  transports: ["websocket"],
  withCredentials: true,
})
