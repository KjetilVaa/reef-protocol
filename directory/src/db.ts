import { Sequelize } from "sequelize";
import { config } from "./config.js";

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",
  logging: config.nodeEnv === "development" ? console.log : false,
  define: {
    underscored: true,
  },
});

/**
 * Initialize database — sync models.
 */
export async function initDb(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync({ alter: config.nodeEnv === "development" });
  console.log("[db] Connected and synced");
}
