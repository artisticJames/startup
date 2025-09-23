const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all posts with user info and like status
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    
    // Get posts with user info and like status
    const [posts] = await pool.execute(`
      SELECT 
        p.id,
        p.content,
        p.image_url,
        p.likes_count,
        p.comments_count,
        p.created_at,
        u.id as user_id,
        u.name as user_name,
        u.profile_picture as user_avatar,
        CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = ?
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, image_url } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [userId, content.trim(), image_url || null]
    );

    // Get the created post with user info
    const [posts] = await pool.execute(`
      SELECT 
        p.id,
        p.content,
        p.image_url,
        p.likes_count,
        p.comments_count,
        p.created_at,
        u.id as user_id,
        u.name as user_name,
        u.profile_picture as user_avatar,
        0 as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Post created successfully',
      post: posts[0]
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like/Unlike post
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if already liked
    const [existingLikes] = await pool.execute(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingLikes.length > 0) {
      // Unlike
      await pool.execute(
        'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );
      await pool.execute(
        'UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?',
        [postId]
      );
    } else {
      // Like
      await pool.execute(
        'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
        [postId, userId]
      );
      await pool.execute(
        'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
        [postId]
      );
    }

    // Get updated like count
    const [posts] = await pool.execute(
      'SELECT likes_count FROM posts WHERE id = ?',
      [postId]
    );

    res.json({
      message: existingLikes.length > 0 ? 'Post unliked' : 'Post liked',
      likes_count: posts[0].likes_count
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post (only by author)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if post exists and user is the author
    const [posts] = await pool.execute(
      'SELECT id FROM posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }

    // Delete post (cascade will handle comments and likes)
    await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
