import { Client } from "colyseus.js";

const client = new Client(import.meta.env.VITE_WS_URL);
export default client;