// navigation.js - Handles card navigation and random card selection

// Function to navigate to a specific card by index
function goToCard(index) {
    // Validate index
    if (index < 0) index = 0;
    if (index >= state.cards.length) index = state.cards.length - 1;
    
    // Set current index and load card
    state.currentCardIndex = index;
    loadCurrentCard();
    saveState();
}

// Function to go to next card
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

// Function to go to previous card
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

// Function to select a random card
function randomCard() {
    const oldIndex = state.currentCardIndex;
    let newIndex;
    
    // If we have less than 2 cards, there's no point in randomizing
    if (state.cards.length < 2) return;
    
    // Keep generating random indices until we get one different from current
    do {
        newIndex = Math.floor(Math.random() * state.cards.length);
    } while (newIndex === oldIndex);
    
    // Go to the random card
    state.currentCardIndex = newIndex;
    loadCurrentCard();
    playSound('swipe');
    saveState();
    
    showToast('כרטיס אקראי נבחר');
}

// Add navigation buttons to the UI
function addNavigationButtons() {
    const scene = document.querySelector('.scene');
    
    // Create navigation container
    const navContainer = document.createElement('div');
    navContainer.className = 'navigation-controls';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'nav-button prev-button';
    prevButton.innerHTML = '&larr;';
    prevButton.setAttribute('aria-label', 'כרטיס קודם');
    prevButton.onclick = function(e) {
        e.stopPropagation();
        prevCard();
    };
    
    // Random button
    const randomButton = document.createElement('button');
    randomButton.className = 'nav-button random-button';
    randomButton.innerHTML = '🔄';
    randomButton.setAttribute('aria-label', 'כרטיס אקראי');
    randomButton.onclick = function(e) {
        e.stopPropagation();
        randomCard();
    };
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'nav-button next-button';
    nextButton.innerHTML = '&rarr;';
    nextButton.setAttribute('aria-label', 'כרטיס הבא');
    nextButton.onclick = function(e) {
        e.stopPropagation();
        nextCard();
    };
    
    // Add buttons to container
    navContainer.appendChild(prevButton);
    navContainer.appendChild(randomButton);
    navContainer.appendChild(nextButton);
    
    // Add container after the scene
    scene.parentNode.insertBefore(navContainer, scene.nextSibling);
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', function() {
    addNavigationButtons();
    
    // Add tooltip to explain the pencil icon
    const noteBtn = document.getElementById('noteBtn');
    if (noteBtn) {
        noteBtn.setAttribute('title', 'הוספת הערות אישיות לכרטיס');
        
        // Add tooltip explanation on first visit
        if (!localStorage.getItem('note_tooltip_shown')) {
            setTimeout(() => {
                showToast('לחץ על סמל העיפרון להוספת הערות אישיות לכרטיס');
                localStorage.setItem('note_tooltip_shown', 'true');
            }, 5000);
        }
    }
});
