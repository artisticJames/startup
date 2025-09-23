-- Start Up App Database Schema for MySQL Workbench
CREATE DATABASE IF NOT EXISTS startup_app;
USE startup_app;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    tier ENUM('none', 'demo', 'premium') DEFAULT 'none',
    email_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    reset_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_reset_code (reset_code)
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_post_like (post_id, user_id)
);

-- Comment likes table
CREATE TABLE IF NOT EXISTS comment_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_comment_like (comment_id, user_id)
);

-- Sample data
INSERT INTO users (email, password_hash, name, tier, email_verified) VALUES 
('demo@startup.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User', 'demo', TRUE),
('premium@startup.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Premium User', 'premium', TRUE);

INSERT INTO posts (user_id, content, likes_count, comments_count) VALUES 
(1, 'Just launched my MVP! 🚀 Excited to see how users respond to the new feature.', 5, 2),
(1, 'Looking for a co-founder with technical skills. Anyone interested in building the next big thing?', 3, 1),
(2, 'Premium tip: Always validate your idea before building. Saved me 6 months of development!', 8, 3);

INSERT INTO comments (post_id, user_id, content, likes_count) VALUES 
(1, 2, 'Congratulations! What was the biggest challenge you faced?', 2),
(1, 1, 'Thanks! The hardest part was getting the first 100 users.', 1),
(2, 2, 'I might be interested! What industry are you focusing on?', 0),
(3, 1, 'Great advice! How did you validate your idea?', 1),
(3, 2, 'Customer interviews and landing page tests. The data doesn\'t lie!', 3);