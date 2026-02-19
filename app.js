// app.js — Merhav Hadaat: Consolidated Application Logic
'use strict';

// ===== STATE =====
const state = {
    currentCardIndex: 0,
    cards: [],
    favorites: [],
    completedCards: [],
    settings: { theme: 'default', fontSize: 'medium' },
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
        albumGrid:      document.getElementById('albumGrid'),
        scene:          document.getElementById('scene'),
        exportBtn:      document.getElementById('exportDataBtn'),
        importBtn:      document.getElementById('importDataBtn'),
        resetBtn:       document.getElementById('resetDataBtn'),
        cardNumberLabel:document.getElementById('cardNumberLabel'),
        gotoDialog:     document.getElementById('gotoDialog'),
        gotoInput:      document.getElementById('gotoInput'),
        gotoSubmit:     document.getElementById('gotoSubmit'),
        gotoClose:      document.getElementById('gotoClose'),
        noteBackdrop:   document.getElementById('noteBackdrop'),
    };
}

// ===== PERSISTENCE =====
function cardId(index) { return state.cards[index]?.id || 'card_' + (index + 1); }
function cardIndexById(id) { const i = state.cards.findIndex(c => c.id === id); return i >= 0 ? i : 0; }

function loadState() {
    try {
        const saved = localStorage.getItem('merhav_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migrate from index-based to id-based (one-time)
            if (parsed.favorites?.length && typeof parsed.favorites[0] === 'number') {
                parsed.favorites = parsed.favorites.map(i => state.cards[i]?.id).filter(Boolean);
            }
            if (parsed.completedCards?.length && typeof parsed.completedCards[0] === 'number') {
                parsed.completedCards = parsed.completedCards.map(i => state.cards[i]?.id).filter(Boolean);
            }
            if (parsed.notes && Object.keys(parsed.notes).some(k => /^\d+$/.test(k))) {
                const migrated = {};
                for (const [k, v] of Object.entries(parsed.notes)) {
                    const idx = parseInt(k);
                    if (!isNaN(idx) && state.cards[idx]) migrated[state.cards[idx].id] = v;
                    else migrated[k] = v;
                }
                parsed.notes = migrated;
            }
            Object.assign(state, parsed);
            if (state.currentCardIndex >= state.cards.length) state.currentCardIndex = 0;
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

    // Reset scroll position on both faces
    document.querySelectorAll('.card-content-scroll').forEach(el => el.scrollTop = 0);

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
    $.favBtn.classList.toggle('active', state.favorites.includes(card.id));

    // Note indicator
    $.noteBtn.classList.toggle('has-note', !!state.notes[card.id]);

    // Category-specific accent
    $.cardWrapper.className = 'card-wrapper';
    const catMap = { 'פרשת בא': 'category-ba', 'פרשת שמות': 'category-shmot', 'פרשת וארא': 'category-vaera', 'פרשת בשלח': 'category-beshalach', 'פרשת משפטים': 'category-mishpatim' };
    if (catMap[card.category]) $.cardWrapper.classList.add(catMap[card.category]);

    // Card number label
    if ($.cardNumberLabel) {
        $.cardNumberLabel.textContent = `${state.currentCardIndex + 1}/${state.cards.length}`;
    }

    // Announce
    const plainTitle = card.title.replace(/<[^>]*>/g, ' ');
    announce(`כרטיס ${state.currentCardIndex + 1} מתוך ${state.cards.length}: ${plainTitle}`);
}

// ===== NAVIGATION =====
function nextCard() {
    if (state.cards.length < 2) return;
    const idx = (state.currentCardIndex + 1) % state.cards.length;
    animateCardTransition(() => { state.currentCardIndex = idx; loadCurrentCard(); saveState(); });
}

function prevCard() {
    if (state.cards.length < 2) return;
    const idx = (state.currentCardIndex - 1 + state.cards.length) % state.cards.length;
    animateCardTransition(() => { state.currentCardIndex = idx; loadCurrentCard(); saveState(); });
}

function randomCard() {
    if (state.cards.length < 2) return;
    let idx;
    do { idx = Math.floor(Math.random() * state.cards.length); } while (idx === state.currentCardIndex);
    animateCardTransition(() => { state.currentCardIndex = idx; loadCurrentCard(); saveState(); });
}

function flipCard() {
    $.cardWrapper.classList.toggle('flipped');
    const id = cardId(state.currentCardIndex);
    if (!state.completedCards.includes(id)) {
        state.completedCards.push(id);
        saveState();
        checkAchievements();
    }
}

function animateCardTransition(callback) {
    $.cardWrapper.classList.add('drawing-out');
    setTimeout(() => {
        $.cardWrapper.classList.remove('drawing-out', 'flipped');
        callback();
        $.cardWrapper.classList.add('drawing-in');
        setTimeout(() => $.cardWrapper.classList.remove('drawing-in'), 600);
    }, 400);
}

// ===== FAVORITES =====
function toggleFavorite() {
    const id = cardId(state.currentCardIndex);
    if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter(i => i !== id);
        $.favBtn.classList.remove('active');
        showToast('הוסר מהמועדפים');
    } else {
        state.favorites.push(id);
        $.favBtn.classList.add('active');
        showToast('נוסף למועדפים ❤️');
    }
    saveState();
}

// ===== NOTES =====
function openNoteEditor() {
    const id = cardId(state.currentCardIndex);
    $.noteText.value = state.notes[id] || '';
    $.noteEditor.classList.add('open');
    if ($.noteBackdrop) $.noteBackdrop.classList.add('open');
    setTimeout(() => $.noteText.focus(), 300);
}

function closeNoteEditor() {
    $.noteEditor.classList.remove('open');
    if ($.noteBackdrop) $.noteBackdrop.classList.remove('open');
}

function saveNote() {
    const id = cardId(state.currentCardIndex);
    const text = $.noteText.value.trim();
    if (text) { state.notes[id] = text; showToast('ההערה נשמרה'); }
    else { delete state.notes[id]; showToast('ההערה נמחקה'); }
    $.noteBtn.classList.toggle('has-note', !!text);
    saveState();
    closeNoteEditor();
}

// ===== MODALS =====
let _modalTrigger = null;

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    _modalTrigger = document.activeElement;
    if (id === 'albumModal') { updateTabCounts(); buildAlbumGrid(); }
    modal.classList.add('open');
    // Focus first interactive element
    const focusable = modal.querySelector('button, [tabindex]:not([tabindex="-1"]), input');
    if (focusable) setTimeout(() => focusable.focus(), 100);
    announce('נפתח חלון ' + (modal.querySelector('.modal-header h3')?.textContent || ''));
}

function closeModal(modal) {
    if (typeof modal === 'string') modal = document.getElementById(modal);
    if (modal) modal.classList.remove('open');
    if (_modalTrigger) { _modalTrigger.focus(); _modalTrigger = null; }
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
    let count = 0;
    state.cards.forEach((card, i) => {
        if (filter === 'favorites' && !state.favorites.includes(card.id)) return;
        if (filter !== 'all' && filter !== 'favorites' && card.category !== filter) return;
        count++;

        const el = document.createElement('div');
        el.className = 'grid-item unlocked';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        if (i === state.currentCardIndex) el.classList.add('current');
        if (state.completedCards.includes(card.id)) el.classList.add('completed');
        // Show topic as label, short title below
        const topicSpan = document.createElement('div');
        topicSpan.className = 'grid-topic';
        topicSpan.textContent = card.topic || '';
        el.appendChild(topicSpan);
        const titleSpan = document.createElement('div');
        titleSpan.className = 'grid-title';
        titleSpan.textContent = card.title.replace(/<[^>]*>/g, ' ').trim();
        el.appendChild(titleSpan);
        if (state.favorites.includes(card.id)) {
            const heart = document.createElement('div');
            heart.className = 'grid-stats';
            heart.innerHTML = '<span class="grid-heart">♥</span>';
            el.appendChild(heart);
        }
        const goToCard = () => {
            state.currentCardIndex = i;
            loadCurrentCard();
            saveState();
            closeModal('albumModal');
        };
        el.addEventListener('click', goToCard);
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToCard(); } });
        $.albumGrid.appendChild(el);
    });
    // Empty state
    if (count === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px 20px;color:#BBB;font-size:14px;';
        empty.textContent = filter === 'favorites' ? 'עדיין אין מועדפים — לחצי ❤ על כרטיס כדי להוסיף' : 'אין כרטיסים בקטגוריה זו';
        $.albumGrid.appendChild(empty);
    }
}

function updateTabCounts() {
    document.querySelectorAll('#albumTabs .tab').forEach(tab => {
        const f = tab.dataset.filter;
        if (f === 'all') return; // no count for "all"
        let n;
        if (f === 'favorites') n = state.favorites.length;
        else n = state.cards.filter(c => c.category === f).length;
        // Strip old count
        const base = tab.textContent.replace(/\s*\(\d+\)$/, '');
        tab.textContent = `${base} (${n})`;
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
                if (!d || typeof d !== 'object') throw new Error('invalid');
                if (Array.isArray(d.favorites)) state.favorites = d.favorites.filter(f => typeof f === 'string');
                if (Array.isArray(d.completedCards)) state.completedCards = d.completedCards.filter(c => typeof c === 'string');
                if (d.settings && typeof d.settings === 'object') {
                    if (['default','dark','blue','green'].includes(d.settings.theme)) state.settings.theme = d.settings.theme;
                    if (['small','medium','large'].includes(d.settings.fontSize)) state.settings.fontSize = d.settings.fontSize;
                }
                if (d.notes && typeof d.notes === 'object' && !Array.isArray(d.notes)) state.notes = d.notes;
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
        // Capture the visible face, not the 3D scene
        const isFlipped = $.cardWrapper.classList.contains('flipped');
        const face = isFlipped ? document.getElementById('faceBack') : document.getElementById('faceFront');
        const canvas = await html2canvas(face, { backgroundColor: '#FDFBF7', scale: 2, useCORS: true, width: face.offsetWidth, height: face.offsetHeight });
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

    // Go-to card (card number label is clickable)
    $.cardNumberLabel.addEventListener('click', e => { e.stopPropagation(); openGotoDialog(); });
    $.gotoClose.addEventListener('click', closeGotoDialog);
    $.gotoSubmit.addEventListener('click', submitGoto);
    $.gotoInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitGoto(); });
    $.gotoDialog.addEventListener('click', e => { if (e.target === $.gotoDialog) closeGotoDialog(); });

    // Note editor
    $.noteSaveBtn.addEventListener('click', saveNote);
    $.noteCloseBtn.addEventListener('click', closeNoteEditor);
    if ($.noteBackdrop) $.noteBackdrop.addEventListener('click', closeNoteEditor);

    // Keyboard
    document.addEventListener('keydown', e => {
        // Escape closes any open overlay
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-overlay.open');
            if (openModal) { closeModal(openModal); return; }
            if ($.noteEditor.classList.contains('open')) { closeNoteEditor(); return; }
            if ($.gotoDialog.style.display !== 'none') { closeGotoDialog(); return; }
            return;
        }
        // Block shortcuts when overlays are open
        if (document.querySelector('.modal-overlay.open') || $.noteEditor.classList.contains('open') || $.gotoDialog.style.display !== 'none') return;
        switch (e.key) {
            case 'ArrowRight': prevCard(); break;
            case 'ArrowLeft':  nextCard(); break;
            case ' ': case 'Enter': e.preventDefault(); flipCard(); break;
            case 'f': case 'F': toggleFavorite(); break;
            case 'n': case 'N': openNoteEditor(); break;
            case 'r': case 'R': randomCard(); break;
        }
    });

    // Touch swipe with visual feedback
    let touchX = 0;
    $.scene.addEventListener('touchstart', e => { touchX = e.changedTouches[0].screenX; }, { passive: true });
    $.scene.addEventListener('touchmove', e => {
        const diff = e.changedTouches[0].screenX - touchX;
        const tilt = Math.max(-8, Math.min(8, diff / 15));
        const shift = Math.max(-30, Math.min(30, diff / 3));
        $.cardWrapper.style.transform = $.cardWrapper.classList.contains('flipped')
            ? `rotateY(180deg) translateX(${-shift}px) rotateZ(${-tilt}deg)`
            : `translateX(${shift}px) rotateZ(${tilt}deg)`;
    }, { passive: true });
    $.scene.addEventListener('touchend', e => {
        const diff = e.changedTouches[0].screenX - touchX;
        $.cardWrapper.style.transform = '';
        if (Math.abs(diff) > 60) { diff > 0 ? prevCard() : nextCard(); }
    }, { passive: true });
    $.scene.addEventListener('touchcancel', () => { $.cardWrapper.style.transform = ''; }, { passive: true });
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
    if (isInStandaloneMode()) return; // Already installed
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

// ===== WHATSAPP LINK LOGIC =====
function initWhatsAppLink() {
    const whatsappLink = document.querySelector('.whatsapp-link');
    if (!whatsappLink) return;

    // Check if user already joined
    if (localStorage.getItem('merhav_whatsapp_joined')) {
        whatsappLink.classList.add('hidden');
        return;
    }

    // Mark as joined when clicked
    whatsappLink.addEventListener('click', () => {
        localStorage.setItem('merhav_whatsapp_joined', 'true');
        setTimeout(() => {
            whatsappLink.classList.add('hidden');
        }, 300);
    });
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

    // Resume saved position (loadState already restored currentCardIndex)
    loadCurrentCard();

    // Wire install banner buttons
    const installBtn = document.getElementById('installBtn');
    const dismissBtn = document.getElementById('installDismiss');
    if (installBtn) installBtn.addEventListener('click', installApp);
    if (dismissBtn) dismissBtn.addEventListener('click', dismissInstallBanner);

    // Initialize WhatsApp link
    initWhatsAppLink();
});
