// Mode Indicator Script
// Shows dev mode banner and manages mode-specific UI elements

(function() {
    'use strict';
    
    // Check if we're on localhost
    function isLocalhost() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '0.0.0.0';
    }
    
    // Fetch current mode from API
    async function fetchAuthMode() {
        try {
            const response = await fetch('/api/auth/mode');
            if (!response.ok) {
                throw new Error('Failed to fetch auth mode');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching auth mode:', error);
            return null;
        }
    }
    
    // Update UI based on mode
    function updateModeUI(modeData) {
        if (!modeData) return;
        
        const banner = document.getElementById('devModeBanner');
        const body = document.body;
        
        // Only show banner on localhost and in dev mode
        if (isLocalhost() && modeData.mode === 'development') {
            // Show banner
            if (banner) {
                banner.classList.remove('hidden');
                body.classList.add('dev-mode');
            }
            
            // Update page title
            const originalTitle = document.title;
            if (!originalTitle.includes('[DEV]')) {
                document.title = '[DEV] ' + originalTitle;
            }
            
            // Update favicon if dev favicon exists
            updateFavicon(true);
        } else {
            // Hide banner
            if (banner) {
                banner.classList.add('hidden');
                body.classList.remove('dev-mode');
            }
            
            // Reset title
            const title = document.title.replace('[DEV] ', '');
            document.title = title;
            
            // Reset favicon
            updateFavicon(false);
        }
    }
    
    // Update favicon based on mode
    function updateFavicon(isDev) {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        
        if (isDev) {
            // First try to use dev favicon if it exists
            const testImg = new Image();
            testImg.onerror = function() {
                // If dev favicon doesn't exist, use regular favicon
                link.href = '/favicon.ico';
            };
            testImg.onload = function() {
                link.href = '/favicon-dev.ico';
            };
            testImg.src = '/favicon-dev.ico';
        } else {
            link.href = '/favicon.ico';
        }
        
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    
    // Initialize on page load
    async function init() {
        // Only run on localhost
        if (!isLocalhost()) {
            return;
        }
        
        // Fetch and apply mode
        const modeData = await fetchAuthMode();
        updateModeUI(modeData);
        
        // Store mode data globally for other scripts
        window.YVA = window.YVA || {};
        window.YVA.authMode = modeData;
    }
    
    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
