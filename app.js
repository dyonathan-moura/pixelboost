/**
 * PixelBoost - AI Image Upscaler
 * Main Application Logic
 */

// ============================================
// DOM Elements
// ============================================
const DOM = {
    // Upload
    uploadSection: document.getElementById('upload-section'),
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),

    // Processing
    processingSection: document.getElementById('processing-section'),
    originalImage: document.getElementById('original-image'),
    upscaledImage: document.getElementById('upscaled-image'),
    originalSize: document.getElementById('original-size'),
    upscaledSize: document.getElementById('upscaled-size'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    progressFill: document.getElementById('progress-fill'),

    // Controls
    scaleBtns: document.querySelectorAll('.scale-btn'),
    upscaleBtn: document.getElementById('upscale-btn'),
    downloadBtn: document.getElementById('download-btn'),
    resetBtn: document.getElementById('reset-btn'),

    // Comparison
    comparisonSection: document.getElementById('comparison-section'),
    comparisonContainer: document.getElementById('comparison-container'),
    compareBefore: document.getElementById('compare-before'),
    compareAfter: document.getElementById('compare-after'),
    comparisonSlider: document.getElementById('comparison-slider'),

    // Fullscreen Loader
    fullscreenLoader: document.getElementById('fullscreen-loader'),
    loaderTitle: document.getElementById('loader-title'),
    loaderStatus: document.getElementById('loader-status'),
    loaderProgressFill: document.getElementById('loader-progress-fill')
};

// ============================================
// State
// ============================================
const state = {
    originalImageSrc: null,
    upscaledImageSrc: null,
    selectedScale: 2,
    isProcessing: false,
    upscaler2x: null,
    upscaler4x: null
};

// ============================================
// Initialization
// ============================================
async function init() {
    console.log('🚀 PixelBoost initializing...');

    // Initialize upscalers with models
    try {
        state.upscaler2x = new Upscaler({
            model: ESRGANSlim2x
        });

        state.upscaler4x = new Upscaler({
            model: ESRGANSlim4x
        });

        console.log('✅ Upscalers initialized');
    } catch (error) {
        console.error('❌ Failed to initialize upscalers:', error);
    }

    setupEventListeners();
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Drop zone events
    DOM.dropZone.addEventListener('click', () => DOM.fileInput.click());
    DOM.dropZone.addEventListener('dragover', handleDragOver);
    DOM.dropZone.addEventListener('dragleave', handleDragLeave);
    DOM.dropZone.addEventListener('drop', handleDrop);
    DOM.fileInput.addEventListener('change', handleFileSelect);

    // Scale buttons
    DOM.scaleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.scaleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedScale = parseInt(btn.dataset.scale);
        });
    });

    // Action buttons
    DOM.upscaleBtn.addEventListener('click', handleUpscale);
    DOM.downloadBtn.addEventListener('click', handleDownload);
    DOM.resetBtn.addEventListener('click', handleReset);

    // Comparison slider
    setupComparisonSlider();
}

// ============================================
// File Handling
// ============================================
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    DOM.dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    DOM.dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    DOM.dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Por favor, selecione uma imagem JPG, PNG ou WebP.');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('A imagem é muito grande. O tamanho máximo é 10MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.originalImageSrc = e.target.result;
        displayOriginalImage(e.target.result);
        showProcessingSection();
    };
    reader.readAsDataURL(file);
}

// ============================================
// Image Display
// ============================================
function displayOriginalImage(src) {
    DOM.originalImage.src = src;
    DOM.originalImage.onload = () => {
        const width = DOM.originalImage.naturalWidth;
        const height = DOM.originalImage.naturalHeight;
        DOM.originalSize.textContent = `${width} × ${height}`;
    };
}

function displayUpscaledImage(src) {
    DOM.upscaledImage.src = src;
    DOM.upscaledImage.onload = () => {
        const width = DOM.upscaledImage.naturalWidth;
        const height = DOM.upscaledImage.naturalHeight;
        DOM.upscaledSize.textContent = `${width} × ${height}`;
    };
}

// ============================================
// UI State Management
// ============================================
function showProcessingSection() {
    DOM.uploadSection.classList.add('hidden');
    DOM.processingSection.classList.remove('hidden');

    // Reset upscaled image
    DOM.upscaledImage.src = '';
    DOM.upscaledSize.textContent = '';
    DOM.downloadBtn.disabled = true;
    DOM.comparisonSection.classList.add('hidden');
}

function showLoading(show, text = 'Processando...') {
    if (show) {
        DOM.fullscreenLoader.classList.add('active');
        DOM.loaderStatus.textContent = text;
        DOM.upscaleBtn.disabled = true;
        DOM.loadingOverlay.classList.add('active');
        DOM.loadingText.textContent = text;
    } else {
        DOM.fullscreenLoader.classList.remove('active');
        DOM.upscaleBtn.disabled = false;
        DOM.loadingOverlay.classList.remove('active');
    }
}

function updateProgress(percent) {
    DOM.progressFill.style.width = `${percent}%`;
    DOM.loaderProgressFill.style.width = `${percent}%`;
}

// ============================================
// Upscaling
// ============================================
async function handleUpscale() {
    if (state.isProcessing || !state.originalImageSrc) return;

    state.isProcessing = true;
    showLoading(true, 'Preparando...');
    updateProgress(5);

    // Force UI to render before heavy processing
    await new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 100);
            });
        });
    });

    try {
        showLoading(true, 'Carregando modelo de IA...');
        updateProgress(10);

        // Another render break
        await new Promise(resolve => setTimeout(resolve, 50));

        const upscaler = state.selectedScale === 2 ? state.upscaler2x : state.upscaler4x;

        showLoading(true, 'Processando imagem...');
        updateProgress(30);

        // Force render
        await new Promise(resolve => setTimeout(resolve, 50));

        // Create image element for upscaling
        const img = new Image();
        img.src = state.originalImageSrc;
        await new Promise((resolve) => {
            img.onload = resolve;
        });

        updateProgress(50);
        showLoading(true, 'Aprimorando com IA...');

        // Force render before heavy upscaling
        await new Promise(resolve => setTimeout(resolve, 100));

        // Perform upscaling with progress callback
        const upscaledSrc = await upscaler.upscale(img, {
            output: 'base64',
            patchSize: 64,
            padding: 2,
            progress: (progress) => {
                const percent = 50 + Math.round(progress * 45);
                updateProgress(percent);
                DOM.loaderStatus.textContent = `Aprimorando... ${Math.round(progress * 100)}%`;
                DOM.loadingText.textContent = `Aprimorando... ${Math.round(progress * 100)}%`;
            }
        });

        updateProgress(100);

        // Display result
        state.upscaledImageSrc = upscaledSrc;
        displayUpscaledImage(upscaledSrc);

        // Enable download and comparison
        DOM.downloadBtn.disabled = false;
        setupComparison();

        showLoading(false);

    } catch (error) {
        console.error('❌ Upscaling failed:', error);
        alert('Erro ao processar a imagem. Por favor, tente novamente ou use uma imagem menor.');
        showLoading(false);
    } finally {
        state.isProcessing = false;
        updateProgress(0);
    }
}

// ============================================
// Comparison Slider
// ============================================
function setupComparison() {
    DOM.compareBefore.src = state.originalImageSrc;
    DOM.compareAfter.src = state.upscaledImageSrc;
    DOM.comparisonSection.classList.remove('hidden');

    // Reset slider position
    updateSliderPosition(50);
}

function setupComparisonSlider() {
    let isDragging = false;

    const startDrag = (e) => {
        isDragging = true;
        updateSlider(e);
    };

    const stopDrag = () => {
        isDragging = false;
    };

    const drag = (e) => {
        if (!isDragging) return;
        updateSlider(e);
    };

    const updateSlider = (e) => {
        const container = DOM.comparisonContainer;
        const rect = container.getBoundingClientRect();

        let clientX;
        if (e.touches) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        let position = ((clientX - rect.left) / rect.width) * 100;
        position = Math.max(0, Math.min(100, position));

        updateSliderPosition(position);
    };

    // Mouse events
    DOM.comparisonContainer.addEventListener('mousedown', startDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('mousemove', drag);

    // Touch events
    DOM.comparisonContainer.addEventListener('touchstart', startDrag);
    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchmove', drag);
}

function updateSliderPosition(percent) {
    DOM.comparisonSlider.style.left = `${percent}%`;
    DOM.compareBefore.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
}

// ============================================
// Download
// ============================================
async function handleDownload() {
    if (!state.upscaledImageSrc) return;

    const fileName = `pixelboost-upscaled-${state.selectedScale}x.png`;

    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
        try {
            // Convert base64 to blob
            const response = await fetch(state.upscaledImageSrc);
            const blob = await response.blob();

            // Open "Save As" dialog
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'PNG Image',
                    accept: { 'image/png': ['.png'] }
                }],
                startIn: 'downloads'
            });

            // Write the file
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            console.log('✅ Image saved successfully');
        } catch (error) {
            // User cancelled the dialog or error occurred
            if (error.name !== 'AbortError') {
                console.error('❌ Save failed:', error);
                // Fallback to regular download
                fallbackDownload(fileName);
            }
        }
    } else {
        // Fallback for browsers that don't support File System Access API
        fallbackDownload(fileName);
    }
}

function fallbackDownload(fileName) {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = state.upscaledImageSrc;
    link.click();
}

// ============================================
// Reset
// ============================================
function handleReset() {
    // Reset state
    state.originalImageSrc = null;
    state.upscaledImageSrc = null;

    // Reset UI
    DOM.processingSection.classList.add('hidden');
    DOM.comparisonSection.classList.add('hidden');
    DOM.uploadSection.classList.remove('hidden');

    // Reset images
    DOM.originalImage.src = '';
    DOM.upscaledImage.src = '';
    DOM.originalSize.textContent = '';
    DOM.upscaledSize.textContent = '';

    // Reset file input
    DOM.fileInput.value = '';

    // Reset buttons
    DOM.downloadBtn.disabled = true;
}

// ============================================
// Start Application
// ============================================
document.addEventListener('DOMContentLoaded', init);
