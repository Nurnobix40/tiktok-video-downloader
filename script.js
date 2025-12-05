// TikTok Downloader - Video & Audio Only
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const videoUrlInput = document.getElementById('videoUrl');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const formatOptions = document.querySelectorAll('.format-option');
    const previewArea = document.getElementById('previewArea');
    const loadingModal = document.getElementById('loadingModal');
    const downloadModal = document.getElementById('downloadModal');
    const directDownloadBtn = document.getElementById('directDownload');
    const closeModalBtn = document.getElementById('closeModal');
    const testButtons = document.querySelectorAll('.test-btn');
    const optionButtons = document.querySelectorAll('.option-btn');
    
    // Variables
    let selectedFormat = 'mp4';
    let selectedType = 'video';
    let currentVideoUrl = '';
    let mediaData = null;
    
    // Initialize
    initApp();
    
    function initApp() {
        setupEventListeners();
        setupFAQ();
        autoFocusInput();
    }
    
    function setupEventListeners() {
        // Analyze button
        analyzeBtn.addEventListener('click', handleAnalyze);
        
        // Download button
        downloadBtn.addEventListener('click', handleDownload);
        
        // Paste button
        pasteBtn.addEventListener('click', handlePaste);
        
        // Clear button
        clearBtn.addEventListener('click', handleClear);
        
        // Format selection
        formatOptions.forEach(option => {
            option.addEventListener('click', () => {
                formatOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                selectedFormat = option.dataset.format;
                selectedType = option.dataset.type;
                updateDownloadButton();
            });
        });
        
        // Test buttons
        testButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                videoUrlInput.value = btn.dataset.url;
                showNotification('Test link loaded. Click "Analyze Link"', 'info');
            });
        });
        
        // Option buttons (HD, SD, Audio)
        optionButtons.forEach(btn => {
            btn.addEventListener('click', handleOptionClick);
        });
        
        // Modal buttons
        directDownloadBtn.addEventListener('click', triggerDirectDownload);
        closeModalBtn.addEventListener('click', () => hideModal(downloadModal));
        
        // Enter key support
        videoUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleAnalyze();
            }
        });
    }
    
    async function handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                videoUrlInput.value = text;
                videoUrlInput.focus();
                showNotification('Pasted from clipboard!', 'success');
            }
        } catch (err) {
            showNotification('Cannot access clipboard. Paste manually.', 'warning');
            videoUrlInput.focus();
        }
    }
    
    function handleClear() {
        videoUrlInput.value = '';
        videoUrlInput.focus();
        hidePreview();
        downloadBtn.disabled = true;
        showNotification('Input cleared', 'info');
    }
    
    async function handleAnalyze() {
        const url = videoUrlInput.value.trim();
        
        if (!url) {
            showNotification('Please enter a TikTok video link', 'error');
            return;
        }
        
        if (!isValidTikTokUrl(url)) {
            showNotification('Please enter a valid TikTok video link', 'error');
            return;
        }
        
        currentVideoUrl = url;
        showLoading('Analyzing TikTok video...');
        
        try {
            mediaData = await processTikTokVideo(url);
            
            if (!mediaData) {
                throw new Error('Could not analyze this video link');
            }
            
            hideLoading();
            showPreview(mediaData);
            updateDownloadButton();
            
        } catch (error) {
            hideLoading();
            showNotification('Analysis failed: ' + error.message, 'error');
            console.error('Analysis Error:', error);
        }
    }
    
    function isValidTikTokUrl(url) {
        const patterns = [
            /tiktok\.com\/@[\w.]+\/video\/\d+/,
            /vm\.tiktok\.com\/\w+/,
            /vt\.tiktok\.com\/\w+/,
            /tiktok\.com\/t\/\w+/
        ];
        return patterns.some(pattern => pattern.test(url));
    }
    
    async function processTikTokVideo(url) {
        // Try multiple video APIs
        const videoApis = [
            `https://api.tiklydown.com/api/download?url=${encodeURIComponent(url)}`,
            `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
            `https://tikcdn.io/api/ajaxSearch?url=${encodeURIComponent(url)}`
        ];
        
        for (let api of videoApis) {
            try {
                const response = await fetchWithTimeout(api, 10000);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Parse different API formats
                    if (data.data && data.data.play) {
                        return {
                            type: 'video',
                            title: data.data.title || 'TikTok Video',
                            author: data.data.author || '@user',
                            duration: formatDuration(data.data.duration),
                            likes: formatNumber(data.data.like_count),
                            thumbnail: data.data.cover,
                            videoUrl: data.data.hdplay || data.data.play,
                            musicUrl: data.data.music
                        };
                    } else if (data.play) {
                        return {
                            type: 'video',
                            title: data.title || 'TikTok Video',
                            author: data.author || '@user',
                            duration: formatDuration(data.duration),
                            likes: formatNumber(data.likes),
                            thumbnail: data.cover,
                            videoUrl: data.hdplay || data.play,
                            musicUrl: data.music
                        };
                    }
                }
            } catch (error) {
                continue;
            }
        }
        return null;
    }
    
    function showPreview(data) {
        // Update media type badge
        const badge = document.getElementById('mediaTypeBadge');
        badge.innerHTML = '<i class="fas fa-video"></i> Video';
        badge.style.background = 'var(--video)';
        
        // Update thumbnail if available
        if (data.thumbnail) {
            document.getElementById('thumbnail').src = data.thumbnail;
        }
        
        // Update details
        document.getElementById('mediaTitle').textContent = data.title;
        document.getElementById('author').textContent = data.author;
        document.getElementById('duration').textContent = data.duration;
        document.getElementById('likes').textContent = data.likes;
        
        // Store media data
        mediaData = data;
        
        // Show preview area
        previewArea.classList.remove('hidden');
        
        // Auto scroll to preview
        setTimeout(() => {
            previewArea.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
    }
    
    function hidePreview() {
        previewArea.classList.add('hidden');
        mediaData = null;
    }
    
    function updateDownloadButton() {
        if (mediaData && selectedFormat && selectedType) {
            downloadBtn.disabled = false;
            
            // Update button text based on selection
            let buttonText = 'Download ';
            if (selectedType === 'video') buttonText += 'Video';
            else if (selectedType === 'audio') buttonText += 'Audio';
            
            downloadBtn.innerHTML = `<i class="fas fa-download"></i> ${buttonText}`;
        } else {
            downloadBtn.disabled = true;
        }
    }
    
    async function handleDownload() {
        if (!mediaData || !selectedFormat) {
            showNotification('Please analyze a video first', 'error');
            return;
        }
        
        showLoading('Preparing download...');
        
        try {
            let downloadUrl = '';
            let filename = '';
            
            if (selectedType === 'video') {
                downloadUrl = mediaData.videoUrl;
                filename = `tiktok_video_${Date.now()}.${selectedFormat}`;
            } else if (selectedType === 'audio') {
                downloadUrl = mediaData.musicUrl;
                filename = `tiktok_audio_${Date.now()}.${selectedFormat}`;
            }
            
            if (!downloadUrl) {
                throw new Error('Download link not available');
            }
            
            // Prepare download modal
            document.getElementById('downloadMessage').textContent = 
                `${selectedType.toUpperCase()} download ready!`;
            directDownloadBtn.dataset.url = downloadUrl;
            directDownloadBtn.dataset.filename = filename;
            
            hideLoading();
            showModal(downloadModal);
            
        } catch (error) {
            hideLoading();
            showNotification('Download failed: ' + error.message, 'error');
            openAlternativeService(selectedType);
        }
    }
    
    function handleOptionClick(event) {
        const button = event.currentTarget;
        const optionType = button.classList[1]; // video-option or audio-option
        
        if (optionType === 'audio-option') {
            selectedType = 'audio';
            selectedFormat = 'mp3';
        } else if (optionType === 'video-option') {
            selectedType = 'video';
            selectedFormat = 'mp4';
        }
        
        // Trigger download
        handleDownload();
    }
    
    function triggerDirectDownload() {
        const url = directDownloadBtn.dataset.url;
        const filename = directDownloadBtn.dataset.filename;
        
        if (!url) {
            showNotification('Download link not found', 'error');
            return;
        }
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        
        try {
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            window.open(url, '_blank');
        }
        
        hideModal(downloadModal);
        showNotification('Download started! Check your downloads.', 'success');
    }
    
    function openAlternativeService(type) {
        const altServices = {
            video: `https://ssstik.io/en?url=${encodeURIComponent(currentVideoUrl)}`,
            audio: `https://tikdown.org/en?url=${encodeURIComponent(currentVideoUrl)}`
        };
        
        const service = altServices[type] || altServices.video;
        window.open(service, '_blank');
        showNotification('Opening alternative download service...', 'info');
    }
    
    function setupFAQ() {
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;
                const isActive = item.classList.contains('active');
                
                document.querySelectorAll('.faq-item').forEach(faq => {
                    faq.classList.remove('active');
                });
                
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }
    
    function autoFocusInput() {
        setTimeout(() => {
            videoUrlInput.focus();
        }, 500);
    }
    
    // Utility functions
    async function fetchWithTimeout(url, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Origin': 'https://www.tiktok.com'
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    function formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    function showLoading(message) {
        document.getElementById('loadingText').textContent = message;
        loadingModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    function hideLoading() {
        loadingModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
    
    function showModal(modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    function hideModal(modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
    
    function showNotification(message, type = 'success') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <p>${message}</p>
            <button onclick="this.parentElement.remove()">✕</button>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Initialize demo
    setTimeout(() => {
        if (!localStorage.getItem('app_initialized')) {
            showNotification('Welcome! Paste TikTok video link and click Analyze', 'info');
            localStorage.setItem('app_initialized', 'true');
        }
    }, 1000);
});

// Global notification function
window.showNotification = function(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <p>${message}</p>
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : type === 'info' ? '#2196F3' : '#4CAF50'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
};