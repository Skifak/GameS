import { Client } from "colyseus.js";

const token = localStorage.getItem("token");
const client = new Client(import.meta.env.VITE_WS_URL, { token });
export default client;