const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './config.env' });

const app = express();
const { state, loadUsers, saveUsers, loadPosts, savePosts, loadComments, saveComments } = require('./storage');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Google Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Storage backed by MongoDB if MONGODB_URI is set, else file fallback

// Comments storage handled by storage module

// Simple middleware
app.use(express.json({ limit: '50mb' })); // Increase payload size limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // For form data
// Serve static files from project root (../)
app.use(express.static(path.join(__dirname, '..')));

// Disable caching for API responses to ensure fresh comments/posts
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Explicit manifest route with proper headers
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(manifestPath);
});

// Explicit service worker route with proper headers
app.get(['/service-worker.js', '/sw.js'], (req, res) => {
  const swPath = path.join(__dirname, '..', 'service-worker.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(swPath);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Start Up API is running',
    timestamp: new Date().toISOString()
  });
});

// Test Gemini API endpoint
app.get('/api/test-gemini', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        error: 'GEMINI_API_KEY not found',
        hasApiKey: false 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say 'Hello, Gemini is working!'");
    const response = result.response.text();

    res.json({
      success: true,
      response: response,
      hasApiKey: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.json({
      error: 'Gemini test failed',
      details: error.message,
      code: error.code,
      hasApiKey: !!process.env.GEMINI_API_KEY
    });
  }
});

// Debug storage status
app.get('/api/debug/storage', async (req, res) => {
  try {
    const users = await loadUsers();
    const posts = await loadPosts();
    const comments = await loadComments();
    const usersCount = Array.isArray(users) ? users.length : Object.keys(users || {}).length;
    res.json({
      mode: (require('./storage').state.mode),
      counts: {
        users: usersCount,
        posts: (posts || []).length,
        comments: (comments || []).length
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'startup_app'
    });
    
    await connection.execute('SELECT 1 as test');
    connection.end();
    
    res.json({ 
      status: 'OK', 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Server-side quote proxy to avoid CORS/rate limits
app.get('/api/quote', async (req, res) => {
  try {
    // Try ZenQuotes first
    try {
      const r1 = await fetch('https://zenquotes.io/api/today', { cache: 'no-store' });
      if (r1.ok) {
        const d1 = await r1.json();
        if (Array.isArray(d1) && d1[0] && d1[0].q) {
          return res.json({ text: d1[0].q, author: d1[0].a || '—', source: 'zenquotes' });
        }
      }
    } catch (_) {}

    // Fallback: Quotable
    try {
      const r2 = await fetch('https://api.quotable.io/random?tags=inspirational', { cache: 'no-store' });
      if (r2.ok) {
        const d2 = await r2.json();
        return res.json({ text: d2.content, author: d2.author || '—', source: 'quotable' });
      }
    } catch (_) {}

    // Last resort
    return res.json({
      text: 'The only way to do great work is to love what you do.',
      author: 'Steve Jobs',
      source: 'fallback'
    });
  } catch (error) {
    return res.json({
      text: 'The only way to do great work is to love what you do.',
      author: 'Steve Jobs',
      source: 'fallback'
    });
  }
});

// AI-powered business search endpoint using Google Gemini
app.post('/api/ai-search', async (req, res) => {
  try {
    const { query } = req.body;
    
    console.log('AI Search Request:', { query, hasApiKey: !!process.env.GEMINI_API_KEY });
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.log('GEMINI_API_KEY not found in environment');
      return res.status(500).json({ 
        error: 'AI search is not configured. Please set GEMINI_API_KEY environment variable.' 
      });
    }

    // Create a business-focused prompt
    const prompt = `You are a business consultant and startup advisor. A user is searching for: "${query}"

Please provide a comprehensive business-focused response that includes:
1. Key insights and advice related to their search
2. Practical steps or recommendations
3. Common challenges and how to overcome them
4. Resources or tools they might find useful
5. Market trends or opportunities if relevant

Keep the response professional, actionable, and focused on business/startup success. Limit to 300 words.`;

    // Get the Gemini model (use stable model name)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Gemini model initialized');

    const result = await model.generateContent(prompt);
    console.log('Gemini response received');
    
    const aiResponse = result.response.text();
    console.log('AI response length:', aiResponse.length);

    res.json({
      query: query,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      model: "gemini-1.5-flash"
    });

  } catch (error) {
    console.error('AI search error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'AI search failed. Please try again later.',
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const users = await loadUsers();
    
    // Check if user already exists
    if (users[email]) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const userId = Date.now();
    users[email] = {
      id: userId,
      name: name,
      email: email,
      password: password, // In real app, this would be hashed
      verified: false,
      tier: 'none', // Default tier is 'none'
      registeredAt: new Date().toISOString()
    };

    saveUsers(users);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        name: name,
        email: email,
        verified: false
      },
      token: 'test-token-' + userId
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email verification endpoint
app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, verification_code } = req.body;
    
    const users = await loadUsers();
    const user = users[email];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For testing, accept any verification code
    user.verified = true;
    await saveUsers(users);

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: true
      },
      token: 'test-token-' + user.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await loadUsers();
    const user = users[email];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // For testing, accept any password
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        profile_picture: user.profile_picture || null,
        isAdmin: user.email === 'admin@startup.com' // Check if admin
      },
      token: 'test-token-' + user.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile (name) endpoint
app.put('/api/profile', async (req, res) => {
  try {
    const { email, name, profile_picture } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const users = await loadUsers();
    const user = users[email];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = name;
    if (profile_picture) {
      user.profile_picture = profile_picture;
    }
    await saveUsers(users);

    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        profile_picture: user.profile_picture || null,
        isAdmin: user.email === 'admin@startup.com'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await loadUsers();
    const userList = Object.values(users).map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified,
      banned: user.banned || false,
      tier: user.tier || 'none',
      registeredAt: user.registeredAt
    }));
    
    res.json({ users: userList });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban/Unban user endpoint
app.post('/api/admin/ban/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const { banned } = req.body;
    
    const users = await loadUsers();
    if (users[userEmail]) {
      users[userEmail].banned = banned;
      saveUsers(users);
      
      res.json({ 
        message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
        user: {
          email: userEmail,
          banned: banned
        }
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Posts storage handled by storage module

// Get posts endpoint
app.get('/api/posts', async (req, res) => {
  try {
    let posts = await loadPosts();
    
    // If no posts exist, create some sample posts
    if (posts.length === 0) {
      posts = [
        {
          id: 1,
          user_name: 'Kael',
          user_email: 'kael@gmail.com',
          content: 'Just launched my new startup! Excited to share the journey with everyone. Building something amazing in the fintech space.',
          created_at: new Date().toISOString(),
          attachments: []
        },
        {
          id: 2,
          user_name: 'James',
          user_email: 'james@gmail.com',
          content: 'Looking for co-founders for my tech startup. Anyone interested in joining an AI-powered platform?',
          created_at: new Date().toISOString(),
          attachments: []
        },
        {
          id: 3,
          user_name: 'luther',
          user_email: 'jameslutherapaap14@gmail.com',
          content: 'Sharing some insights from my recent pitch to investors. The key is preparation and knowing your numbers!',
          created_at: new Date().toISOString(),
          attachments: []
        }
      ];
      await savePosts(posts);
    }
    
    // Load comments and attach them to posts
    const comments = await loadComments();
    console.log('Loaded comments:', comments.length);
    console.log('Comments by post_id:', comments.reduce((acc, c) => {
      acc[c.post_id] = (acc[c.post_id] || 0) + 1;
      return acc;
    }, {}));
    
    const postsWithComments = posts.map(post => ({
      ...post,
      comments: comments.filter(comment => comment.post_id === post.id)
    }));
    
    console.log('Posts with comments:', postsWithComments.map(p => ({ id: p.id, comments: p.comments.length })));
    res.json({ posts: postsWithComments });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new post endpoint
app.post('/api/posts', async (req, res) => {
  try {
    const { content, attachments = [], user_name, user_email } = req.body;
    
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Post content or attachments required' });
    }
    
    // Check if user is banned
    if (user_email) {
      const users = await loadUsers();
      const user = users[user_email];
      if (user && user.banned) {
        return res.status(403).json({ error: 'Your account has been banned. You cannot create posts.' });
      }
    }
    
    // Create new post
    const newPost = {
      id: Date.now(),
      user_name: user_name || 'Anonymous User',
      user_email: user_email || 'anonymous@example.com',
      content: content || '',
      attachments: attachments,
      created_at: new Date().toISOString(),
      comments: []
    };
    
    // Load existing posts and add new one
    const posts = await loadPosts();
    posts.unshift(newPost); // Add to beginning
    await savePosts(posts);
    
    res.json({ 
      message: 'Post created successfully',
      post: newPost
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comments endpoint for admin
app.get('/api/comments', async (req, res) => {
  try {
    const comments = await loadComments();
    res.json({ comments: comments });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to post
app.post('/api/comments/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, attachments = [], user_name, user_email } = req.body;
    
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Comment content or attachments required' });
    }
    
    // Check if user is banned
    if (user_email) {
      const users = await loadUsers();
      const user = users[user_email];
      if (user && user.banned) {
        return res.status(403).json({ error: 'Your account has been banned. You cannot create comments.' });
      }
    }
    
    // Create new comment
    const newComment = {
      id: Date.now(),
      post_id: parseInt(postId),
      user_name: user_name || 'Anonymous User',
      user_email: user_email || 'anonymous@example.com',
      content: content || '',
      attachments: attachments,
      created_at: new Date().toISOString()
    };
    
    // Load existing comments and add new one
    const comments = await loadComments();
    comments.push(newComment);
    await saveComments(comments);
    
    res.json({ 
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post endpoint
app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Load existing posts and remove the one with matching ID
    const posts = await loadPosts();
    const updatedPosts = posts.filter(post => post.id != postId);
    savePosts(updatedPosts);
    
    // Also delete all comments for this post
    const comments = await loadComments();
    const updatedComments = comments.filter(comment => comment.post_id != postId);
    await saveComments(updatedComments);
    
    res.json({ 
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment endpoint
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { email, isAdmin } = req.body || {};
    
    // Load existing comments
    const comments = await loadComments();
    const target = comments.find(c => c.id == commentId);
    if (!target) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only owner or admin can delete
    const isOwner = email && target.user_email === email;
    const allow = isOwner || !!isAdmin || (email === 'admin@startup.com');
    if (!allow) {
      return res.status(403).json({ error: 'Not allowed to delete this comment' });
    }

    const updatedComments = comments.filter(comment => comment.id != commentId);
    await saveComments(updatedComments);
    
    res.json({ 
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate demo tier endpoint
app.post('/api/activate-demo', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const users = await loadUsers();
    
    if (!users[email]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user tier to demo
    users[email].tier = 'demo';
    saveUsers(users);

    res.json({
      message: 'Demo tier activated successfully',
      user: {
        email: email,
        tier: 'demo'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upgrade to premium tier endpoint
app.post('/api/upgrade-premium', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const users = await loadUsers();
    
    if (!users[email]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user tier to premium
    users[email].tier = 'premium';
    saveUsers(users);

    res.json({
      message: 'Premium tier activated successfully',
      user: {
        email: email,
        tier: 'premium'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
  console.log(`🔗 API endpoints at http://localhost:${PORT}/api`);
  console.log(`🧪 Test database: http://localhost:${PORT}/api/test-db`);
});
