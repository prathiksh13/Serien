import { io } from "socket.io-client"

export const socket = io("https://serien-model.onrender.com", {
  transports: ["websocket"],
  withCredentials: true,
})
