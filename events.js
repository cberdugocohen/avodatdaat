// events.js - Handles event listeners and interactions for Merhav Hadaat

// Initialize all event listeners
function initializeEvents() {
    // Card navigation events
    setupCardNavigation();
    
    // Card controls events
    setupCardControls();
    
    // Note editor events
    setupNoteEditor();
    
    // Keyboard navigation
    setupKeyboardNavigation();
    
    // Touch gestures
    setupTouchGestures();
    
    console.log('Events initialized');
}

// ===== Card Navigation =====
function setupCardNavigation() {
    // Next button
    document.querySelector('.nav-next').addEventListener('click', nextCard);
    
    // Previous button
    document.querySelector('.nav-prev').addEventListener('click', prevCard);
    
    // Card click to flip
    document.querySelector('.scene').addEventListener('click', (e) => {
        // Don't flip if clicking on a control button
        if (!e.target.closest('.controls')) {
            flipCard();
        }
    });
}

// ===== Card Controls =====
function setupCardControls() {
    // Favorite button
    document.querySelector('.control-favorite').addEventListener('click', toggleFavorite);
    
    // Note button
    document.querySelector('.control-note').addEventListener('click', openNoteEditor);
    
    // Share button
    document.querySelector('.control-share').addEventListener('click', shareCard);
}

// ===== Note Editor =====
function setupNoteEditor() {
    // Save note button
    document.querySelector('.save-note-btn').addEventListener('click', saveNote);
    
    // Close note button
    document.querySelector('.note-close').addEventListener('click', closeNoteEditor);
    
    // Close note when clicking outside
    document.querySelector('.note-editor').addEventListener('click', (e) => {
        if (e.target === document.querySelector('.note-editor')) {
            closeNoteEditor();
        }
    });
}

// ===== Keyboard Navigation =====
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Only process if no modals are open
        const modalOpen = document.querySelector('.modal-overlay.open');
        const noteEditorOpen = document.querySelector('.note-editor.open');
        
        if (!modalOpen && !noteEditorOpen) {
            switch (e.key) {
                case 'ArrowRight':
                    // RTL navigation - previous card
                    prevCard();
                    break;
                case 'ArrowLeft':
                    // RTL navigation - next card
                    nextCard();
                    break;
                case ' ':
                case 'Enter':
                    // Flip card
                    flipCard();
                    break;
                case 'f':
                    // Toggle favorite
                    toggleFavorite();
                    break;
                case 'n':
                    // Open note
                    openNoteEditor();
                    break;
                case 's':
                    // Share card
                    shareCard();
                    break;
                case 'h':
                    // Open help modal
                    openModal(document.getElementById('helpModal'));
                    break;
            }
        }
    });
}

// ===== Touch Gestures =====
function setupTouchGestures() {
    const scene = document.querySelector('.scene');
    let touchStartX = 0;
    let touchEndX = 0;
    
    scene.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    scene.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        // Minimum swipe distance (in pixels)
        const minSwipeDistance = 50;
        
        // Calculate swipe distance
        const swipeDistance = touchEndX - touchStartX;
        
        // Check if swipe is long enough
        if (Math.abs(swipeDistance) < minSwipeDistance) return;
        
        // RTL navigation
        if (swipeDistance > 0) {
            // Swipe right in RTL means previous
            prevCard();
        } else {
            // Swipe left in RTL means next
            nextCard();
        }
    }
}

// ===== Accessibility Helpers =====
function setupAccessibility() {
    // Add ARIA attributes dynamically
    const card = document.querySelector('.card');
    const cardFront = document.querySelector('.card-front');
    const cardBack = document.querySelector('.card-back');
    
    // Update ARIA attributes based on card flip state
    function updateAriaAttributes() {
        const isFlipped = card.classList.contains('flipped');
        
        cardFront.setAttribute('aria-hidden', isFlipped);
        cardBack.setAttribute('aria-hidden', !isFlipped);
        
        // Update tab index to make visible side focusable
        cardFront.setAttribute('tabindex', isFlipped ? '-1' : '0');
        cardBack.setAttribute('tabindex', isFlipped ? '0' : '-1');
    }
    
    // Initial setup
    updateAriaAttributes();
    
    // Update when card flips
    card.addEventListener('transitionend', updateAriaAttributes);
    
    // Make controls accessible
    const controls = document.querySelectorAll('.control');
    controls.forEach(control => {
        control.setAttribute('role', 'button');
        control.setAttribute('tabindex', '0');
        
        // Allow activation with Enter key
        control.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                control.click();
            }
        });
    });
}

// Call accessibility setup when DOM is loaded
document.addEventListener('DOMContentLoaded', setupAccessibility);
