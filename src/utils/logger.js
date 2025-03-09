import { createLogger, format as _format, transports as _transports } from "winston";
import LokiTransport from "winston-loki";

const logger = createLogger({
    level: "info",
    format: _format.combine(
        _format.timestamp(),
        _format.json()
    ),
    transports: [
        new _transports.Console(),
        new _transports.File({ filename: "logs/error.log", level: "error" }),
        new _transports.File({ filename: "logs/combined.log" }),
        new LokiTransport({
            host: "http://loki:3100",
            labels: { app: "client" },
            json: true,
            onConnectionError: (err) => console.error("Loki connection error:", err)
        })
    ]
});

export default logger;