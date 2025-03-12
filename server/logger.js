import winston from "winston";
import LokiTransport from "winston-loki";
import os from "os";

// Конфигурация уровней логирования
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Цвета для разных уровней логирования
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Добавляем цвета в Winston
winston.addColors(colors);

// Формат для консольного вывода
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Формат для Loki
const lokiFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Создаем массив транспортов
const transports = [
    // Консольный вывод
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    // Файловый вывод для ошибок
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    }),
    // Общий файл логов
    new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    }),
];

// Добавляем Loki транспорт в production
if (process.env.NODE_ENV === 'production') {
    transports.push(
        new LokiTransport({
            host: 'http://loki:3100',
            labels: {
                job: 'game-server',
                environment: process.env.NODE_ENV,
                hostname: os.hostname(),
            },
            json: true,
            format: lokiFormat,
            replaceTimestamp: true,
            onConnectionError: (err) => {
                console.error('Loki connection error:', err);
            },
        })
    );
}

// Создаем логгер
const logger = winston.createLogger({
    levels,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports,
});

// Middleware для логирования HTTP запросов
export const httpLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(
            `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
        );
    });
    next();
};

// Обработчик необработанных ошибок
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Даем время на отправку лога в Loki перед выходом
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default logger; 