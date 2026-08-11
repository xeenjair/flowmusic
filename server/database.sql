-- ============================================================
-- FlowMusic — структура базы данных (MySQL / MariaDB)
-- Импорт: phpMyAdmin → Import → выбрать этот файл
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Таблица: users — пользователи приложения
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`          VARCHAR(36)  NOT NULL,
  `device_id`   VARCHAR(128) NOT NULL,
  `email`       VARCHAR(255) DEFAULT NULL,
  `username`    VARCHAR(64)  DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_active` DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_device_id` (`device_id`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: subscriptions — подписки пользователей
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    VARCHAR(36)  NOT NULL,
  `status`     ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `start_date` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date`   DATETIME     NOT NULL,
  `auto_renew` TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_subscriptions_user` (`user_id`),
  KEY `idx_subscriptions_status_end` (`status`, `end_date`),
  CONSTRAINT `fk_subscriptions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: transactions — платёжные транзакции (Robokassa)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `user_id`     VARCHAR(36)    NOT NULL,
  `inv_id`      VARCHAR(64)    DEFAULT NULL,
  `amount`      DECIMAL(10,2)  NOT NULL,
  `currency`    VARCHAR(8)     NOT NULL DEFAULT 'RUB',
  `description` VARCHAR(255)   DEFAULT NULL,
  `status`      ENUM('pending','success','fail') NOT NULL DEFAULT 'pending',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transactions_inv_id` (`inv_id`),
  KEY `idx_transactions_user` (`user_id`),
  CONSTRAINT `fk_transactions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: tracks — кэш треков (метаданные из Yandex Music)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tracks` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `yandex_id`   BIGINT UNSIGNED NOT NULL,
  `title`       VARCHAR(255)    NOT NULL,
  `artist`      VARCHAR(255)    DEFAULT NULL,
  `album`       VARCHAR(255)    DEFAULT NULL,
  `duration_ms` INT UNSIGNED    DEFAULT NULL,
  `cover_url`   VARCHAR(512)    DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tracks_yandex_id` (`yandex_id`),
  KEY `idx_tracks_title` (`title`),
  KEY `idx_tracks_artist` (`artist`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: playlists — плейлисты пользователей
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `playlists` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     VARCHAR(36)  NOT NULL,
  `name`        VARCHAR(128) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `cover_url`   VARCHAR(512) DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_playlists_user` (`user_id`),
  CONSTRAINT `fk_playlists_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: playlist_tracks — связь плейлистов и треков
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `playlist_tracks` (
  `playlist_id` INT UNSIGNED      NOT NULL,
  `track_id`    BIGINT UNSIGNED   NOT NULL,
  `position`    INT UNSIGNED      NOT NULL DEFAULT 0,
  `added_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`playlist_id`, `track_id`),
  KEY `idx_playlist_tracks_track` (`track_id`),
  CONSTRAINT `fk_playlist_tracks_playlist`
    FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_playlist_tracks_track`
    FOREIGN KEY (`track_id`) REFERENCES `tracks` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: favorites — избранные треки пользователя
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id`    VARCHAR(36)   NOT NULL,
  `track_id`   BIGINT UNSIGNED NOT NULL,
  `added_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `track_id`),
  KEY `idx_favorites_track` (`track_id`),
  CONSTRAINT `fk_favorites_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_favorites_track`
    FOREIGN KEY (`track_id`) REFERENCES `tracks` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: codes — коды активации подписки (продажа через FunPay)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `codes` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(32)   NOT NULL,
  `days`       INT UNSIGNED  NOT NULL DEFAULT 30,
  `status`     ENUM('active','used','disabled') NOT NULL DEFAULT 'active',
  `user_id`    VARCHAR(36)   DEFAULT NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at`    DATETIME      DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_codes_code` (`code`),
  KEY `idx_codes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Таблица: play_history — история прослушивания
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `play_history` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`    VARCHAR(36)      NOT NULL,
  `track_id`   BIGINT UNSIGNED  NOT NULL,
  `played_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_history_user` (`user_id`),
  KEY `idx_history_track` (`track_id`),
  KEY `idx_history_played_at` (`played_at`),
  CONSTRAINT `fk_history_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_history_track`
    FOREIGN KEY (`track_id`) REFERENCES `tracks` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;