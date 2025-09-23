const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get comments for a post
router.get('/post/:postId', optionalAuth, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user ? req.user.id : null;

    const [comments] = await pool.execute(`
      SELECT 
        c.id,
        c.content,
        c.likes_count,
        c.created_at,
        u.id as user_id,
        u.name as user_name,
        u.profile_picture as user_avatar,
        CASE WHEN cl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = ?
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [userId, postId]);

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new comment
router.post('/post/:postId', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if post exists
    const [posts] = await pool.execute(
      'SELECT id FROM posts WHERE id = ?',
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create comment
    const [result] = await pool.execute(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, content.trim()]
    );

    // Update post comments count
    await pool.execute(
      'UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?',
      [postId]
    );

    // Get the created comment with user info
    const [comments] = await pool.execute(`
      SELECT 
        c.id,
        c.content,
        c.likes_count,
        c.created_at,
        u.id as user_id,
        u.name as user_name,
        u.profile_picture as user_avatar,
        0 as is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Comment created successfully',
      comment: comments[0]
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like/Unlike comment
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;

    // Check if already liked
    const [existingLikes] = await pool.execute(
      'SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (existingLikes.length > 0) {
      // Unlike
      await pool.execute(
        'DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?',
        [commentId, userId]
      );
      await pool.execute(
        'UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?',
        [commentId]
      );
    } else {
      // Like
      await pool.execute(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)',
        [commentId, userId]
      );
      await pool.execute(
        'UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?',
        [commentId]
      );
    }

    // Get updated like count
    const [comments] = await pool.execute(
      'SELECT likes_count FROM comments WHERE id = ?',
      [commentId]
    );

    res.json({
      message: existingLikes.length > 0 ? 'Comment unliked' : 'Comment liked',
      likes_count: comments[0].likes_count
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment (only by author)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;

    // Check if comment exists and user is the author
    const [comments] = await pool.execute(
      'SELECT id, post_id FROM comments WHERE id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    const postId = comments[0].post_id;

    // Delete comment
    await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

    // Update post comments count
    await pool.execute(
      'UPDATE posts SET comments_count = comments_count - 1 WHERE id = ?',
      [postId]
    );

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
