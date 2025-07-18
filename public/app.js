// YouTube Video Analyzer - Frontend JavaScript

// Global state
let apiKey = localStorage.getItem('yva_api_key') || '';
let currentAnalysis = null;

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyButton = document.getElementById('saveApiKey');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const analyzeForm = document.getElementById('analyzeForm');
const videoUrlInput = document.getElementById('videoUrl');
const analyzeButton = document.getElementById('analyzeButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const videoMetadata = document.getElementById('videoMetadata');
const transcriptContent = document.getElementById('transcriptContent');
const errorMessage = document.getElementById('errorMessage');
const analysesList = document.getElementById('analysesList');
const copyJsonButton = document.getElementById('copyJson');
const downloadJsonButton = document.getElementById('downloadJson');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (apiKey) {
        apiKeyInput.value = apiKey;
        showApiKeyStatus('API key loaded from storage', 'success');
        loadPreviousAnalyses();
    }

    // Event listeners
    saveApiKeyButton.addEventListener('click', saveApiKey);
    analyzeForm.addEventListener('submit', handleAnalyze);
    copyJsonButton.addEventListener('click', copyToClipboard);
    downloadJsonButton.addEventListener('click', downloadJson);
});

// API Key Management
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        showApiKeyStatus('Please enter an API key', 'error');
        return;
    }

    apiKey = key;
    localStorage.setItem('yva_api_key', apiKey);
    showApiKeyStatus('API key saved', 'success');
    loadPreviousAnalyses();
}

function showApiKeyStatus(message, type) {
    apiKeyStatus.textContent = message;
    apiKeyStatus.className = `status-message ${type}`;
    setTimeout(() => {
        apiKeyStatus.textContent = '';
        apiKeyStatus.className = 'status-message';
    }, 3000);
}

// Video Analysis
async function handleAnalyze(e) {
    e.preventDefault();
    
    if (!apiKey) {
        showError('Please set your API key first');
        return;
    }

    const videoUrl = videoUrlInput.value.trim();
    if (!videoUrl) {
        showError('Please enter a YouTube video URL');
        return;
    }

    // Show loading
    showLoading(true);
    hideError();
    hideResults();

    try {
        const response = await fetch('/api/video/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({ url: videoUrl })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analysis failed');
        }

        const data = await response.json();
        currentAnalysis = data;
        displayResults(data);
        loadPreviousAnalyses();
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display Functions
function displayResults(data) {
    // Display video metadata
    videoMetadata.innerHTML = `
        <div class="metadata-item">
            <strong>Title:</strong> ${escapeHtml(data.title || 'N/A')}
        </div>
        <div class="metadata-item">
            <strong>Channel:</strong> ${escapeHtml(data.channel || 'N/A')}
        </div>
        <div class="metadata-item">
            <strong>Video ID:</strong> ${escapeHtml(data.videoId || 'N/A')}
        </div>
        <div class="metadata-item">
            <strong>Duration:</strong> ${formatDuration(data.metadata?.duration) || 'N/A'}
        </div>
    `;

    // Display transcript
    if (data.transcript && data.transcript.content) {
        transcriptContent.innerHTML = `
            <div class="transcript-text">
                ${escapeHtml(data.transcript.content)}
            </div>
        `;
    } else {
        transcriptContent.innerHTML = '<p class="no-transcript">No transcript available</p>';
    }

    showResults();
}

async function loadPreviousAnalyses() {
    if (!apiKey) return;

    try {
        const response = await fetch('/api/videos', {
            headers: {
                'X-API-Key': apiKey
            }
        });

        if (!response.ok) return;

        const analyses = await response.json();
        displayAnalysesList(analyses);
    } catch (error) {
        console.error('Failed to load previous analyses:', error);
    }
}

function displayAnalysesList(analyses) {
    if (!analyses || analyses.length === 0) {
        analysesList.innerHTML = '<p class="empty-state">No previous analyses found</p>';
        return;
    }

    analysesList.innerHTML = analyses.map(analysis => `
        <div class="analysis-item" data-id="${analysis.id}">
            <div class="analysis-info">
                <h4>${escapeHtml(analysis.title)}</h4>
                <p>${escapeHtml(analysis.channel)}</p>
                <small>${new Date(analysis.createdAt).toLocaleString()}</small>
            </div>
            <div class="analysis-actions">
                <button onclick="viewAnalysis(${analysis.id})">View</button>
                <button onclick="deleteAnalysis(${analysis.id})" class="delete-button">Delete</button>
            </div>
        </div>
    `).join('');
}

// Export Functions
function copyToClipboard() {
    if (!currentAnalysis) return;

    const jsonString = JSON.stringify(currentAnalysis, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        showError('Copied to clipboard!', 'success');
    }).catch(() => {
        showError('Failed to copy to clipboard');
    });
}

function downloadJson() {
    if (!currentAnalysis) return;

    const jsonString = JSON.stringify(currentAnalysis, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-analysis-${currentAnalysis.videoId || 'unknown'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Global Functions (for onclick handlers)
window.viewAnalysis = async function(id) {
    try {
        const response = await fetch(`/api/video/${id}`, {
            headers: {
                'X-API-Key': apiKey
            }
        });

        if (!response.ok) throw new Error('Failed to load analysis');

        const data = await response.json();
        currentAnalysis = data;
        displayResults(data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        showError(error.message);
    }
};

window.deleteAnalysis = async function(id) {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
        const response = await fetch(`/api/video/${id}`, {
            method: 'DELETE',
            headers: {
                'X-API-Key': apiKey
            }
        });

        if (!response.ok) throw new Error('Failed to delete analysis');

        loadPreviousAnalyses();
    } catch (error) {
        showError(error.message);
    }
};

// Utility Functions
function showLoading(show) {
    loadingIndicator.classList.toggle('hidden', !show);
    analyzeButton.disabled = show;
}

function showError(message, type = 'error') {
    errorMessage.textContent = message;
    errorMessage.className = `error-message ${type === 'success' ? 'success' : ''} ${type === 'error' ? '' : 'hidden'}`;
    if (type === 'success') {
        setTimeout(() => hideError(), 3000);
    }
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function showResults() {
    resultsSection.classList.remove('hidden');
}

function hideResults() {
    resultsSection.classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDuration(seconds) {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
