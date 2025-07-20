// YouTube To LLM - Enhanced Frontend JavaScript

// Global state
let authToken = localStorage.getItem('yva_auth_token') || '';
let apiKey = localStorage.getItem('yva_api_key') || '';
let currentAnalysis = null;
let currentPage = 1;
let totalVideos = 0;
let videosPerPage = 10;
let isAllAnalysesExpanded = false;

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
    
    // Add toggle button functionality
    const toggleButton = document.getElementById('toggleAllAnalyses');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleAllAnalyses);
    }
    
    // Add pagination controls
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    if (prevButton) {
        prevButton.addEventListener('click', () => changePage(-1));
    }
    if (nextButton) {
        nextButton.addEventListener('click', () => changePage(1));
    }
    
    // Add smooth transitions
    addSmoothTransitions();
});

// Check authentication status
async function checkAuth() {
    if (!authToken) {
        window.location.href = '/login';
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
            window.location.href = '/login';
            return;
        }
        
        // Load tags and previous analyses
        await loadTags();
        loadPreviousAnalyses();
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login';
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
        
        // Refresh the recent analyses list
        loadPreviousAnalyses();
        
        // Redirect to the video detail page after a short delay
        setTimeout(() => {
            window.location.href = `/video?id=${data.id}`;
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
        const response = await fetch('/api/videos?limit=5', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) return;
        
        const analyses = await response.json();
        recentVideos = analyses; // Store for tag management
        displayPreviousAnalyses(analyses);
        
    } catch (error) {
        console.error('Failed to load previous analyses:', error);
    }
}

// Load all analyses with pagination
async function loadAllAnalyses(page = 1) {
    try {
        const response = await fetch(`/api/videos?page=${page}&limit=${videosPerPage}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) return;
        
        const analyses = await response.json();
        allVideos = analyses; // Store for tag management
        displayAllAnalyses(analyses);
        
        // Update pagination state (assuming we'll need to calculate total from analyses length)
        // Since the API doesn't return total count, we'll check if we got a full page
        const hasMorePages = analyses.length === videosPerPage;
        updatePaginationControls(page, hasMorePages);
        
    } catch (error) {
        console.error('Failed to load all analyses:', error);
    }
}

// Toggle all analyses section
function toggleAllAnalyses() {
    const toggleButton = document.getElementById('toggleAllAnalyses');
    const content = document.getElementById('allAnalysesContent');
    const toggleText = toggleButton.querySelector('.toggle-text');
    
    isAllAnalysesExpanded = !isAllAnalysesExpanded;
    
    if (isAllAnalysesExpanded) {
        content.classList.remove('hidden');
        toggleButton.classList.add('expanded');
        toggleText.textContent = 'Hide All';
        loadAllAnalyses(currentPage);
    } else {
        content.classList.add('hidden');
        toggleButton.classList.remove('expanded');
        toggleText.textContent = 'Show All';
    }
}

// Change page
function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1) {
        currentPage = newPage;
        loadAllAnalyses(currentPage);
    }
}

// Update pagination controls
function updatePaginationControls(page, hasMore) {
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const paginationControls = document.getElementById('paginationControls');
    
    currentPage = page;
    
    // Update button states
    prevButton.disabled = page === 1;
    nextButton.disabled = !hasMore;
    
    // Update page info
    pageInfo.textContent = `Page ${page}`;
    
    // Show pagination controls if there are videos
    if (allVideos && allVideos.length > 0) {
        paginationControls.classList.remove('hidden');
    } else {
        paginationControls.classList.add('hidden');
    }
}

// Display all analyses
function displayAllAnalyses(analyses) {
    const allAnalysesList = document.getElementById('allAnalysesList');
    
    if (!analyses || analyses.length === 0) {
        allAnalysesList.innerHTML = '<p class="empty-state">No analyses found.</p>';
        return;
    }
    
    const html = analyses.map(analysis => `
        <div class="analysis-item" data-id="${analysis.id}">
            <div class="analysis-info">
                <h4>${escapeHtml(analysis.title || 'Untitled')}</h4>
                <p>${escapeHtml(analysis.channel || 'Unknown channel')}</p>
                <small>${formatDate(analysis.createdAt)}</small>
                ${analysis.tags && analysis.tags.length > 0 ? `
                    <div class="video-tags">
                        ${analysis.tags.map(vt => `
                            <span class="tag" ${vt.tag.color ? `style="background-color: ${vt.tag.color}; color: ${getContrastColor(vt.tag.color)}"` : ''}>
                                ${escapeHtml(vt.tag.name)}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="analysis-actions">
                <button onclick="viewAnalysis('${analysis.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View
                </button>
                <button class="tag-button" onclick="showTagPicker(${analysis.id})" title="Manage tags">
                    🏷️
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
    
    allAnalysesList.innerHTML = html;
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
                ${analysis.tags && analysis.tags.length > 0 ? `
                    <div class="video-tags">
                        ${analysis.tags.map(vt => `
                            <span class="tag" ${vt.tag.color ? `style="background-color: ${vt.tag.color}; color: ${getContrastColor(vt.tag.color)}"` : ''}>
                                ${escapeHtml(vt.tag.name)}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="analysis-actions">
                <button onclick="viewAnalysis('${analysis.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View
                </button>
                <button class="tag-button" onclick="showTagPicker(${analysis.id})" title="Manage tags">
                    🏷️
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
    window.location.href = `/video?id=${id}`;
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
        const items = document.querySelectorAll(`[data-id="${id}"]`);
        items.forEach(item => {
            item.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                item.remove();
                // Check if recent analyses list is empty
                if (analysesList.children.length === 0) {
                    analysesList.innerHTML = '<p class="empty-state">No analyses yet. Start by analyzing a YouTube video above.</p>';
                }
                // Check if all analyses list is empty
                const allAnalysesList = document.getElementById('allAnalysesList');
                if (allAnalysesList && allAnalysesList.children.length === 0) {
                    allAnalysesList.innerHTML = '<p class="empty-state">No analyses found.</p>';
                }
            }, 300);
        });
        
        // If we're viewing all analyses, we might need to reload the current page
        if (isAllAnalysesExpanded) {
            // Reload the current page after deletion animation completes
            setTimeout(() => {
                loadAllAnalyses(currentPage);
            }, 400);
        }
        
    } catch (error) {
        showError(error.message);
    }
}



// Handle logout
function handleLogout() {
    localStorage.removeItem('yva_auth_token');
    localStorage.removeItem('yva_api_key');
    window.location.href = '/login';
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

// Global variables for tags
let allTags = [];
let allVideos = [];
let recentVideos = [];

// Tag management functions

// Get contrast color for text on colored backgrounds
function getContrastColor(hexColor) {
    if (!hexColor) return '#333';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000' : '#fff';
}

// Load all tags
async function loadTags() {
    try {
        const response = await fetch('/api/tags', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });
        
        if (response.ok) {
            allTags = await response.json();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// Show tag picker modal
function showTagPicker(videoId) {
    // Look for video in both recent and all videos
    let video = allVideos.find(v => v.id === videoId) || recentVideos.find(v => v.id === videoId);
    if (!video) return;

    const currentTags = video.tags || [];
    const currentTagIds = new Set(currentTags.map(vt => vt.tag.id));

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Manage Tags for: ${escapeHtml(video.title)}</h3>
                <button onclick="closeModal()" class="close-button">×</button>
            </div>
            <div class="modal-body">
                <div class="tag-section">
                    <h4>Available Tags:</h4>
                    <div class="tag-list">
                        ${allTags.map(tag => `
                            <label class="tag-checkbox-label">
                                <input type="checkbox" 
                                       value="${tag.id}" 
                                       ${currentTagIds.has(tag.id) ? 'checked' : ''}
                                       onchange="toggleTagForVideo(${videoId}, ${tag.id}, this.checked)">
                                <span class="tag" ${tag.color ? `style="background-color: ${tag.color}; color: ${getContrastColor(tag.color)}"` : ''}>
                                    ${escapeHtml(tag.name)}
                                </span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="tag-section">
                    <h4>Create New Tag:</h4>
                    <div class="new-tag-form">
                        <input type="text" id="newTagName" placeholder="Tag name" maxlength="50">
                        <input type="color" id="newTagColor" value="#6c757d" title="Tag color">
                        <button onclick="createNewTag(${videoId})" class="primary-button">Create</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Toggle tag for video
async function toggleTagForVideo(videoId, tagId, isChecked) {
    try {
        if (isChecked) {
            // Add tag to video
            await fetch(`/api/video/${videoId}/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'X-API-Key': apiKey
                },
                body: JSON.stringify({ tagIds: [tagId] })
            });
        } else {
            // Remove tag from video
            await fetch(`/api/video/${videoId}/tags/${tagId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-API-Key': apiKey
                }
            });
        }

        // Refresh videos and tags to update UI
        await loadPreviousAnalyses();
        if (isAllAnalysesExpanded) {
            await loadAllAnalyses(currentPage);
        }
        await loadTags();
    } catch (error) {
        console.error('Error updating video tags:', error);
    }
}

// Create new tag
async function createNewTag(videoId) {
    const name = document.getElementById('newTagName').value.trim();
    const color = document.getElementById('newTagColor').value;

    if (!name) {
        alert('Please enter a tag name');
        return;
    }

    try {
        const response = await fetch('/api/tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            },
            body: JSON.stringify({ name, color })
        });

        if (response.ok) {
            const newTag = await response.json();
            await loadTags();
            
            // Add the new tag to the video
            await toggleTagForVideo(videoId, newTag.id, true);
            
            // Close modal
            closeModal();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to create tag');
        }
    } catch (error) {
        console.error('Error creating tag:', error);
        alert('Failed to create tag');
    }
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}
