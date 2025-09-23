const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'registered-users.json');
const postsFile = path.join(__dirname, 'posts.json');
const commentsFile = path.join(__dirname, 'comments.json');

let mongoClient = null;
let db = null;
let collections = { users: null, posts: null, comments: null };

async function connectMongoIfAvailable() {
  const uri = process.env.MONGODB_URI || '';
  if (!uri) {
    return { mode: 'file' };
  }
  const { MongoClient } = require('mongodb');
  mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await mongoClient.connect();
  const dbName = process.env.MONGODB_DB || 'startup_app';
  db = mongoClient.db(dbName);
  collections.users = db.collection('users');
  collections.posts = db.collection('posts');
  collections.comments = db.collection('comments');
  await collections.users.createIndex({ email: 1 }, { unique: true });
  await collections.posts.createIndex({ id: 1 }, { unique: true });
  await collections.comments.createIndex({ id: 1 }, { unique: true });

  // Seed from JSON files if collections are empty
  const usersCount = await collections.users.estimatedDocumentCount();
  if (usersCount === 0 && fs.existsSync(usersFile)) {
    try {
      const usersObj = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      const users = Object.values(usersObj);
      if (users.length) await collections.users.insertMany(users, { ordered: false });
    } catch (_) {}
  }
  const postsCount = await collections.posts.estimatedDocumentCount();
  if (postsCount === 0 && fs.existsSync(postsFile)) {
    try {
      const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
      if (Array.isArray(posts) && posts.length) await collections.posts.insertMany(posts, { ordered: false });
    } catch (_) {}
  }
  const commentsCount = await collections.comments.estimatedDocumentCount();
  if (commentsCount === 0 && fs.existsSync(commentsFile)) {
    try {
      const comments = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
      if (Array.isArray(comments) && comments.length) await collections.comments.insertMany(comments, { ordered: false });
    } catch (_) {}
  }
  return { mode: 'mongo' };
}

const state = { mode: 'file', ready: false };

(async () => {
  try {
    const res = await connectMongoIfAvailable();
    state.mode = res.mode;
  } catch (e) {
    state.mode = 'file';
  } finally {
    state.ready = true;
  }
})();

// USERS
async function loadUsers() {
  if (state.mode === 'mongo') {
    const list = await collections.users.find({}).toArray();
    const obj = {};
    for (const u of list) obj[u.email] = u;
    return obj;
  }
  if (fs.existsSync(usersFile)) {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  }
  return {};
}

async function saveUsers(users) {
  if (state.mode === 'mongo') {
    const bulk = collections.users.initializeUnorderedBulkOp();
    for (const [email, user] of Object.entries(users)) {
      bulk.find({ email }).upsert().updateOne({ $set: user });
    }
    await bulk.execute();
    return;
  }
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// POSTS
async function loadPosts() {
  if (state.mode === 'mongo') {
    const list = await collections.posts.find({}).sort({ created_at: -1 }).toArray();
    return list;
  }
  if (fs.existsSync(postsFile)) {
    return JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  }
  return [];
}

async function savePosts(posts) {
  if (state.mode === 'mongo') {
    // Replace all posts (simple approach matching file behavior)
    await collections.posts.deleteMany({});
    if (posts.length) await collections.posts.insertMany(posts);
    return;
  }
  fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
}

// COMMENTS
async function loadComments() {
  if (state.mode === 'mongo') {
    const list = await collections.comments.find({}).toArray();
    return list;
  }
  if (fs.existsSync(commentsFile)) {
    return JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
  }
  return [];
}

async function saveComments(comments) {
  if (state.mode === 'mongo') {
    await collections.comments.deleteMany({});
    if (comments.length) await collections.comments.insertMany(comments);
    return;
  }
  fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2));
}

module.exports = {
  state,
  loadUsers,
  saveUsers,
  loadPosts,
  savePosts,
  loadComments,
  saveComments
};


