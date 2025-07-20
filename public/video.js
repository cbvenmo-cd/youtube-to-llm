// Video Detail Page JavaScript

// Global state
let authToken = localStorage.getItem('yva_auth_token') || '';
let apiKey = localStorage.getItem('yva_api_key') || '';
let currentVideo = null;
let charts = {};

// Common words to exclude from frequency analysis
const STOP_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 
    'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from',
    'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
    'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
    'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
    'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
    'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
    'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'getting', 'made', 'being'
]);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!authToken) {
        window.location.href = '/login.html';
        return;
    }
    
    // Get video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');
    
    if (!videoId) {
        window.location.href = '/';
        return;
    }
    
    // Event listeners
    setupEventListeners();
    
    // Load video data
    await loadVideoData(videoId);
});

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = '/';
    });
    
    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.removeItem('yva_auth_token');
        localStorage.removeItem('yva_api_key');
        window.location.href = '/login.html';
    });
    
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Description toggle
    document.getElementById('toggleDescription').addEventListener('click', (e) => {
        const description = document.getElementById('videoDescription');
        const button = e.currentTarget;
        
        if (description.classList.contains('expanded')) {
            description.classList.remove('expanded');
            button.textContent = 'Show more';
        } else {
            description.classList.add('expanded');
            button.textContent = 'Show less';
        }
    });
    
    // Transcript search
    document.getElementById('transcriptSearch').addEventListener('input', (e) => {
        highlightSearchTerms(e.target.value);
    });
    
    // Copy transcript
    document.getElementById('copyTranscript').addEventListener('click', copyTranscript);
    
    // Export buttons
    document.getElementById('exportJson').addEventListener('click', exportJson);
    document.getElementById('exportTranscript').addEventListener('click', exportTranscript);
    document.getElementById('exportMarkdown').addEventListener('click', exportMarkdown);
    document.getElementById('shareLink').addEventListener('click', shareLink);
}

// Load video data
async function loadVideoData(videoId) {
    try {
        const response = await fetch(`/api/video/${videoId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load video data');
        }
        
        currentVideo = await response.json();
        
        // Hide loading state and show content
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        
        // Populate data
        populateVideoData();
        
    } catch (error) {
        console.error('Error loading video:', error);
        alert('Failed to load video data. Redirecting to home...');
        window.location.href = '/';
    }
}

// Populate video data
function populateVideoData() {
    const metadata = currentVideo.metadata || {};
    const snippet = metadata.snippet || {};
    const statistics = metadata.statistics || {};
    const contentDetails = metadata.contentDetails || {};
    
    // Set thumbnail
    const thumbnail = snippet.thumbnails?.maxres || snippet.thumbnails?.high || snippet.thumbnails?.medium;
    if (thumbnail) {
        document.getElementById('videoThumbnail').src = thumbnail.url;
    }
    
    // Set play button link
    document.getElementById('playButton').href = currentVideo.url;
    
    // Set title and channel
    document.getElementById('videoTitle').textContent = currentVideo.title;
    document.getElementById('channelName').textContent = currentVideo.channel;
    
    // Set channel avatar (first letter of channel name)
    const avatarElement = document.getElementById('channelAvatar');
    avatarElement.textContent = currentVideo.channel.charAt(0).toUpperCase();
    
    // Set publish date
    document.getElementById('publishDate').textContent = `Published ${formatDate(snippet.publishedAt)}`;
    
    // Set statistics
    document.getElementById('viewCount').textContent = formatNumber(statistics.viewCount);
    document.getElementById('likeCount').textContent = formatNumber(statistics.likeCount);
    document.getElementById('commentCount').textContent = formatNumber(statistics.commentCount);
    document.getElementById('duration').textContent = formatDuration(parseDuration(contentDetails.duration));
    
    // Set description
    const description = snippet.description || 'No description available';
    document.getElementById('videoDescription').innerHTML = linkifyText(escapeHtml(description));
    
    // Check if description needs toggle button
    const descriptionElement = document.getElementById('videoDescription');
    if (descriptionElement.scrollHeight <= 200) {
        document.getElementById('toggleDescription').style.display = 'none';
    }
    
    // Set tags
    const tags = snippet.tags || [];
    const tagsHtml = tags.slice(0, 10).map(tag => 
        `<span class="tag">${escapeHtml(tag)}</span>`
    ).join('');
    document.getElementById('videoTags').innerHTML = tagsHtml || '<p class="text-muted">No tags available</p>';
    
    // Set quick stats
    if (currentVideo.transcript) {
        const wordCount = currentVideo.transcript.content.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
        
        document.getElementById('wordCount').textContent = formatNumber(wordCount);
        document.getElementById('readingTime').textContent = `${readingTime} min`;
        document.getElementById('language').textContent = currentVideo.transcript.language?.toUpperCase() || 'EN';
        
        // Populate transcript
        populateTranscript();
        
        // Generate analytics
        generateAnalytics();
    } else {
        document.getElementById('wordCount').textContent = '0';
        document.getElementById('readingTime').textContent = '0 min';
        document.getElementById('language').textContent = 'N/A';
        document.getElementById('transcriptContent').innerHTML = '<p class="text-muted">No transcript available for this video</p>';
    }
    
    document.getElementById('analyzedDate').textContent = formatDate(currentVideo.createdAt);
}

// Populate transcript
function populateTranscript() {
    if (!currentVideo.transcript) return;
    
    const content = currentVideo.transcript.content;
    const paragraphs = splitIntoParagraphs(content);
    
    const html = paragraphs.map(para => `<p>${escapeHtml(para)}</p>`).join('');
    document.getElementById('transcriptContent').innerHTML = html;
}

// Split text into paragraphs
function splitIntoParagraphs(text) {
    // Split by common paragraph indicators
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const paragraphs = [];
    let currentParagraph = '';
    
    sentences.forEach((sentence, index) => {
        currentParagraph += sentence.trim() + ' ';
        
        // Create new paragraph every 3-5 sentences or at natural breaks
        if ((index + 1) % 4 === 0 || index === sentences.length - 1) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = '';
        }
    });
    
    return paragraphs.filter(p => p.length > 0);
}

// Generate analytics
function generateAnalytics() {
    if (!currentVideo.transcript) return;
    
    const text = currentVideo.transcript.content;
    
    // Text statistics
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const uniqueWords = new Set(words);
    const sentences = text.match(/[.!?]+/g) || [];
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const lexicalDiversity = (uniqueWords.size / words.length) * 100;
    
    document.getElementById('uniqueWords').textContent = formatNumber(uniqueWords.size);
    document.getElementById('avgWordLength').textContent = avgWordLength.toFixed(1);
    document.getElementById('sentenceCount').textContent = formatNumber(sentences.length);
    document.getElementById('lexicalDiversity').textContent = lexicalDiversity.toFixed(1) + '%';
    
    // Word frequency analysis
    const wordFrequency = {};
    words.forEach(word => {
        if (!STOP_WORDS.has(word) && word.length > 3) {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
    });
    
    // Get top 10 words
    const topWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    // Create word frequency chart
    createWordFrequencyChart(topWords);
    
    // Create engagement chart
    createEngagementChart();
}

// Create word frequency chart
function createWordFrequencyChart(topWords) {
    const ctx = document.getElementById('wordFrequencyChart').getContext('2d');
    
    if (charts.wordFrequency) {
        charts.wordFrequency.destroy();
    }
    
    charts.wordFrequency = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topWords.map(([word]) => word),
            datasets: [{
                label: 'Frequency',
                data: topWords.map(([, count]) => count),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(148, 163, 184, 0.8)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(148, 163, 184, 0.8)'
                    }
                }
            }
        }
    });
}

// Create engagement chart
function createEngagementChart() {
    const ctx = document.getElementById('engagementChart').getContext('2d');
    
    const statistics = currentVideo.metadata?.statistics || {};
    const views = parseInt(statistics.viewCount) || 1;
    const likes = parseInt(statistics.likeCount) || 0;
    const comments = parseInt(statistics.commentCount) || 0;
    
    const engagementRate = ((likes + comments) / views * 100).toFixed(2);
    
    if (charts.engagement) {
        charts.engagement.destroy();
    }
    
    charts.engagement = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Engaged', 'Views Only'],
            datasets: [{
                data: [likes + comments, views - likes - comments],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(148, 163, 184, 0.3)'
                ],
                borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(148, 163, 184, 0.5)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(148, 163, 184, 0.8)'
                    }
                },
                title: {
                    display: true,
                    text: `Engagement Rate: ${engagementRate}%`,
                    color: 'rgba(241, 245, 249, 0.9)',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Switch tabs
function switchTab(tabName) {
    // Update button states
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });
    
    // Update panel visibility
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}Tab`);
    });
}

// Highlight search terms in transcript
function highlightSearchTerms(searchTerm) {
    const content = document.getElementById('transcriptContent');
    const paragraphs = content.querySelectorAll('p');
    
    if (!searchTerm) {
        // Remove all highlights
        paragraphs.forEach(p => {
            p.innerHTML = escapeHtml(p.textContent);
        });
        return;
    }
    
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    
    paragraphs.forEach(p => {
        const text = p.textContent;
        const highlighted = text.replace(regex, '<span class="highlight">$1</span>');
        p.innerHTML = highlighted;
    });
}

// Copy transcript
async function copyTranscript() {
    if (!currentVideo.transcript) return;
    
    try {
        await navigator.clipboard.writeText(currentVideo.transcript.content);
        
        const button = document.getElementById('copyTranscript');
        const originalText = button.innerHTML;
        
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copied!
        `;
        
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
        
    } catch (error) {
        alert('Failed to copy transcript');
    }
}

// Export functions
function exportJson() {
    const jsonString = JSON.stringify(currentVideo, null, 2);
    downloadFile(jsonString, `video-analysis-${currentVideo.videoId}.json`, 'application/json');
}

function exportTranscript() {
    if (!currentVideo.transcript) {
        alert('No transcript available');
        return;
    }
    
    const content = `${currentVideo.title}\n${currentVideo.channel}\n${currentVideo.url}\n\n${currentVideo.transcript.content}`;
    downloadFile(content, `transcript-${currentVideo.videoId}.txt`, 'text/plain');
}

function exportMarkdown() {
    const metadata = currentVideo.metadata || {};
    const statistics = metadata.statistics || {};
    
    let markdown = `# ${currentVideo.title}\n\n`;
    markdown += `**Channel:** ${currentVideo.channel}\n\n`;
    markdown += `**URL:** ${currentVideo.url}\n\n`;
    markdown += `**Published:** ${formatDate(metadata.snippet?.publishedAt)}\n\n`;
    markdown += `## Statistics\n\n`;
    markdown += `- **Views:** ${formatNumber(statistics.viewCount)}\n`;
    markdown += `- **Likes:** ${formatNumber(statistics.likeCount)}\n`;
    markdown += `- **Comments:** ${formatNumber(statistics.commentCount)}\n\n`;
    
    if (currentVideo.transcript) {
        markdown += `## Transcript\n\n${currentVideo.transcript.content}\n`;
    }
    
    downloadFile(markdown, `video-analysis-${currentVideo.videoId}.md`, 'text/markdown');
}

async function shareLink() {
    const shareUrl = window.location.href;
    
    try {
        await navigator.clipboard.writeText(shareUrl);
        
        const button = document.getElementById('shareLink');
        const originalText = button.innerHTML;
        
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Link Copied!
        `;
        
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
        
    } catch (error) {
        alert('Failed to copy link');
    }
}

// Utility functions
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function linkifyText(text) {
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function parseDuration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    
    const hours = (match[1] || '').replace('H', '') || 0;
    const minutes = (match[2] || '').replace('M', '') || 0;
    const seconds = (match[3] || '').replace('S', '') || 0;
    
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat().format(num);
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
