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

-- 插入預設帳號 (密碼: test123)
INSERT INTO users (email, password) VALUES
('test@example.com', '$2a$10$xnoJ/xH041IhpOWIQ/b9/eHhsL5E5s7sVd5jmQfU8NwTNOwS9nPrO')
ON DUPLICATE KEY UPDATE email=email;

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

-- 使用者飲食紀錄表 (舊版，用於圖表)
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    grams DECIMAL(8,2) NOT NULL,
    created_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🆕 飲食紀錄表 (新版，用於 API)
CREATE TABLE IF NOT EXISTS diet_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    grams DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 聊天記錄表
CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role ENUM('user','assistant') NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🔧 運動習慣表 (改名為 habits，與後端一致)
DROP TABLE IF EXISTS user_habits;
CREATE TABLE IF NOT EXISTS habits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    freq_per_week INT DEFAULT 0,
    duration_min INT DEFAULT 0,
    meal_breakfast BOOLEAN DEFAULT FALSE,
    meal_lunch BOOLEAN DEFAULT FALSE,
    meal_dinner BOOLEAN DEFAULT FALSE,
    meal_late BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🔧 目標表 (修正欄位)
DROP TABLE IF EXISTS goals;
CREATE TABLE IF NOT EXISTS goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    short_goal TEXT,
    long_goal TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 食物資料表
CREATE TABLE foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    portion_size_per_day VARCHAR(50),
    cal_per_100g DECIMAL(6,2),
    carbon_per_100g DECIMAL(6,2),
    protein_per_100g DECIMAL(6,2),
    fats_per_100g DECIMAL(6,2),
    flavor VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);









-- 📊 查看所有表
SHOW TABLES;

-- 📋 查看表結構 (可選)
-- DESCRIBE users;
-- DESCRIBE profiles;
-- DESCRIBE logs;
-- DESCRIBE diet_logs;
-- DESCRIBE chat_logs;
-- DESCRIBE habits;
-- DESCRIBE goals;


