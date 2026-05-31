CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO d1_migrations (name) VALUES 
('0000_workable_sandman.sql'),
('0001_true_quasar.sql'),
('0002_dashing_microchip.sql'),
('0003_yielding_maelstrom.sql'),
('0005_harsh_punisher.sql'),
('0006_third_bloodstorm.sql'),
('0007_orange_wolf_cub.sql'),
('0008_amused_lilith.sql');
