# MySQL Workbench Setup

## 🗄️ Database Setup with MySQL Workbench

### 1. Install MySQL Workbench
- Download from: https://dev.mysql.com/downloads/workbench/
- Install and open MySQL Workbench

### 2. Create Database Connection
1. Click "+" to create new connection
2. Set connection name: "Start Up App"
3. Set hostname: `localhost`
4. Set port: `3306`
5. Set username: `root`
6. Set password: your MySQL password
7. Click "Test Connection" then "OK"

### 3. Run Database Schema
1. Open the connection you just created
2. Go to File → Open SQL Script
3. Select `database/schema.sql`
4. Click the lightning bolt (⚡) to execute
5. Refresh the schema to see your tables

### 4. Start Backend Server
```bash
cd prototype/backend
npm install
npm start
```

### 5. Access Your App
- Frontend: http://localhost:3000
- API: http://localhost:3000/api/health

## 📊 Database Tables Created:
- **users** - User accounts and profiles
- **posts** - Community posts
- **comments** - Comments on posts
- **post_likes** - Post likes
- **comment_likes** - Comment likes

## 🔧 Configuration:
Edit `config.env` with your MySQL credentials before starting the server.