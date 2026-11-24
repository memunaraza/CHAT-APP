import { io } from "socket.io-client";
import { getToken } from "./token";

// VITE_SOCKET_URL na ho to VITE_API_URL se bana lo (".../api" hata kar)
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");

export const connectSocket = () => {
  const socket = io(SOCKET_URL, {
    auth: { token: getToken() },
    forceNew: true, // har baar bilkul naya connection
    transports: ["websocket"],
  });

  socket.on("connect", () => console.log("[socket] connected:", socket.id));
  socket.on("connect_error", (err) => console.error("[socket] error:", err.message, "->", SOCKET_URL));
  return socket;
};
