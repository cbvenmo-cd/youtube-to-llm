// Toast Notification System
// Simple toast notifications for user feedback

(function(window) {
    'use strict';
    
    // Toast queue to handle multiple toasts
    const toastQueue = [];
    let isShowingToast = false;
    
    // Default options
    const defaultOptions = {
        duration: 3000,
        position: 'bottom-center',
        type: 'info'
    };
    
    // Create toast element
    function createToastElement(message, options) {
        const toast = document.createElement('div');
        toast.className = `toast ${options.type}`;
        toast.textContent = message;
        
        // Set position class
        if (options.position) {
            toast.classList.add(options.position);
        }
        
        return toast;
    }
    
    // Show toast
    function showToast(message, options = {}) {
        const opts = { ...defaultOptions, ...options };
        
        // Add to queue
        toastQueue.push({ message, options: opts });
        
        // Process queue if not already showing
        if (!isShowingToast) {
            processToastQueue();
        }
    }
    
    // Process toast queue
    function processToastQueue() {
        if (toastQueue.length === 0) {
            isShowingToast = false;
            return;
        }
        
        isShowingToast = true;
        const { message, options } = toastQueue.shift();
        
        // Create and add toast
        const toast = createToastElement(message, options);
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                // Process next toast in queue
                processToastQueue();
            }, 300);
        }, options.duration);
    }
    
    // Convenience methods
    const toast = {
        show: showToast,
        success: (message, options = {}) => showToast(message, { ...options, type: 'success' }),
        error: (message, options = {}) => showToast(message, { ...options, type: 'error' }),
        warning: (message, options = {}) => showToast(message, { ...options, type: 'warning' }),
        info: (message, options = {}) => showToast(message, { ...options, type: 'info' })
    };
    
    // Export to window
    window.toast = toast;
    
})(window);
