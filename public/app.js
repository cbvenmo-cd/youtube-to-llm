// YouTube To LLM - Enhanced Frontend JavaScript

// Global state
let authToken = localStorage.getItem('yva_auth_token') || '';
let apiKey = localStorage.getItem('yva_api_key') || '';
let currentAnalysis = null;

// DOM Elements
const analyzeForm = document.getElementById('analyzeForm');
const videoUrlInput = document.getElementById('videoUrl');
const analyzeButton = document.getElementById('analyzeButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const analysesList = document.getElementById('analysesList');
const successMessage = document.getElementById('successMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Event listeners
    analyzeForm.addEventListener('submit', handleAnalyze);
    
    // Add logout button functionality if exists
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Add smooth transitions
    addSmoothTransitions();
});

// Check authentication status
async function checkAuth() {
    if (!authToken) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            localStorage.removeItem('yva_auth_token');
            window.location.href = '/login.html';
            return;
        }
        
        // Load previous analyses
        loadPreviousAnalyses();
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

// Handle video analysis
async function handleAnalyze(e) {
    e.preventDefault();
    
    const videoUrl = videoUrlInput.value.trim();
    if (!videoUrl) return;
    
    // UI feedback
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch('/api/video/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            },
            body: JSON.stringify({ url: videoUrl })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze video');
        }
        
        currentAnalysis = data;
        
        // Show success message
        showLoading(false);
        successMessage.classList.remove('hidden');
        
        // Redirect to the video detail page after a short delay
        setTimeout(() => {
            window.location.href = `/video.html?id=${data.id}`;
        }, 1500);
        
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}



// Load previous analyses
async function loadPreviousAnalyses() {
    try {
        const response = await fetch('/api/videos', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) return;
        
        const analyses = await response.json();
        displayPreviousAnalyses(analyses);
        
    } catch (error) {
        console.error('Failed to load previous analyses:', error);
    }
}

// Display previous analyses
function displayPreviousAnalyses(analyses) {
    if (!analyses || analyses.length === 0) {
        analysesList.innerHTML = '<p class="empty-state">No analyses yet. Start by analyzing a YouTube video above.</p>';
        return;
    }
    
    const html = analyses.map(analysis => `
        <div class="analysis-item" data-id="${analysis.id}">
            <div class="analysis-info">
                <h4>${escapeHtml(analysis.title || 'Untitled')}</h4>
                <p>${escapeHtml(analysis.channel || 'Unknown channel')}</p>
                <small>${formatDate(analysis.createdAt)}</small>
            </div>
            <div class="analysis-actions">
                <button onclick="viewAnalysis('${analysis.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View
                </button>
                <button class="delete-button" onclick="deleteAnalysis('${analysis.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
    
    analysesList.innerHTML = html;
}

// View analysis
function viewAnalysis(id) {
    // Navigate to the dedicated video detail page
    window.location.href = `/video.html?id=${id}`;
}

// Delete analysis
async function deleteAnalysis(id) {
    if (!confirm('Are you sure you want to delete this analysis?')) return;
    
    try {
        const response = await fetch(`/api/video/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete analysis');
        }
        
        // Remove from UI with animation
        const item = document.querySelector(`[data-id="${id}"]`);
        if (item) {
            item.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                item.remove();
                // Check if list is empty
                if (analysesList.children.length === 0) {
                    analysesList.innerHTML = '<p class="empty-state">No analyses yet. Start by analyzing a YouTube video above.</p>';
                }
            }, 300);
        }
        
    } catch (error) {
        showError(error.message);
    }
}



// Handle logout
function handleLogout() {
    localStorage.removeItem('yva_auth_token');
    localStorage.removeItem('yva_api_key');
    window.location.href = '/login.html';
}

// UI Helper Functions
function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analyzing...';
    } else {
        loadingIndicator.classList.add('hidden');
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
            </svg>
            Analyze Video
        `;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide after 5 seconds
    setTimeout(hideError, 5000);
}

function hideError() {
    errorMessage.classList.add('hidden');
}



// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration) {
    if (!duration) return null;
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    
    const hours = (match[1] || '').replace('H', '') || 0;
    const minutes = (match[2] || '').replace('M', '') || 0;
    const seconds = (match[3] || '').replace('S', '') || 0;
    
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

function formatDuration(seconds) {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
}

function formatNumber(num) {
    if (!num) return null;
    return new Intl.NumberFormat().format(num);
}

function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Add smooth transitions
function addSmoothTransitions() {
    // Add hover effects to all buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add focus effects to inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(-20px);
        }
    }
`;
document.head.appendChild(style);
