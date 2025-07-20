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

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const execAsync = promisify(exec);

// Session storage (in production, use Redis or database)
const sessions = new Map();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Session Authentication Middleware
const authenticateSession = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check if session is expired (24 hours)
  const session = sessions.get(token);
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.session = session;
  next();
};

// API Key Authentication Middleware (for backward compatibility)
const authenticateApiKey = (req, res, next) => {
  // First check for session token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token && sessions.has(token)) {
    const session = sessions.get(token);
    if (Date.now() - session.createdAt <= 24 * 60 * 60 * 1000) {
      req.session = session;
      return next();
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
  const { apiKey } = req.body;
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Generate session token
  const token = generateToken();
  const session = {
    token,
    createdAt: Date.now(),
    apiKey
  };
  
  sessions.set(token, session);
  
  res.json({ 
    success: true, 
    token,
    expiresIn: 86400 // 24 hours in seconds
  });
});

app.get('/api/auth/verify', authenticateSession, (req, res) => {
  res.json({ 
    success: true, 
    valid: true 
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token && sessions.has(token)) {
    sessions.delete(token);
  }
  
  res.json({ success: true });
});

// Serve main app page with auth check
app.get('/', (req, res) => {
  // Simply serve the index.html file
  // Authentication is handled client-side via JavaScript
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
      include: { transcript: true }
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
    
    // Delete will cascade to transcript due to relation
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`YouTube Video Analyzer server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
