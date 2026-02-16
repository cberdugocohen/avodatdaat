// Main script.js file for Merhav Hadaat application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modules
    initializeData();
    initializeUI();
    initializeEvents();
    
    // Check if first visit for onboarding
    if (!localStorage.getItem('merhav_onboarded')) {
        showOnboarding();
    }
    
    // Apply saved settings
    applyUserSettings();
    
    // Initialize first card
    loadCurrentCard();
    
    // Add tooltip for pencil icon
    const noteBtn = document.getElementById('noteBtn');
    if (noteBtn) {
        noteBtn.setAttribute('title', 'הוספת הערות אישיות לכרטיס');
        
        // Show tooltip explanation on first visit
        if (!localStorage.getItem('note_tooltip_shown')) {
            setTimeout(() => {
                showToast('לחץ על סמל העיפרון להוספת הערות אישיות לכרטיס');
                localStorage.setItem('note_tooltip_shown', 'true');
            }, 3000);
        }
    }
});

// ===== Core State Management =====
let state = {
    currentCardIndex: 0,
    cards: [],
    favorites: [],
    completedCards: [],
    settings: {
        theme: 'default',
        fontSize: 'medium',
        soundEnabled: true
    },
    notes: {},
    categories: []
};

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('merhav_state');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            state = { ...state, ...parsedState };
        } catch (e) {
            console.error('Error parsing saved state:', e);
            showToast('שגיאה בטעינת הנתונים השמורים');
        }
    }
}

// Save state to localStorage
function saveState() {
    try {
        localStorage.setItem('merhav_state', JSON.stringify({
            currentCardIndex: state.currentCardIndex,
            favorites: state.favorites,
            completedCards: state.completedCards,
            settings: state.settings,
            notes: state.notes
        }));
    } catch (e) {
        console.error('Error saving state:', e);
        showToast('שגיאה בשמירת הנתונים');
    }
}

// ===== Card Navigation =====
function loadCurrentCard() {
    if (state.cards.length === 0) return;
    
    const card = state.cards[state.currentCardIndex];
    
    // Update front elements
    const frontTitle = document.getElementById('frontTitle');
    const frontContent = document.getElementById('frontContent');
    const frontCategory = document.getElementById('frontCategory');
    const frontSource = document.getElementById('frontSource');
    
    // Update back elements
    const backSteps = document.getElementById('backSteps');
    
    // Set card content if elements exist
    if (card) {
        // Front card content
        if (frontTitle) frontTitle.textContent = card.title || 'כותרת הכרטיס';
        if (frontContent) frontContent.textContent = card.content || 'תוכן הכרטיס';
        if (frontCategory) frontCategory.textContent = card.category || 'קטגוריה';
        if (frontSource) frontSource.textContent = card.source || '';
        
        // Back card content (work of knowledge)
        if (backSteps) {
            // If card has steps property, use it; otherwise create a default message
            if (card.steps && Array.isArray(card.steps)) {
                let stepsHTML = '';
                card.steps.forEach((step, index) => {
                    stepsHTML += `<div class="step"><div class="step-number">${index + 1}</div><div class="step-desc">${step}</div></div>`;
                });
                backSteps.innerHTML = stepsHTML;
            } else {
                backSteps.innerHTML = `<p class="step-desc">הרהר/י במשמעות של המסר הזה עבורך. כיצד הוא מתחבר לחייך?</p>`;
            }
        }
        
        // Update card number display
        const cardNumber = document.querySelector('.card-number');
        if (cardNumber) {
            cardNumber.textContent = `${state.currentCardIndex + 1} / ${state.cards.length}`;
        }
    } else {
        console.error('Card data not found for index:', state.currentCardIndex);
    }
    
    // Update progress
    updateProgressBar();
    
    // Update favorite status
    const favoriteBtn = document.getElementById('favBtn');
    if (favoriteBtn) {
        if (state.favorites.includes(state.currentCardIndex)) {
            favoriteBtn.classList.add('active');
        } else {
            favoriteBtn.classList.remove('active');
        }
    }
    
    // Reset card flip
    const cardElement = document.getElementById('cardWrapper');
    if (cardElement) {
        cardElement.classList.remove('flipped');
        
        // Check if completed
        if (state.completedCards.includes(state.currentCardIndex)) {
            cardElement.classList.add('completed');
        } else {
            cardElement.classList.remove('completed');
        }
    }
    
    // Announce to screen readers
    announceToScreenReader(`כרטיס ${state.currentCardIndex + 1} מתוך ${state.cards.length}: ${card.title}`);
}

function nextCard() {
    if (state.currentCardIndex < state.cards.length - 1) {
        state.currentCardIndex++;
        loadCurrentCard();
        playSound('swipe');
        saveState();
    } else {
        showToast('הגעת לכרטיס האחרון');
        playSound('error');
    }
}

function prevCard() {
    if (state.currentCardIndex > 0) {
        state.currentCardIndex--;
        loadCurrentCard();
        playSound('swipe');
        saveState();
    } else {
        showToast('זהו הכרטיס הראשון');
        playSound('error');
    }
}

function flipCard() {
    const card = document.querySelector('.card');
    card.classList.toggle('flipped');
    
    // Mark as completed if not already
    if (!state.completedCards.includes(state.currentCardIndex)) {
        state.completedCards.push(state.currentCardIndex);
        card.classList.add('completed');
        saveState();
        
        // Check for achievements
        checkForAchievements();
    }
    
    playSound('flip');
}

function updateProgressBar() {
    const progress = document.querySelector('.progress-bar-fill');
    const progressText = document.querySelector('.progress-text');
    const percentage = state.cards.length > 0 
        ? Math.round((state.completedCards.length / state.cards.length) * 100) 
        : 0;
    
    progress.style.width = `${percentage}%`;
    progressText.textContent = `${state.completedCards.length}/${state.cards.length}`;
}

// ===== Favorites Management =====
function toggleFavorite() {
    const favoriteBtn = document.querySelector('.control-favorite');
    const currentIndex = state.currentCardIndex;
    
    if (state.favorites.includes(currentIndex)) {
        // Remove from favorites
        state.favorites = state.favorites.filter(idx => idx !== currentIndex);
        favoriteBtn.classList.remove('active');
        showToast('הוסר מהמועדפים');
    } else {
        // Add to favorites
        state.favorites.push(currentIndex);
        favoriteBtn.classList.add('active');
        showToast('נוסף למועדפים');
        playSound('favorite');
    }
    
    saveState();
}

// ===== Notes Management =====
function openNoteEditor() {
    const noteEditor = document.querySelector('.note-editor');
    const noteTextarea = document.getElementById('noteText');
    const currentIndex = state.currentCardIndex;
    
    // Load existing note if any
    if (state.notes[currentIndex]) {
        noteTextarea.value = state.notes[currentIndex];
    } else {
        noteTextarea.value = '';
    }
    
    noteEditor.classList.add('open');
    setTimeout(() => noteTextarea.focus(), 400);
}

function closeNoteEditor() {
    document.querySelector('.note-editor').classList.remove('open');
}

function saveNote() {
    const noteText = document.getElementById('noteText').value.trim();
    const currentIndex = state.currentCardIndex;
    
    if (noteText) {
        state.notes[currentIndex] = noteText;
        showToast('ההערה נשמרה');
    } else {
        // If empty, remove the note
        if (state.notes[currentIndex]) {
            delete state.notes[currentIndex];
            showToast('ההערה נמחקה');
        }
    }
    
    saveState();
    closeNoteEditor();
}

// ===== UI Helpers =====
function showToast(message, duration = 2000) {
    const toast = document.querySelector('.toast');
    toast.textContent = message;
    toast.classList.add('visible');
    
    setTimeout(() => {
        toast.classList.remove('visible');
    }, duration);
}

function announceToScreenReader(message) {
    const announcer = document.getElementById('srAnnouncer');
    announcer.textContent = message;
}

// ===== Audio Feedback =====
const sounds = {
    flip: new Audio('sounds/flip.mp3'),
    swipe: new Audio('sounds/swipe.mp3'),
    favorite: new Audio('sounds/favorite.mp3'),
    achievement: new Audio('sounds/achievement.mp3'),
    error: new Audio('sounds/error.mp3')
};

function playSound(soundName) {
    if (!state.settings.soundEnabled) return;
    
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(e => console.log('Sound play prevented:', e));
    }
}

// ===== Achievements =====
function checkForAchievements() {
    // Check completion percentage
    const completionPercentage = Math.round((state.completedCards.length / state.cards.length) * 100);
    
    if (completionPercentage === 25 && !localStorage.getItem('achievement_25')) {
        showAchievement('רבע דרך!', 'השלמת 25% מהכרטיסים');
        localStorage.setItem('achievement_25', 'true');
    } else if (completionPercentage === 50 && !localStorage.getItem('achievement_50')) {
        showAchievement('חצי דרך!', 'השלמת 50% מהכרטיסים');
        localStorage.setItem('achievement_50', 'true');
    } else if (completionPercentage === 75 && !localStorage.getItem('achievement_75')) {
        showAchievement('כמעט שם!', 'השלמת 75% מהכרטיסים');
        localStorage.setItem('achievement_75', 'true');
    } else if (completionPercentage === 100 && !localStorage.getItem('achievement_100')) {
        showAchievement('סיימת הכל!', 'השלמת את כל הכרטיסים');
        localStorage.setItem('achievement_100', 'true');
        showConfetti();
    }
    
    // Check streak achievements
    // Implementation for daily streaks would go here
}

function showAchievement(title, subtitle) {
    const achievement = document.querySelector('.achievement');
    const achievementTitle = achievement.querySelector('.achievement-title');
    const achievementSubtitle = achievement.querySelector('.achievement-subtitle');
    
    achievementTitle.textContent = title;
    achievementSubtitle.textContent = subtitle;
    
    achievement.classList.add('show');
    playSound('achievement');
    
    setTimeout(() => {
        achievement.classList.remove('show');
    }, 3000);
}

// ===== Confetti Animation =====
function showConfetti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    
    (function frame() {
        // Launch confetti from the sides
        confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
        
        confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });
        
        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// ===== Sharing =====
async function shareCard() {
    // Show loader
    document.getElementById('loader').classList.add('active');
    
    try {
        const card = document.querySelector('.scene');
        
        // Use html2canvas to capture the card
        const canvas = await html2canvas(card, {
            backgroundColor: null,
            scale: 2
        });
        
        // Convert to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        // Create file from blob
        const file = new File([blob], 'merhav-hadaat-card.png', { type: 'image/png' });
        
        // Check if Web Share API is available
        if (navigator.share) {
            await navigator.share({
                title: 'מרחב הדעת',
                text: 'שיתוף כרטיס ממרחב הדעת',
                files: [file]
            });
            showToast('הכרטיס שותף בהצלחה');
        } else {
            // Fallback for browsers that don't support sharing files
            const shareUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = shareUrl;
            a.download = 'merhav-hadaat-card.png';
            a.click();
            URL.revokeObjectURL(shareUrl);
            showToast('הכרטיס נשמר בהצלחה');
        }
    } catch (error) {
        console.error('Error sharing:', error);
        showToast('שגיאה בשיתוף הכרטיס');
    } finally {
        // Hide loader
        document.getElementById('loader').classList.remove('active');
    }
}
