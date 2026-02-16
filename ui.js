// ui.js - Handles UI interactions for Merhav Hadaat

// Initialize UI elements and event listeners
function initializeUI() {
    // Set up modals
    setupModals();
    
    // Set up tabs
    setupTabs();
    
    // Set up settings controls
    setupSettingsControls();
    
    // Set up album grid
    setupAlbumGrid();
    
    console.log('UI initialized');
}

// ===== Modal Management =====
function setupModals() {
    // Get all modal triggers and modals
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const modals = document.querySelectorAll('.modal-overlay');
    const closeButtons = document.querySelectorAll('.modal-close');
    
    // Add click event to all modal triggers
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modalId = trigger.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                openModal(modal);
            }
        });
    });
    
    // Add click event to all close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal-overlay');
            closeModal(modal);
        });
    });
    
    // Close modal when clicking outside
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-overlay.open');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
}

function openModal(modal) {
    modal.classList.add('open');
    
    // Set focus on first focusable element
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) {
        setTimeout(() => focusableElements[0].focus(), 100);
    }
    
    // Announce to screen readers
    const modalTitle = modal.querySelector('.modal-header h3');
    if (modalTitle) {
        announceToScreenReader(`פתיחת חלון ${modalTitle.textContent}`);
    }
}

function closeModal(modal) {
    modal.classList.remove('open');
}

// ===== Tabs Management =====
function setupTabs() {
    const tabContainers = document.querySelectorAll('.tabs');
    
    tabContainers.forEach(container => {
        const tabs = container.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll(`[data-tab-content="${container.getAttribute('data-tabs')}"]`);
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Hide all tab contents
                tabContents.forEach(content => {
                    content.style.display = 'none';
                });
                
                // Show selected tab content
                const tabId = tab.getAttribute('data-tab');
                const activeContent = document.querySelector(`[data-tab-id="${tabId}"]`);
                if (activeContent) {
                    activeContent.style.display = 'block';
                }
                
                // Announce to screen readers
                announceToScreenReader(`מעבר ללשונית ${tab.textContent}`);
            });
        });
        
        // Activate first tab by default
        if (tabs.length > 0) {
            tabs[0].click();
        }
    });
}

// ===== Settings Controls =====
function setupSettingsControls() {
    // Theme buttons
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');
            setTheme(theme);
            
            // Update active state
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    // Font size buttons
    const fontSizeButtons = document.querySelectorAll('.font-size-btn');
    fontSizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const fontSize = button.getAttribute('data-font-size');
            setFontSize(fontSize);
            
            // Update active state
            fontSizeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    soundToggle.addEventListener('change', () => {
        state.settings.soundEnabled = soundToggle.checked;
        saveState();
    });
    
    // Data management buttons
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', importData);
    document.getElementById('resetDataBtn').addEventListener('click', resetData);
}

// ===== Album Grid =====
function setupAlbumGrid() {
    const albumGrid = document.querySelector('.grid-container');
    
    // Clear existing items
    albumGrid.innerHTML = '';
    
    // Create grid items for each card
    state.cards.forEach((card, index) => {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        
        // Check if unlocked
        if (index === 0 || state.completedCards.includes(index - 1)) {
            gridItem.classList.add('unlocked');
            
            // Add card title
            gridItem.textContent = card.title;
            
            // Add stats if favorited
            if (state.favorites.includes(index)) {
                const statsDiv = document.createElement('div');
                statsDiv.className = 'grid-stats';
                statsDiv.innerHTML = '<span class="grid-heart">♥</span>';
                gridItem.appendChild(statsDiv);
            }
            
            // Add click event
            gridItem.addEventListener('click', () => {
                state.currentCardIndex = index;
                loadCurrentCard();
                closeModal(document.getElementById('albumModal'));
            });
        } else {
            gridItem.textContent = '🔒';
        }
        
        // Mark current card
        if (index === state.currentCardIndex) {
            gridItem.classList.add('current');
        }
        
        albumGrid.appendChild(gridItem);
    });
}

// ===== Onboarding =====
function showOnboarding() {
    const onboarding = document.querySelector('.onboarding-overlay');
    const steps = onboarding.querySelectorAll('.onboarding-step');
    const dots = onboarding.querySelectorAll('.dot');
    const nextBtn = onboarding.querySelector('.onboarding-next');
    const closeBtn = onboarding.querySelector('.onboarding-close');
    
    let currentStep = 0;
    
    // Show first step
    steps[currentStep].classList.add('active');
    dots[currentStep].classList.add('active');
    
    // Show onboarding
    onboarding.classList.add('show');
    
    // Next button click
    nextBtn.addEventListener('click', () => {
        // Hide current step
        steps[currentStep].classList.remove('active');
        dots[currentStep].classList.remove('active');
        
        // Move to next step or close
        currentStep++;
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            dots[currentStep].classList.add('active');
            
            // Change button text on last step
            if (currentStep === steps.length - 1) {
                nextBtn.textContent = 'סיום';
            }
        } else {
            completeOnboarding();
        }
    });
    
    // Close button click
    closeBtn.addEventListener('click', completeOnboarding);
    
    function completeOnboarding() {
        onboarding.classList.remove('show');
        localStorage.setItem('merhav_onboarded', 'true');
    }
}

// ===== Settings Application =====
function applyUserSettings() {
    // Apply theme
    setTheme(state.settings.theme);
    
    // Apply font size
    setFontSize(state.settings.fontSize);
    
    // Apply sound setting
    document.getElementById('soundToggle').checked = state.settings.soundEnabled;
    
    // Update UI to reflect settings
    updateSettingsUI();
}

function setTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('default-theme', 'dark-theme', 'blue-theme', 'green-theme');
    
    // Add selected theme class
    document.body.classList.add(`${theme}-theme`);
    
    // Save to state
    state.settings.theme = theme;
    saveState();
}

function setFontSize(size) {
    // Remove all font size classes
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    
    // Add selected font size class
    document.body.classList.add(`font-${size}`);
    
    // Save to state
    state.settings.fontSize = size;
    saveState();
}

function updateSettingsUI() {
    // Update theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === state.settings.theme) {
            btn.classList.add('active');
        }
    });
    
    // Update font size buttons
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-font-size') === state.settings.fontSize) {
            btn.classList.add('active');
        }
    });
}
