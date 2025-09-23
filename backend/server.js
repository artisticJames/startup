const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database connection
let dbConnection;
async function connectToDatabase() {
  try {
    dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'startup_app'
    });
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from parent directory (prototype files)
app.use(express.static(path.join(__dirname, '..')));

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Start Up API is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    if (!dbConnection) {
      return res.status(500).json({ 
        status: 'ERROR', 
        message: 'Database not connected' 
      });
    }

    const [rows] = await dbConnection.execute('SELECT COUNT(*) as user_count FROM users');
    
    res.json({ 
      status: 'SUCCESS', 
      message: 'Database connected successfully',
      data: {
        user_count: rows[0].user_count,
        database: process.env.DB_NAME || 'startup_app'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database test failed',
      error: error.message 
    });
  }
});

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const [existingUsers] = await dbConnection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await dbConnection.execute(
      'INSERT INTO users (email, password_hash, name, email_verified) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, false] // email_verified = false initially
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: result.insertId, 
        email: email,
        name: name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertId,
        name,
        email,
        verified: false
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const [users] = await dbConnection.execute(
      'SELECT id, name, email, password_hash, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.email_verified
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, verification_code } = req.body;

    // For demo purposes, accept any 6-digit code
    if (verification_code && verification_code.length === 6) {
      // Update user as verified
      await dbConnection.execute(
        'UPDATE users SET email_verified = ? WHERE email = ?',
        [true, email]
      );

      // Get user data
      const [users] = await dbConnection.execute(
        'SELECT id, name, email, email_verified FROM users WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        res.json({
          message: 'Email verified successfully',
          user: users[0]
        });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/profile', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [users] = await dbConnection.execute(
      'SELECT id, name, email, email_verified, tier, created_at FROM users WHERE email = ?',
      [email]
    );

    if (users.length > 0) {
      res.json({ user: users[0] });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (for admin)
app.get('/api/users', async (req, res) => {
  try {
    if (!dbConnection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const [users] = await dbConnection.execute(
      'SELECT id, email, name, tier, email_verified, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all posts with user info
app.get('/api/posts', async (req, res) => {
  try {
    if (!dbConnection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const [posts] = await dbConnection.execute(`
      SELECT 
        p.id,
        p.content,
        p.image_url,
        p.likes_count,
        p.comments_count,
        p.created_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    // Get comments for each post and parse attachments
    for (let post of posts) {
      const [comments] = await dbConnection.execute(`
        SELECT 
          c.id,
          c.content,
          c.created_at,
          u.name as user_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `, [post.id]);
      
      post.comments = comments;
      
      // Parse attachments if they exist
      if (post.image_url) {
        try {
          post.attachments = JSON.parse(post.image_url);
        } catch (e) {
          post.attachments = [];
        }
      } else {
        post.attachments = [];
      }
    }
    
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new post
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { content, attachments } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    // Get user ID from JWT token
    const userId = req.user.userId;

    // Store attachments as JSON in the image_url field for now
    const attachmentsJson = attachments && attachments.length > 0 ? JSON.stringify(attachments) : null;

    const [result] = await dbConnection.execute(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [userId, content.trim(), attachmentsJson]
    );

    // Get the created post with user info
    const [posts] = await dbConnection.execute(`
      SELECT 
        p.id,
        p.content,
        p.image_url,
        p.likes_count,
        p.comments_count,
        p.created_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [result.insertId]);

    const post = posts[0];
    
    // Parse attachments if they exist
    if (post.image_url) {
      try {
        post.attachments = JSON.parse(post.image_url);
      } catch (e) {
        post.attachments = [];
      }
    } else {
      post.attachments = [];
    }

    res.status(201).json({
      message: 'Post created successfully',
      post: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for a post
app.get('/api/comments/post/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;

    const [comments] = await dbConnection.execute(`
      SELECT 
        c.id,
        c.content,
        c.created_at,
        u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new comment
app.post('/api/comments/post/:postId', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { content, attachments } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Get user ID from JWT token
    const userId = req.user.userId;

    // Check if post exists
    const [posts] = await dbConnection.execute(
      'SELECT id FROM posts WHERE id = ?',
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Store attachments as JSON in a text field (we'll add this to schema later)
    const attachmentsJson = attachments && attachments.length > 0 ? JSON.stringify(attachments) : null;

    // Create comment
    const [result] = await dbConnection.execute(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, content.trim()]
    );

    // Update post comments count
    await dbConnection.execute(
      'UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?',
      [postId]
    );

    // Get the created comment with user info
    const [comments] = await dbConnection.execute(`
      SELECT 
        c.id,
        c.content,
        c.created_at,
        u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    const comment = comments[0];
    
    // Add attachments to comment
    if (attachmentsJson) {
      comment.attachments = JSON.parse(attachmentsJson);
    } else {
      comment.attachments = [];
    }

    res.status(201).json({
      message: 'Comment created successfully',
      comment: comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main app for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Start server
async function startServer() {
  // Connect to database first
  await connectToDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📱 Frontend available at http://localhost:${PORT}`);
      console.log(`🔗 API endpoints at http://localhost:${PORT}/api`);
    console.log(`🧪 Test database: http://localhost:${PORT}/api/test-db`);
    });
}

startServer();
