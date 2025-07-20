// YouTube To LLM - Settings Page JavaScript

// Global state
let authToken = localStorage.getItem('yva_auth_token') || '';
let apiKey = localStorage.getItem('yva_api_key') || '';
let allTags = [];
let allVideos = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Add logout button functionality
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
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
        
        // Load data
        await refreshSettingsData();
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login';
    }
}

// Refresh all settings data
async function refreshSettingsData() {
    await loadTags();
    await loadVideos();
    updateTagStatistics();
    refreshTagsList();
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

// Load all videos for statistics
async function loadVideos() {
    try {
        const response = await fetch('/api/videos?limit=1000', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });
        
        if (response.ok) {
            allVideos = await response.json();
        }
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// Update tag statistics
function updateTagStatistics() {
    const totalTags = allTags.length;
    const usedTags = allTags.filter(tag => tag._count.videos > 0).length;
    const unusedTags = totalTags - usedTags;
    const totalVideos = allVideos.length;
    const avgTagsPerVideo = totalVideos > 0 ? 
        (allVideos.reduce((sum, video) => sum + (video.tags?.length || 0), 0) / totalVideos).toFixed(1) : 0;

    document.getElementById('totalTagsCount').textContent = totalTags;
    document.getElementById('usedTagsCount').textContent = usedTags;
    document.getElementById('unusedTagsCount').textContent = unusedTags;
    document.getElementById('avgTagsPerVideo').textContent = avgTagsPerVideo;
}

// Refresh tags list
function refreshTagsList() {
    const sortBy = document.getElementById('tagSortBy').value;
    const sortedTags = [...allTags].sort((a, b) => {
        switch(sortBy) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'usage-desc':
                return b._count.videos - a._count.videos;
            case 'usage-asc':
                return a._count.videos - b._count.videos;
            case 'created-desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'created-asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            default:
                return 0;
        }
    });

    const tagsList = document.getElementById('tagsList');
    if (sortedTags.length === 0) {
        tagsList.innerHTML = '<p class="empty-state">No tags created yet.</p>';
        return;
    }

    tagsList.innerHTML = sortedTags.map(tag => `
        <div class="tag-management-item" data-tag-id="${tag.id}">
            <div class="tag-management-info">
                <span class="tag" ${tag.color ? `style="background-color: ${tag.color}; color: ${getContrastColor(tag.color)}"` : ''}>
                    ${escapeHtml(tag.name)}
                </span>
                <div class="tag-management-details">
                    <div class="tag-management-name">${escapeHtml(tag.name)}</div>
                    <div class="tag-management-meta">
                        Created ${new Date(tag.createdAt).toLocaleDateString()} • 
                        ${tag._count.videos} video${tag._count.videos !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
            <div class="tag-management-actions">
                <button class="tag-edit-button" onclick="toggleTagEdit(${tag.id})">
                    ✏️ Edit
                </button>
                <button class="tag-delete-button" onclick="deleteTag(${tag.id})" ${tag._count.videos > 0 ? 'title="This tag is used by videos"' : ''}>
                    🗑️ Delete
                </button>
            </div>
            <div id="editForm${tag.id}" class="tag-edit-form">
                <div class="tag-edit-controls">
                    <input type="text" id="editName${tag.id}" value="${escapeHtml(tag.name)}" maxlength="50">
                    <input type="color" id="editColor${tag.id}" value="${tag.color || '#6c757d'}">
                    <button onclick="saveTagEdit(${tag.id})" class="primary-button">Save</button>
                    <button onclick="cancelTagEdit(${tag.id})" style="background: rgba(148, 163, 184, 0.1); color: var(--text-secondary); border: 1px solid rgba(148, 163, 184, 0.2); padding: 0.625rem 1.25rem; border-radius: 8px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Create tag from settings
async function createTagFromSettings() {
    const name = document.getElementById('settingsNewTagName').value.trim();
    const color = document.getElementById('settingsNewTagColor').value;

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
            document.getElementById('settingsNewTagName').value = '';
            document.getElementById('settingsNewTagColor').value = '#6c757d';
            refreshSettingsData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to create tag');
        }
    } catch (error) {
        console.error('Error creating tag:', error);
        alert('Failed to create tag');
    }
}

// Toggle tag edit form
function toggleTagEdit(tagId) {
    const editForm = document.getElementById(`editForm${tagId}`);
    const isActive = editForm.classList.contains('active');
    
    // Close all other edit forms
    document.querySelectorAll('.tag-edit-form.active').forEach(form => {
        form.classList.remove('active');
    });
    
    if (!isActive) {
        editForm.classList.add('active');
    }
}

// Save tag edit
async function saveTagEdit(tagId) {
    const name = document.getElementById(`editName${tagId}`).value.trim();
    const color = document.getElementById(`editColor${tagId}`).value;

    if (!name) {
        alert('Tag name cannot be empty');
        return;
    }

    try {
        const response = await fetch(`/api/tags/${tagId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            },
            body: JSON.stringify({ name, color })
        });

        if (response.ok) {
            refreshSettingsData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to update tag');
        }
    } catch (error) {
        console.error('Error updating tag:', error);
        alert('Failed to update tag');
    }
}

// Cancel tag edit
function cancelTagEdit(tagId) {
    const editForm = document.getElementById(`editForm${tagId}`);
    editForm.classList.remove('active');
    
    // Reset form values
    const tag = allTags.find(t => t.id === tagId);
    if (tag) {
        document.getElementById(`editName${tagId}`).value = tag.name;
        document.getElementById(`editColor${tagId}`).value = tag.color || '#6c757d';
    }
}

// Delete tag
async function deleteTag(tagId) {
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) return;

    const usageCount = tag._count.videos;
    let confirmMessage = `Are you sure you want to delete the tag "${tag.name}"?`;
    
    if (usageCount > 0) {
        confirmMessage += `\n\nThis tag is currently used by ${usageCount} video${usageCount !== 1 ? 's' : ''}. Deleting it will remove the tag from all videos.`;
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const response = await fetch(`/api/tags/${tagId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey
            }
        });

        if (response.ok) {
            refreshSettingsData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete tag');
        }
    } catch (error) {
        console.error('Error deleting tag:', error);
        alert('Failed to delete tag');
    }
}

// Delete all unused tags
async function deleteUnusedTags() {
    const unusedTags = allTags.filter(tag => tag._count.videos === 0);
    
    if (unusedTags.length === 0) {
        alert('No unused tags to delete');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${unusedTags.length} unused tag${unusedTags.length !== 1 ? 's' : ''}?\n\nTags to be deleted:\n${unusedTags.map(t => `• ${t.name}`).join('\n')}`)) {
        return;
    }

    try {
        await Promise.all(unusedTags.map(tag => 
            fetch(`/api/tags/${tag.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-API-Key': apiKey
                }
            })
        ));

        refreshSettingsData();
        alert(`Successfully deleted ${unusedTags.length} unused tag${unusedTags.length !== 1 ? 's' : ''}`);
    } catch (error) {
        console.error('Error deleting unused tags:', error);
        alert('Failed to delete some tags');
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('yva_auth_token');
    localStorage.removeItem('yva_api_key');
    window.location.href = '/login';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get contrast color for text on colored backgrounds
function getContrastColor(hexColor) {
    if (!hexColor) return '#333';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000' : '#fff';
}

// Add the CSS for tag management
const style = document.createElement('style');
style.textContent = `
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
    }
    
    .stat-item {
        text-align: center;
        padding: 1.5rem;
        background: rgba(15, 23, 42, 0.5);
        border-radius: 12px;
        border: 1px solid var(--border-color);
    }
    
    .stat-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--primary-light);
        margin-bottom: 0.5rem;
    }
    
    .stat-label {
        color: var(--text-secondary);
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .tags-management-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.5rem;
    }
    
    .tag-management-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem;
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        transition: all 0.3s ease;
    }
    
    .tag-management-item:hover {
        background: rgba(15, 23, 42, 0.8);
        transform: translateX(4px);
    }
    
    .tag-management-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .tag-management-details {
        flex: 1;
    }
    
    .tag-management-name {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
    }
    
    .tag-management-meta {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    
    .tag-management-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .tag-edit-button, .tag-delete-button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .tag-edit-button {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary-light);
        border: 1px solid rgba(99, 102, 241, 0.2);
    }
    
    .tag-edit-button:hover {
        background: rgba(99, 102, 241, 0.2);
        transform: translateY(-2px);
    }
    
    .tag-delete-button {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
        border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .tag-delete-button:hover {
        background: rgba(239, 68, 68, 0.2);
        transform: translateY(-2px);
    }
    
    .tag-delete-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .tag-edit-form {
        display: none;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(15, 23, 42, 0.3);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }
    
    .tag-edit-form.active {
        display: flex;
    }
    
    .tag-edit-controls {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .tag-edit-controls input[type="text"] {
        flex: 1;
        min-width: 150px;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.5);
        color: var(--text-primary);
    }
    
    .tag-edit-controls input[type="color"] {
        width: 40px;
        height: 34px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
    }
    
    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
        }
        
        .stat-value {
            font-size: 2rem;
        }
        
        .tag-management-item {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .tag-management-info {
            width: 100%;
        }
        
        .tag-management-actions {
            width: 100%;
            justify-content: flex-end;
        }
        
        .tag-edit-controls {
            flex-direction: column;
            align-items: stretch;
        }
        
        .tag-edit-controls input[type="text"] {
            width: 100%;
        }
    }
`;
document.head.appendChild(style);
