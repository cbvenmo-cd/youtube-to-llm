// YouTube To LLM - Main Server
// This file will contain all the Express server logic, API endpoints, and integrations

const dns = require('dns');
// Force IPv4 resolution for Supabase compatibility
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Detect environment and force production mode on Fly.io
const isProduction = process.env.NODE_ENV === 'production';
const isFlyDeployment = process.env.FLY_APP_NAME || process.env.FLY_DEPLOY === 'true';
const AUTH_MODE = isFlyDeployment ? 'production' : (process.env.AUTH_MODE || 'production');
const SESSION_DURATION_DAYS = parseInt(process.env.SESSION_DURATION_DAYS || '90');
const ALLOW_MODE_SWITCHING = process.env.ALLOW_MODE_SWITCHING === 'true' && !isFlyDeployment;

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const execAsync = promisify(exec);

// Session storage (in production, use Redis or database)
const sessions = new Map();

// Middleware
app.use(express.json());

// Custom static file serving to handle clean URLs
app.use(express.static('public', {
  extensions: ['html'],
  index: false  // We'll handle index routing ourselves
}));

// Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Development Mode Middleware
const devModeMiddleware = (req, res, next) => {
  req.session = {
    mock: true,
    mode: 'development',
    createdAt: Date.now(),
    userAgent: req.headers['user-agent'],
    deviceInfo: 'Development Mode'
  };
  console.log(`[DEV MODE] ${req.method} ${req.path} - auth bypassed`);
  next();
};

// Session Authentication Middleware
const authenticateSession = (req, res, next) => {
  // Skip authentication in development mode
  if (AUTH_MODE === 'development') {
    req.session = { mock: true, mode: 'development' };
    console.log(`[DEV MODE] Request to ${req.path} - auth bypassed`);
    return next();
  }

  // Check for cookie first, then Authorization header
  const cookieToken = req.headers.cookie?.split('; ')
    .find(row => row.startsWith('yva_session='))
    ?.split('=')[1];
  
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const token = cookieToken || headerToken;
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get session and check expiration
  const session = sessions.get(token);
  
  // Use expiresAt if available, otherwise calculate from createdAt
  if (session.expiresAt) {
    // Add 5 minute grace period for recently expired tokens
    const graceTime = 5 * 60 * 1000;
    if (Date.now() > session.expiresAt + graceTime) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Session expired' });
    }
  } else {
    // Legacy check for sessions without expiresAt
    const sessionDurationMs = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - session.createdAt > sessionDurationMs) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Session expired' });
    }
  }
  
  // Update last activity
  session.lastActivityAt = Date.now();
  
  req.session = session;
  next();
};

// API Key Authentication Middleware (for backward compatibility)
const authenticateApiKey = (req, res, next) => {
  // Skip authentication in development mode
  if (AUTH_MODE === 'development') {
    req.session = { mock: true, mode: 'development' };
    console.log(`[DEV MODE] Request to ${req.path} - auth bypassed`);
    return next();
  }

  // Check for cookie first, then Authorization header
  const cookieToken = req.headers.cookie?.split('; ')
    .find(row => row.startsWith('yva_session='))
    ?.split('=')[1];
  
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const token = cookieToken || headerToken;
  
  if (token && sessions.has(token)) {
    const session = sessions.get(token);
    
    // Check expiration
    if (session.expiresAt) {
      const graceTime = 5 * 60 * 1000;
      if (Date.now() <= session.expiresAt + graceTime) {
        session.lastActivityAt = Date.now();
        req.session = session;
        return next();
      }
    } else {
      // Legacy check
      const sessionDurationMs = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - session.createdAt <= sessionDurationMs) {
        session.lastActivityAt = Date.now();
        req.session = session;
        return next();
      }
    }
  }
  
  // Fall back to API key authentication
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Helper Functions

// Extract video ID from YouTube URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Fetch video metadata from YouTube API
async function getYouTubeMetadata(videoId) {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: process.env.YOUTUBE_API_KEY,
        id: videoId,
        part: 'snippet,contentDetails,statistics'
      }
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const video = response.data.items[0];
    return {
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      duration: parseDuration(video.contentDetails.duration),
      viewCount: parseInt(video.statistics.viewCount),
      likeCount: parseInt(video.statistics.likeCount),
      thumbnails: video.snippet.thumbnails,
      raw: video
    };
  } catch (error) {
    console.error('YouTube API error:', error.response?.data || error.message);
    throw new Error('Failed to fetch video metadata');
  }
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = (match[1] || '').replace('H', '') || 0;
  const minutes = (match[2] || '').replace('M', '') || 0;
  const seconds = (match[3] || '').replace('S', '') || 0;
  
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

// Get transcript using yt-dlp
async function getTranscript(videoUrl, videoId) {
  const tempDir = '/tmp';
  const timestamp = Date.now();
  const outputTemplate = path.join(tempDir, `yva_${videoId}_${timestamp}`);
  
  try {
    // Execute yt-dlp to download subtitles
    const command = `yt-dlp --write-auto-subs --skip-download --sub-format json3 --output "${outputTemplate}" "${videoUrl}"`;
    
    console.log('Executing yt-dlp command...');
    console.log('Command:', command);
    
    const { stdout, stderr } = await execAsync(command, { timeout: 60000 }); // 60 second timeout
    
    console.log('yt-dlp stdout:', stdout);
    if (stderr) {
      console.log('yt-dlp stderr:', stderr);
    }
    
    // Find the generated subtitle file - it will have language code (e.g., .en.json3)
    const files = await fs.readdir(tempDir);
    const baseFilename = path.basename(outputTemplate);
    const subtitleFile = files.find(f => f.startsWith(baseFilename) && f.endsWith('.json3'));
    
    console.log('Looking for files starting with:', baseFilename);
    console.log('Found files:', files.filter(f => f.includes(baseFilename)));
    
    if (!subtitleFile) {
      console.log('No subtitle file found. All files in temp:', files.filter(f => f.includes(videoId)));
      return null;
    }
    
    console.log('Found subtitle file:', subtitleFile);
    
    // Read and parse the subtitle file
    const subtitlePath = path.join(tempDir, subtitleFile);
    const subtitleData = await fs.readFile(subtitlePath, 'utf8');
    
    console.log('Subtitle file size:', subtitleData.length, 'bytes');
    
    // Extract language code from filename (e.g., .en.json3 -> en)
    const langMatch = subtitleFile.match(/\.([a-z]{2}(?:-[A-Z]{2})?)\.json3$/);
    const language = langMatch ? langMatch[1] : 'en';
    
    let transcript = '';
    
    try {
      // Parse as a single JSON object
      const data = JSON.parse(subtitleData);
      
      if (data.wireMagic && data.events) {
        console.log('Found YouTube JSON3 format with', data.events.length, 'events');
        
        // Process each event
        for (const event of data.events) {
          if (event.segs) {
            // Extract text from segments
            const text = event.segs
              .map(seg => seg.utf8 || '')
              .join('')
              .trim();
            if (text && text !== '\n') {
              transcript += text + ' ';
            }
          }
        }
      } else {
        console.log('Unexpected JSON3 structure');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON3:', parseError.message);
      
      // Try alternative parsing for line-by-line JSON
      const lines = subtitleData.trim().split('\n');
      console.log('Trying line-by-line parsing with', lines.length, 'lines');
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.segs) {
            const text = data.segs
              .map(seg => seg.utf8 || '')
              .join('')
              .trim();
            if (text && text !== '\n') {
              transcript += text + ' ';
            }
          }
        } catch (e) {
          // Skip invalid lines
        }
      }
    }
    
    // Clean up temporary files
    try {
      await fs.unlink(subtitlePath);
      console.log('Cleaned up subtitle file');
    } catch (error) {
      console.error('Error cleaning up subtitle file:', error);
    }
    
    const finalTranscript = transcript.trim();
    console.log(`Transcript extracted: ${finalTranscript.length} characters`);
    console.log('First 200 chars of transcript:', finalTranscript.substring(0, 200));
    
    return {
      content: finalTranscript,
      language
    };
  } catch (error) {
    console.error('Transcript extraction error:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

// Authentication Routes
app.post('/api/auth/login', (req, res) => {
  const { apiKey, rememberMe = true } = req.body;
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Calculate session duration based on remember me
  const sessionDays = rememberMe ? SESSION_DURATION_DAYS : 1;
  const sessionDurationMs = sessionDays * 24 * 60 * 60 * 1000;
  
  // Generate session token
  const token = generateToken();
  const now = Date.now();
  
  const session = {
    token,
    createdAt: now,
    expiresAt: now + sessionDurationMs,
    lastActivityAt: now,
    rememberMe,
    apiKey,
    userAgent: req.headers['user-agent'],
    createdFrom: req.ip || req.connection.remoteAddress
  };
  
  sessions.set(token, session);
  
  // Set cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction || isFlyDeployment,
    sameSite: 'lax',
    maxAge: sessionDurationMs,
    path: '/'
  };
  
  // Set session cookie
  res.cookie('yva_session', token, cookieOptions);
  
  res.json({ 
    success: true, 
    token,
    expiresIn: sessionDays * 24 * 60 * 60, // Convert days to seconds
    sessionDays
  });
});

app.get('/api/auth/verify', authenticateSession, (req, res) => {
  res.json({ 
    success: true, 
    valid: true 
  });
});

app.post('/api/auth/logout', (req, res) => {
  // Check for token in cookie or header
  const cookieToken = req.headers.cookie?.split('; ')
    .find(row => row.startsWith('yva_session='))
    ?.split('=')[1];
  
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const token = cookieToken || headerToken;
  
  if (token && sessions.has(token)) {
    sessions.delete(token);
  }
  
  // Clear cookie
  res.cookie('yva_session', '', {
    httpOnly: true,
    secure: isProduction || isFlyDeployment,
    sameSite: 'lax',
    expires: new Date(0),
    path: '/'
  });
  
  res.json({ success: true });
});

// Refresh session endpoint
app.post('/api/auth/refresh', authenticateSession, (req, res) => {
  const session = req.session;
  
  if (!session || session.mock) {
    return res.status(401).json({ error: 'No valid session to refresh' });
  }
  
  // Calculate new expiration
  const sessionDays = session.rememberMe ? SESSION_DURATION_DAYS : 1;
  const sessionDurationMs = sessionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  // Update session
  session.expiresAt = now + sessionDurationMs;
  session.lastActivityAt = now;
  
  // Update cookie
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction || isFlyDeployment,
    sameSite: 'lax',
    maxAge: sessionDurationMs,
    path: '/'
  };
  
  res.cookie('yva_session', session.token, cookieOptions);
  
  res.json({
    success: true,
    expiresAt: session.expiresAt,
    sessionDays
  });
});

// Get session info endpoint
app.get('/api/auth/session-info', authenticateSession, (req, res) => {
  const session = req.session;
  
  if (!session || session.mock) {
    return res.json({
      mode: 'development',
      mock: true
    });
  }
  
  const now = Date.now();
  const sessionAge = now - session.createdAt;
  const timeRemaining = session.expiresAt - now;
  
  res.json({
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastActivityAt: session.lastActivityAt,
    sessionAge: Math.floor(sessionAge / 1000), // seconds
    timeRemaining: Math.floor(timeRemaining / 1000), // seconds
    rememberMe: session.rememberMe,
    userAgent: session.userAgent,
    createdFrom: session.createdFrom
  });
});

// Get current authentication mode
app.get('/api/auth/mode', (req, res) => {
  res.json({
    mode: AUTH_MODE,
    environment: isFlyDeployment ? 'production' : 'local',
    modeSwitchingAllowed: ALLOW_MODE_SWITCHING,
    sessionDurationDays: SESSION_DURATION_DAYS,
    isFlyDeployment,
    nodeEnv: process.env.NODE_ENV
  });
});

// HTML Page Routes (clean URLs without .html extension)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/video', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'video.html'));
});

app.get('/video/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'video.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Redirect old .html URLs to clean URLs
app.get('/login.html', (req, res) => {
  res.redirect(301, '/login');
});

app.get('/video.html', (req, res) => {
  res.redirect(301, '/video');
});

app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/settings.html', (req, res) => {
  res.redirect(301, '/settings');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post('/api/video/analyze', authenticateApiKey, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    // Check if analysis already exists
    const existingAnalysis = await prisma.videoAnalysis.findUnique({
      where: { videoId },
      include: { transcript: true }
    });
    
    if (existingAnalysis) {
      return res.json(existingAnalysis);
    }
    
    // Fetch metadata from YouTube
    console.log('Fetching YouTube metadata for:', videoId);
    const metadata = await getYouTubeMetadata(videoId);
    
    // Get transcript
    console.log('Extracting transcript...');
    const transcriptData = await getTranscript(url, videoId);
    
    // Store in database
    const analysis = await prisma.videoAnalysis.create({
      data: {
        url,
        videoId,
        title: metadata.title,
        channel: metadata.channel,
        metadata: metadata.raw,
        transcript: transcriptData ? {
          create: {
            content: transcriptData.content,
            language: transcriptData.language
          }
        } : undefined
      },
      include: {
        transcript: true
      }
    });
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get video by ID
app.get('/api/video/:id', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await prisma.videoAnalysis.findUnique({
      where: { id: parseInt(id) },
      include: { 
        transcript: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all videos
app.get('/api/videos', authenticateApiKey, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const analyses = await prisma.videoAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        transcript: {
          select: {
            id: true,
            language: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    // Return as array for frontend compatibility
    res.json(analyses);
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete video
app.delete('/api/video/:id', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete will cascade to transcript and tags due to relation
    await prisma.videoAnalysis.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tag Management Routes

// Get all tags
app.get('/api/tags', authenticateApiKey, async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { videos: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create a new tag
app.post('/api/tags', authenticateApiKey, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Validate color if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Invalid color format. Use hex format like #FF5733' });
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || null
      }
    });

    res.json(tag);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update a tag
app.put('/api/tags/:id', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Invalid color format. Use hex format like #FF5733' });
    }

    const tag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(color !== undefined && { color: color || null })
      }
    });

    res.json(tag);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete a tag
app.delete('/api/tags/:id', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.tag.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Add tags to a video
app.post('/api/video/:id/tags', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body;

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds must be an array' });
    }

    // Create video-tag relationships
    const videoTags = await Promise.all(
      tagIds.map(tagId => 
        prisma.videoTag.create({
          data: {
            videoAnalysisId: parseInt(id),
            tagId: parseInt(tagId)
          }
        }).catch(err => {
          if (err.code === 'P2002') {
            // Tag already assigned, ignore
            return null;
          }
          throw err;
        })
      )
    );

    // Return updated video with tags
    const video = await prisma.videoAnalysis.findUnique({
      where: { id: parseInt(id) },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    res.json(video);
  } catch (error) {
    console.error('Error adding tags to video:', error);
    res.status(500).json({ error: 'Failed to add tags to video' });
  }
});

// Remove tag from video
app.delete('/api/video/:videoId/tags/:tagId', authenticateApiKey, async (req, res) => {
  try {
    const { videoId, tagId } = req.params;

    await prisma.videoTag.deleteMany({
      where: {
        videoAnalysisId: parseInt(videoId),
        tagId: parseInt(tagId)
      }
    });

    res.json({ message: 'Tag removed from video successfully' });
  } catch (error) {
    console.error('Error removing tag from video:', error);
    res.status(500).json({ error: 'Failed to remove tag from video' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`YouTube Video Analyzer server running on port ${PORT}`);
  console.log('===========================================');
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`AUTH_MODE: ${AUTH_MODE}`);
  console.log(`Session Duration: ${SESSION_DURATION_DAYS} days`);
  console.log(`Mode Switching: ${ALLOW_MODE_SWITCHING ? 'enabled' : 'disabled'}`);
  console.log(`Fly.io Deployment: ${isFlyDeployment ? 'yes' : 'no'}`);
  
  if (AUTH_MODE === 'development') {
    console.log('\n⚠️  WARNING: Running in DEVELOPMENT MODE');
    console.log('⚠️  Authentication is DISABLED');
    console.log('⚠️  This mode should NEVER be deployed to production\n');
  }
  console.log('===========================================');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
