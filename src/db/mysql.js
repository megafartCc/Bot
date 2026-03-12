import mysql from "mysql2/promise";

export function createDatabasePool(config) {
  return mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    connectionLimit: config.mysql.connectionLimit,
    waitForConnections: true,
    queueLimit: 0
  });
}

export async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      guild_id VARCHAR(32) NOT NULL,
      channel_id VARCHAR(32) NOT NULL,
      message_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      username VARCHAR(128) NOT NULL,
      source VARCHAR(24) NOT NULL,
      category VARCHAR(64) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      explanation TEXT NULL,
      confidence DECIMAL(5,4) NULL,
      raw_content TEXT NULL,
      matched_urls TEXT NULL,
      model VARCHAR(128) NULL,
      delete_status VARCHAR(24) NOT NULL,
      delete_error TEXT NULL,
      dm_status VARCHAR(24) NOT NULL,
      dm_error TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_moderation_events_guild_created (guild_id, created_at),
      KEY idx_moderation_events_user_created (user_id, created_at),
      KEY idx_moderation_events_message (message_id)
    )
  `);
}
