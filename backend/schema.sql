-- 建立資料庫
CREATE DATABASE IF NOT EXISTS userDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE userDB;

-- 使用者帳號表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 插入預設帳號
INSERT INTO users (email, password) VALUES
('test@example.com', '$2a$10$xnoJ/xH041IhpOWIQ/b9/eHhsL5E5s7sVd5jmQfU8NwTNOwS9nPrO');



-- 個人資料表
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT '',
    birthday DATE DEFAULT NULL,
    height DECIMAL(5,2) DEFAULT NULL,
    weight DECIMAL(5,2) DEFAULT NULL,
    sportType VARCHAR(50) DEFAULT 'general',
    gender VARCHAR(10) DEFAULT 'male',
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 使用者飲食紀錄表
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    grams DECIMAL(8,2) NOT NULL,
    created_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
