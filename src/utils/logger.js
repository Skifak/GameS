import winston from "winston";
import LokiTransport from "winston-loki";
import config from "../../server/config.js";

const logger = winston.createLogger({
    level: config?.debug ? "debug" : "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" })
    ]
});

const logLevel = config.env === 'development' ? 'debug' : 'info';
const logFormat = config.env === 'development' 
  ? winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  : winston.format.json();

// Добавляем Loki транспорт только если он доступен
if (config?.lokiUrl) {
    try {
        logger.add(new LokiTransport({
            host: config.lokiUrl,
            labels: { app: "game-server" },
            json: true,
            onConnectionError: (err) => {
                if (config.env === 'development') {
                    console.warn("Loki connection error in development mode:", err.message);
                } else {
                    console.error("Loki connection error:", err);
                }
            }
        }));
    } catch (error) {
        console.warn(`Failed to add Loki transport: ${error.message}`);
    }
}

export default logger;