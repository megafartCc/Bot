import pino from "pino";
import { config } from "./config.js";

const transport =
  config.nodeEnv === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard"
        }
      }
    : undefined;

export const logger = pino({
  level: config.logLevel,
  base: undefined,
  transport
});
