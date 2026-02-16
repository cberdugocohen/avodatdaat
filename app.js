// app.js — Merhav Hadaat: Consolidated Application Logic
'use strict';

// ===== STATE =====
const state = {
    currentCardIndex: 0,
    cards: [],
    favorites: [],
    completedCards: [],
    settings: { theme: 'default', fontSize: 'medium', soundEnabled: true },
    notes: {},
};

// ===== DOM REFS (populated on init) =====
let $;

function cacheDom() {
    $ = {
        cardWrapper:    document.getElementById('cardWrapper'),
        frontTitle:     document.getElementById('frontTitle'),
        frontContent:   document.getElementById('frontContent'),
        frontCategory:  document.getElementById('frontCategory'),
        frontSource:    document.getElementById('frontSource'),
        backSteps:      document.getElementById('backSteps'),
        progressBar:    document.getElementById('progressBar'),
        dayLabel:       document.getElementById('dayLabelText'),
        progressPct:    document.getElementById('progressPct'),
        favBtn:         document.getElementById('favBtn'),
        noteBtn:        document.getElementById('noteBtn'),
        shareBtn:       document.getElementById('shareBtn'),
        prevBtn:        document.getElementById('prevBtn'),
        nextBtn:        document.getElementById('nextBtn'),
        randomBtn:      document.getElementById('randomBtn'),
        toast:          document.getElementById('toast'),
        loader:         document.getElementById('loader'),
        achievement:    document.getElementById('achievement'),
        srAnnouncer:    document.getElementById('srAnnouncer'),
        noteEditor:     document.getElementById('noteEditor'),
        noteText:       document.getElementById('noteText'),
        noteCloseBtn:   document.getElementById('noteCloseBtn'),
        noteSaveBtn:    document.getElementById('noteSaveBtn'),
        onboarding:     document.getElementById('onboarding'),
        onboardingNext: document.getElementById('onboardingNext'),
        onboardingClose:document.getElementById('onboardingClose'),
        soundToggle:    document.getElementById('soundToggle'),
        albumGrid:      document.getElementById('albumGrid'),
        scene:          document.getElementById('scene'),
        exportBtn:      document.getElementById('exportDataBtn'),
        importBtn:      document.getElementById('importDataBtn'),
        resetBtn:       document.getElementById('resetDataBtn'),
        cardNumberLabel:document.getElementById('cardNumberLabel'),
        gotoBtn:        document.getElementById('gotoBtn'),
        gotoDialog:     document.getElementById('gotoDialog'),
        gotoInput:      document.getElementById('gotoInput'),
        gotoSubmit:     document.getElementById('gotoSubmit'),
        gotoClose:      document.getElementById('gotoClose'),
    };
}

// ===== PERSISTENCE =====
function loadState() {
    try {
        const saved = localStorage.getItem('merhav_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
            // Bounds-check against current card count
            if (state.currentCardIndex >= state.cards.length) state.currentCardIndex = 0;
            state.favorites = state.favorites.filter(i => i < state.cards.length);
            state.completedCards = state.completedCards.filter(i => i < state.cards.length);
        }
    } catch (e) { console.error('loadState:', e); }
}

function saveState() {
    try {
        localStorage.setItem('merhav_state', JSON.stringify({
            currentCardIndex: state.currentCardIndex,
            favorites: state.favorites,
            completedCards: state.completedCards,
            settings: state.settings,
            notes: state.notes,
        }));
    } catch (e) { console.error('saveState:', e); }
}

// ===== CARD RENDERING =====
function loadCurrentCard() {
    if (!state.cards.length) return;
    const card = state.cards[state.currentCardIndex];
    if (!card) return;

    // Front (content contains HTML: <br>, <strong>, <em>)
    $.frontTitle.innerHTML = card.title;
    $.frontContent.innerHTML = card.content;
    $.frontCategory.textContent = card.topic || card.category || '';
    $.frontSource.textContent = card.source || '';

    // Back — steps
    if (card.steps && card.steps.length) {
        $.backSteps.innerHTML = card.steps.map((s, i) =>
            `<div class="step-item"><div class="step-num">${i + 1}</div><div><div class="step-title">${s.t || ''}</div><div class="step-desc">${s.d || s}</div></div></div>`
        ).join('');
    } else {
        $.backSteps.innerHTML = '<p class="step-desc">הרהרי במשמעות של המסר הזה עבורך.</p>';
    }

    // Favorite state
    $.favBtn.classList.toggle('active', state.favorites.includes(state.currentCardIndex));

    // Note indicator
    $.noteBtn.classList.toggle('has-note', !!state.notes[state.currentCardIndex]);

    // Category-specific accent
    $.cardWrapper.className = 'card-wrapper';
    const catMap = { 'פרשת בא': 'category-ba', 'פרשת שמות': 'category-shmot', 'פרשת וארא': 'category-vaera', 'פרשת בשלח': 'category-beshalach' };
    if (catMap[card.category]) $.cardWrapper.classList.add(catMap[card.category]);

    // Card number label
    if ($.cardNumberLabel) {
        $.cardNumberLabel.textContent = `כרטיס ${state.currentCardIndex + 1} מתוך ${state.cards.length}`;
    }

    // Announce
    const plainTitle = card.title.replace(/<[^>]*>/g, ' ');
    announce(`כרטיס ${state.currentCardIndex + 1} מתוך ${state.cards.length}: ${plainTitle}`);
}

// ===== NAVIGATION =====
function nextCard() {
    randomCard();
}

function prevCard() {
    randomCard();
}

function randomCard() {
    if (state.cards.length < 2) return;
    let idx;
    do { idx = Math.floor(Math.random() * state.cards.length); } while (idx === state.currentCardIndex);
    animateCardTransition(() => { state.currentCardIndex = idx; loadCurrentCard(); saveState(); });
    showToast('קלף חדש נשלף ✨');
}

function flipCard() {
    $.cardWrapper.classList.toggle('flipped');
    if (!state.completedCards.includes(state.currentCardIndex)) {
        state.completedCards.push(state.currentCardIndex);
        saveState();
        checkAchievements();
    }
}

function animateCardTransition(callback) {
    $.cardWrapper.classList.add('drawing-out');
    setTimeout(() => {
        $.cardWrapper.classList.remove('drawing-out');
        callback();
        $.cardWrapper.classList.add('drawing-in');
        setTimeout(() => $.cardWrapper.classList.remove('drawing-in'), 600);
    }, 400);
}

// ===== FAVORITES =====
function toggleFavorite() {
    const idx = state.currentCardIndex;
    if (state.favorites.includes(idx)) {
        state.favorites = state.favorites.filter(i => i !== idx);
        $.favBtn.classList.remove('active');
        showToast('הוסר מהמועדפים');
    } else {
        state.favorites.push(idx);
        $.favBtn.classList.add('active');
        showToast('נוסף למועדפים ❤️');
    }
    saveState();
}

// ===== NOTES =====
function openNoteEditor() {
    $.noteText.value = state.notes[state.currentCardIndex] || '';
    $.noteEditor.classList.add('open');
    setTimeout(() => $.noteText.focus(), 300);
}

function closeNoteEditor() { $.noteEditor.classList.remove('open'); }

function saveNote() {
    const text = $.noteText.value.trim();
    if (text) { state.notes[state.currentCardIndex] = text; showToast('ההערה נשמרה'); }
    else { delete state.notes[state.currentCardIndex]; showToast('ההערה נמחקה'); }
    $.noteBtn.classList.toggle('has-note', !!text);
    saveState();
    closeNoteEditor();
}

// ===== MODALS =====
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (id === 'albumModal') buildAlbumGrid();
    modal.classList.add('open');
    announce('נפתח חלון ' + (modal.querySelector('.modal-header h3')?.textContent || ''));
}

function closeModal(modal) {
    if (typeof modal === 'string') modal = document.getElementById(modal);
    if (modal) modal.classList.remove('open');
}

function setupModals() {
    // Open triggers
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => openModal(btn.dataset.modal));
    });
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay')));
    });
    // Click outside
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); });
    });
}

// ===== ALBUM =====
function buildAlbumGrid(filter = 'all') {
    $.albumGrid.innerHTML = '';
    state.cards.forEach((card, i) => {
        if (filter === 'favorites' && !state.favorites.includes(i)) return;
        if (filter !== 'all' && filter !== 'favorites' && card.category !== filter) return;

        const el = document.createElement('div');
        el.className = 'grid-item unlocked';
        if (i === state.currentCardIndex) el.classList.add('current');
        if (state.completedCards.includes(i)) el.classList.add('completed');
        // Show topic as label, short title below
        const topicSpan = document.createElement('div');
        topicSpan.className = 'grid-topic';
        topicSpan.textContent = card.topic || '';
        el.appendChild(topicSpan);
        const titleSpan = document.createElement('div');
        titleSpan.className = 'grid-title';
        titleSpan.textContent = card.title.replace(/<[^>]*>/g, ' ').trim();
        el.appendChild(titleSpan);
        if (state.favorites.includes(i)) {
            const heart = document.createElement('div');
            heart.className = 'grid-stats';
            heart.innerHTML = '<span class="grid-heart">♥</span>';
            el.appendChild(heart);
        }
        el.addEventListener('click', () => {
            state.currentCardIndex = i;
            loadCurrentCard();
            saveState();
            closeModal('albumModal');
        });
        $.albumGrid.appendChild(el);
    });
}

function setupAlbumTabs() {
    document.querySelectorAll('#albumTabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#albumTabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            buildAlbumGrid(tab.dataset.filter);
        });
    });
}

// ===== SETTINGS =====
function applySettings() {
    setTheme(state.settings.theme);
    setFontSize(state.settings.fontSize);
    $.soundToggle.checked = state.settings.soundEnabled;
    updateSettingsUI();
}

function setTheme(theme) {
    document.body.classList.remove('default-theme', 'dark-theme', 'blue-theme', 'green-theme');
    document.body.classList.add(theme + '-theme');
    state.settings.theme = theme;
    saveState();
    updateSettingsUI();
}

function setFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add('font-' + size);
    state.settings.fontSize = size;
    saveState();
    updateSettingsUI();
}

function updateSettingsUI() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
    });
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.fontSize === state.settings.fontSize);
    });
}

function setupSettings() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.addEventListener('click', () => setFontSize(btn.dataset.fontSize));
    });
    $.soundToggle.addEventListener('change', () => {
        state.settings.soundEnabled = $.soundToggle.checked;
        saveState();
    });
    $.exportBtn.addEventListener('click', exportData);
    $.importBtn.addEventListener('click', importData);
    $.resetBtn.addEventListener('click', resetData);
}

// ===== DATA MANAGEMENT =====
function exportData() {
    try {
        const blob = new Blob([JSON.stringify({ favorites: state.favorites, completedCards: state.completedCards, settings: state.settings, notes: state.notes, exportDate: new Date().toISOString() })], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'merhav-hadaat-backup.json';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('הנתונים יוצאו בהצלחה');
    } catch (e) { showToast('שגיאה ביצוא'); }
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const d = JSON.parse(ev.target.result);
                if (d.favorites) state.favorites = d.favorites;
                if (d.completedCards) state.completedCards = d.completedCards;
                if (d.settings) state.settings = d.settings;
                if (d.notes) state.notes = d.notes;
                saveState(); applySettings(); loadCurrentCard();
                showToast('הנתונים יובאו בהצלחה');
            } catch (err) { showToast('שגיאה ביבוא — קובץ לא תקין'); }
        };
        reader.readAsText(e.target.files[0]);
    };
    input.click();
}

function resetData() {
    if (!confirm('האם לאפס את כל הנתונים? פעולה זו בלתי הפיכה.')) return;
    localStorage.removeItem('merhav_state');
    localStorage.removeItem('merhav_onboarded');
    ['25','50','75','100'].forEach(n => localStorage.removeItem('achievement_' + n));
    state.currentCardIndex = 0;
    state.favorites = [];
    state.completedCards = [];
    state.notes = {};
    state.settings = { theme: 'default', fontSize: 'medium', soundEnabled: true };
    applySettings();
    loadCurrentCard();
    showToast('כל הנתונים אופסו');
}

// ===== ONBOARDING =====
function setupOnboarding() {
    if (localStorage.getItem('merhav_onboarded')) return;
    const overlay = $.onboarding;
    const steps = overlay.querySelectorAll('.onboarding-step');
    const dots = overlay.querySelectorAll('.dot');
    let current = 0;
    overlay.classList.add('show');

    function goStep(n) {
        steps[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = n;
        if (current >= steps.length) { finish(); return; }
        steps[current].classList.add('active');
        dots[current].classList.add('active');
        $.onboardingNext.textContent = current === steps.length - 1 ? 'התחילי!' : 'הבא';
    }
    function finish() {
        overlay.classList.remove('show');
        localStorage.setItem('merhav_onboarded', 'true');
    }
    $.onboardingNext.addEventListener('click', () => goStep(current + 1));
    $.onboardingClose.addEventListener('click', finish);
}

// ===== ACHIEVEMENTS =====
function checkAchievements() {
    const pct = Math.round((state.completedCards.length / state.cards.length) * 100);
    const milestones = [
        { p: 25, title: 'רבע דרך!', sub: 'השלמת 25% מהכרטיסים' },
        { p: 50, title: 'חצי דרך!', sub: 'השלמת 50% מהכרטיסים' },
        { p: 75, title: 'כמעט שם!', sub: 'השלמת 75% מהכרטיסים' },
        { p: 100, title: 'סיימת הכל! 🎉', sub: 'השלמת את כל הכרטיסים' }
    ];
    for (const m of milestones) {
        if (pct >= m.p && !localStorage.getItem('achievement_' + m.p)) {
            localStorage.setItem('achievement_' + m.p, 'true');
            showAchievement(m.title, m.sub);
            if (m.p === 100 && typeof confetti === 'function') showConfetti();
            break;
        }
    }
}

function showAchievement(title, subtitle) {
    $.achievement.querySelector('.achievement-title').textContent = title;
    $.achievement.querySelector('.achievement-subtitle').textContent = subtitle;
    $.achievement.classList.add('show');
    setTimeout(() => $.achievement.classList.remove('show'), 3500);
}

function showConfetti() {
    const end = Date.now() + 3000;
    (function frame() {
        confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

// ===== SHARING =====
async function shareCard() {
    $.loader.classList.add('active');
    try {
        const canvas = await html2canvas($.scene, { backgroundColor: '#FDFBF7', scale: 2, useCORS: true });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        if (navigator.share) {
            const plainTitle = (state.cards[state.currentCardIndex]?.title || '').replace(/<[^>]*>/g, ' ');
            await navigator.share({ title: 'מרחב הדעת', text: plainTitle, files: [new File([blob], 'merhav-card.png', { type: 'image/png' })] });
        } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'merhav-card.png';
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('הכרטיס נשמר כתמונה');
        }
    } catch (e) { if (e.name !== 'AbortError') showToast('שגיאה בשיתוף'); }
    finally { $.loader.classList.remove('active'); }
}

// ===== UI HELPERS =====
function showToast(msg, duration = 2500) {
    $.toast.textContent = msg;
    $.toast.classList.add('visible');
    setTimeout(() => $.toast.classList.remove('visible'), duration);
}

function announce(msg) {
    if ($.srAnnouncer) $.srAnnouncer.textContent = msg;
}

// ===== GO-TO CARD =====
function openGotoDialog() {
    $.gotoDialog.style.display = 'flex';
    $.gotoInput.value = '';
    $.gotoInput.max = state.cards.length;
    $.gotoInput.focus();
}

function closeGotoDialog() {
    $.gotoDialog.style.display = 'none';
}

function submitGoto() {
    const num = parseInt($.gotoInput.value);
    if (isNaN(num) || num < 1 || num > state.cards.length) {
        showToast(`הכניסי מספר בין 1 ל-${state.cards.length}`);
        return;
    }
    const idx = num - 1;
    animateCardTransition(() => { state.currentCardIndex = idx; loadCurrentCard(); saveState(); });
    closeGotoDialog();
    showToast(`כרטיס ${num} ✨`);
}

// ===== EVENTS =====
function setupEvents() {
    // Card flip
    $.cardWrapper.addEventListener('click', flipCard);

    // Navigation
    $.nextBtn.addEventListener('click', e => { e.stopPropagation(); nextCard(); });
    $.prevBtn.addEventListener('click', e => { e.stopPropagation(); prevCard(); });
    $.randomBtn.addEventListener('click', e => { e.stopPropagation(); randomCard(); });

    // Controls
    $.favBtn.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(); });
    $.noteBtn.addEventListener('click', e => { e.stopPropagation(); openNoteEditor(); });
    $.shareBtn.addEventListener('click', e => { e.stopPropagation(); shareCard(); });

    // Go-to card
    $.gotoBtn.addEventListener('click', e => { e.stopPropagation(); openGotoDialog(); });
    $.gotoClose.addEventListener('click', closeGotoDialog);
    $.gotoSubmit.addEventListener('click', submitGoto);
    $.gotoInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitGoto(); });
    $.gotoDialog.addEventListener('click', e => { if (e.target === $.gotoDialog) closeGotoDialog(); });

    // Note editor
    $.noteSaveBtn.addEventListener('click', saveNote);
    $.noteCloseBtn.addEventListener('click', closeNoteEditor);

    // Keyboard
    document.addEventListener('keydown', e => {
        if (document.querySelector('.modal-overlay.open') || $.noteEditor.classList.contains('open')) {
            if (e.key === 'Escape') {
                closeModal(document.querySelector('.modal-overlay.open'));
                closeNoteEditor();
            }
            return;
        }
        switch (e.key) {
            case 'ArrowRight': prevCard(); break;
            case 'ArrowLeft':  nextCard(); break;
            case ' ': case 'Enter': e.preventDefault(); flipCard(); break;
            case 'f': case 'F': toggleFavorite(); break;
            case 'n': case 'N': openNoteEditor(); break;
            case 'r': case 'R': randomCard(); break;
            case 'Escape': break;
        }
    });

    // Touch swipe
    let touchX = 0;
    $.scene.addEventListener('touchstart', e => { touchX = e.changedTouches[0].screenX; }, { passive: true });
    $.scene.addEventListener('touchend', e => {
        const diff = e.changedTouches[0].screenX - touchX;
        if (Math.abs(diff) > 60) { diff > 0 ? prevCard() : nextCard(); }
    }, { passive: true });
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(e => console.log('SW:', e));
    });
}

// ===== PWA INSTALL PROMPT =====
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
});

function showInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (!banner || localStorage.getItem('merhav_install_dismissed')) return;
    banner.style.display = 'flex';
}

function installApp() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(result => {
            if (result.outcome === 'accepted') showToast('האפליקציה הותקנה! ✨');
            deferredInstallPrompt = null;
            document.getElementById('installBanner').style.display = 'none';
        });
    } else {
        // Fallback: show toast with manual instructions
        showToast('בתפריט הדפדפן בחרי "הוספה למסך הבית" 📲');
        document.getElementById('installBanner').style.display = 'none';
    }
}

function dismissInstallBanner() {
    document.getElementById('installBanner').style.display = 'none';
    localStorage.setItem('merhav_install_dismissed', 'true');
}

function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    state.cards = typeof cardData !== 'undefined' ? cardData : [];
    loadState();
    setupModals();
    setupSettings();
    setupAlbumTabs();
    setupEvents();
    applySettings();

    // Always start with a random card
    state.currentCardIndex = Math.floor(Math.random() * state.cards.length);
    loadCurrentCard();
    setupOnboarding();

    // Wire install banner buttons
    const installBtn = document.getElementById('installBtn');
    const dismissBtn = document.getElementById('installDismiss');
    if (installBtn) installBtn.addEventListener('click', installApp);
    if (dismissBtn) dismissBtn.addEventListener('click', dismissInstallBanner);
});
