// app.js

// Global state
let decks = [];
let masteredWords = new Set();
let currentScreen = 'decks'; // 'decks', 'study', 'search'
let activeDeckIndex = null;
let activeCardIndex = 0;
let isFlipped = false;
let showingFrontMnemonic = false;
let searchQuery = '';

// Constants
const CARDS_PER_DECK = 10;

// Initialize the app
function init() {
  loadProgress();
  prepareDecks();
  setupEventListeners();
  renderOverallStats();
  renderDashboard();
  renderSearch();
  showScreen('decks');
}

// Load progress from LocalStorage
function loadProgress() {
  try {
    const saved = localStorage.getItem('gre_mastered_words');
    if (saved) {
      const parsed = JSON.parse(saved);
      masteredWords = new Set(parsed);
    }
  } catch (e) {
    console.error("Error loading progress from localStorage", e);
    masteredWords = new Set();
  }
}

// Save progress to LocalStorage
function saveProgress() {
  try {
    localStorage.setItem('gre_mastered_words', JSON.stringify([...masteredWords]));
  } catch (e) {
    console.error("Error saving progress to localStorage", e);
  }
}

// Split the parsed flashcardsData into decks of exactly 10 cards
function prepareDecks() {
  decks = [];
  const totalCards = flashcardsData.length;
  
  for (let i = 0; i < totalCards; i += CARDS_PER_DECK) {
    const deckCards = flashcardsData.slice(i, i + CARDS_PER_DECK);
    decks.push({
      index: decks.length,
      cards: deckCards,
      range: `${deckCards[0].word} - ${deckCards[deckCards.length - 1].word}`
    });
  }
}

// Show a specific screen and hide others
function showScreen(screenId) {
  currentScreen = screenId;
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  const targetScreen = document.getElementById(`${screenId}-screen`);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }

  // Update navigation tab states
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.dataset.screen === screenId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Extra screen-specific logic
  if (screenId === 'decks') {
    activeDeckIndex = null;
    renderDashboard();
    renderOverallStats();
  } else if (screenId === 'search') {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }
}

// Render Dashboard (Decks Grid)
function renderDashboard() {
  const decksGrid = document.getElementById('decks-grid');
  if (!decksGrid) return;

  decksGrid.innerHTML = '';
  
  decks.forEach(deck => {
    const totalDeckCards = deck.cards.length;
    const masteredCount = deck.cards.filter(c => masteredWords.has(c.word)).length;
    const progressPercent = Math.round((masteredCount / totalDeckCards) * 100);
    const isCompleted = masteredCount === totalDeckCards;
    
    const deckItem = document.createElement('div');
    deckItem.className = `deck-item ${isCompleted ? 'completed' : ''}`;
    deckItem.innerHTML = `
      <div class="deck-header">
        <span class="deck-number">Deck ${deck.index + 1}</span>
        <span class="deck-badge">${isCompleted ? 'Selesai' : 'Belum Selesai'}</span>
      </div>
      <div class="deck-range">${deck.range}</div>
      <div class="deck-footer">
        <div class="deck-progress-container">
          <span class="deck-progress-text">${masteredCount} / ${totalDeckCards} Card</span>
          <span>${progressPercent}%</span>
        </div>
        <div class="deck-progress-bar-bg">
          <div class="deck-progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
    `;
    
    deckItem.addEventListener('click', () => {
      startStudy(deck.index);
    });
    
    decksGrid.appendChild(deckItem);
  });
}

// Render overall stats in header and dashboard card summary
function renderOverallStats() {
  const totalWords = flashcardsData.length;
  const totalMastered = masteredWords.size;
  const masteredPercent = Math.round((totalMastered / totalWords) * 100);
  
  // Calculate completed decks
  let completedDecksCount = 0;
  decks.forEach(deck => {
    const isCompleted = deck.cards.every(c => masteredWords.has(c.word));
    if (isCompleted) completedDecksCount++;
  });

  // Update DOM elements
  const elTotalWords = document.getElementById('stat-total-words');
  const elMasteredWords = document.getElementById('stat-mastered-words');
  const elCompletedDecks = document.getElementById('stat-completed-decks');
  
  const dbTotalWords = document.getElementById('db-total-words');
  const dbMasteredWords = document.getElementById('db-mastered-words');
  const dbCompletedDecks = document.getElementById('db-completed-decks');

  if (elTotalWords) elTotalWords.textContent = totalWords;
  if (elMasteredWords) elMasteredWords.textContent = `${totalMastered} (${masteredPercent}%)`;
  if (elCompletedDecks) elCompletedDecks.textContent = `${completedDecksCount} / ${decks.length}`;

  if (dbTotalWords) dbTotalWords.textContent = totalWords;
  if (dbMasteredWords) dbMasteredWords.textContent = `${totalMastered} (${masteredPercent}%)`;
  if (dbCompletedDecks) dbCompletedDecks.textContent = `${completedDecksCount} / ${decks.length}`;
}

// Start studying a specific deck
function startStudy(deckIndex) {
  activeDeckIndex = deckIndex;
  activeCardIndex = 0;
  isFlipped = false;
  showingFrontMnemonic = false;
  
  // Update UI Elements
  document.getElementById('study-deck-title').textContent = `Deck ${deckIndex + 1}`;
  document.getElementById('study-deck-range').textContent = decks[deckIndex].range;
  
  showScreen('study');
  updateStudyProgress();
  renderCard();
}

// Update Study Progress Bar and text
function updateStudyProgress() {
  if (activeDeckIndex === null) return;
  const deck = decks[activeDeckIndex];
  const total = deck.cards.length;
  const currentNum = activeCardIndex + 1;
  const progressPercent = Math.round((currentNum / total) * 100);
  
  document.getElementById('study-progress-text').textContent = `Card ${currentNum} dari ${total}`;
  document.getElementById('study-progress-fill').style.width = `${progressPercent}%`;
}

// Render current flashcard contents
function renderCard() {
  if (activeDeckIndex === null) return;
  const deck = decks[activeDeckIndex];
  const cardData = deck.cards[activeCardIndex];
  const isMastered = masteredWords.has(cardData.word);
  
  const cardElement = document.getElementById('flashcard');
  const innerElement = cardElement.querySelector('.card-inner');
  
  // Set Flip state classes
  cardElement.className = `card ${isMastered ? 'is-mastered' : ''}`;
  isFlipped = false;
  innerElement.style.transform = 'rotateY(0deg)';
  
  // Hide mnemonic drawer on front
  showingFrontMnemonic = false;
  document.getElementById('front-mnemonic-drawer').classList.remove('active');
  
  // Card Front
  document.getElementById('card-word').textContent = cardData.word;
  document.getElementById('card-index').textContent = `${activeCardIndex + 1} / ${deck.cards.length}`;
  
  // Setup front mnemonic content
  document.getElementById('front-mnemonic-text').textContent = cardData.mnemonic || 'Tidak ada mnemonik untuk kata ini.';
  
  // Card Back
  document.getElementById('card-definition').textContent = cardData.definition;
  document.getElementById('card-mnemonic').textContent = cardData.mnemonic || 'Tidak ada mnemonik untuk kata ini.';
  document.getElementById('card-back-word-title').textContent = cardData.word;
  
  // Update Mastery Button State
  const masteryBtn = document.getElementById('study-mastery-btn');
  if (isMastered) {
    masteryBtn.classList.add('is-mastered');
    masteryBtn.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      Mastered
    `;
  } else {
    masteryBtn.classList.remove('is-mastered');
    masteryBtn.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>
      Tandai Mastered
    `;
  }
}

// Flip Card Action
function flipCard() {
  if (activeDeckIndex === null) return;
  isFlipped = !isFlipped;
  const innerElement = document.querySelector('.card-inner');
  innerElement.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  
  // If flipping back to front, close front mnemonic drawer
  if (!isFlipped && showingFrontMnemonic) {
    toggleFrontMnemonic();
  }
}

// Next Card Action
function nextCard() {
  if (activeDeckIndex === null) return;
  const deck = decks[activeDeckIndex];
  if (activeCardIndex < deck.cards.length - 1) {
    activeCardIndex++;
    updateStudyProgress();
    renderCard();
  } else {
    // Reached the end of the deck
    checkDeckCompletion();
  }
}

// Previous Card Action
function prevCard() {
  if (activeDeckIndex === null) return;
  if (activeCardIndex > 0) {
    activeCardIndex--;
    updateStudyProgress();
    renderCard();
  }
}

// Toggle current card as mastered
function toggleMastered() {
  if (activeDeckIndex === null) return;
  const deck = decks[activeDeckIndex];
  const cardData = deck.cards[activeCardIndex];
  
  if (masteredWords.has(cardData.word)) {
    masteredWords.delete(cardData.word);
  } else {
    masteredWords.add(cardData.word);
  }
  
  saveProgress();
  renderCard();
  renderOverallStats();
}

// Toggle Front Mnemonic Drawer
function toggleFrontMnemonic(e) {
  if (e) e.stopPropagation(); // Avoid triggering card flip
  if (activeDeckIndex === null || isFlipped) return;
  
  showingFrontMnemonic = !showingFrontMnemonic;
  const drawer = document.getElementById('front-mnemonic-drawer');
  if (showingFrontMnemonic) {
    drawer.classList.add('active');
  } else {
    drawer.classList.remove('active');
  }
}

// Check if deck is completed and display celebration modal
function checkDeckCompletion() {
  if (activeDeckIndex === null) return;
  const deck = decks[activeDeckIndex];
  const masteredCount = deck.cards.filter(c => masteredWords.has(c.word)).length;
  
  const celebrationOverlay = document.getElementById('celebration-overlay');
  const celebrationTitle = document.getElementById('celebration-title');
  const celebrationDesc = document.getElementById('celebration-desc');
  const nextDeckBtn = document.getElementById('celebration-next-deck-btn');
  
  // Customize celebration text
  if (masteredCount === deck.cards.length) {
    celebrationTitle.textContent = "Luar Biasa!";
    celebrationDesc.textContent = `Anda telah menguasai semua 10 kosakata di Deck ${activeDeckIndex + 1}! Terus pertahankan semangat belajarnya!`;
    triggerConfetti();
  } else {
    celebrationTitle.textContent = "Deck Selesai Ditinjau!";
    celebrationDesc.textContent = `Anda telah meninjau semua kartu di Deck ${activeDeckIndex + 1}. Anda menguasai ${masteredCount} dari ${deck.cards.length} kartu.`;
  }
  
  // Handle next deck button visibility
  if (activeDeckIndex < decks.length - 1) {
    nextDeckBtn.style.display = 'block';
    nextDeckBtn.textContent = `Lanjut ke Deck ${activeDeckIndex + 2}`;
  } else {
    nextDeckBtn.style.display = 'none';
  }
  
  celebrationOverlay.classList.add('active');
}

// Confetti particle generator
function triggerConfetti() {
  const container = document.body;
  const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
  
  for (let i = 0; i < 60; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.transform = 'scale(' + (Math.random() * 0.7 + 0.3) + ')';
    confetti.style.animationDelay = Math.random() * 2 + 's';
    confetti.style.animationDuration = Math.random() * 1.5 + 1.5 + 's';
    
    container.appendChild(confetti);
    
    // Remove particle after animation ends
    setTimeout(() => {
      confetti.remove();
    }, 3500);
  }
}

// Render Search results
function renderSearch() {
  const listContainer = document.getElementById('vocab-list');
  const statsLabel = document.getElementById('search-results-stats');
  if (!listContainer) return;

  listContainer.innerHTML = '';
  
  const query = searchQuery.trim().toLowerCase();
  
  const filtered = flashcardsData.filter(card => {
    return card.word.toLowerCase().includes(query) || 
           card.definition.toLowerCase().includes(query) ||
           card.mnemonic.toLowerCase().includes(query);
  });
  
  if (statsLabel) {
    statsLabel.textContent = `Menampilkan ${filtered.length} dari ${flashcardsData.length} kosakata`;
  }
  
  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <p>Tidak ada kata yang cocok dengan pencarian Anda.</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(card => {
    // Find which deck this card belongs to
    const wordIndex = flashcardsData.findIndex(c => c.word === card.word);
    const deckIndex = Math.floor(wordIndex / CARDS_PER_DECK);
    const isMastered = masteredWords.has(card.word);
    
    const item = document.createElement('div');
    item.className = `vocab-item ${isMastered ? 'is-mastered' : ''}`;
    item.innerHTML = `
      <div class="vocab-item-header">
        <div class="vocab-word-info">
          <span class="vocab-word">${card.word}</span>
          <span class="vocab-deck-link" data-deck="${deckIndex}">Deck ${deckIndex + 1}</span>
        </div>
        <div class="vocab-mastery-indicator">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          Mastered
        </div>
      </div>
      <div class="vocab-item-body">
        <div>
          <span class="vocab-definition-label">Makna</span>
          <p class="vocab-definition">${card.definition}</p>
        </div>
        ${card.mnemonic ? `
          <div class="vocab-mnemonic-box">
            <span class="vocab-mnemonic-label">Mnemonik</span>
            <p class="vocab-mnemonic">${card.mnemonic}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    // Toggle expand collapse when clicking word
    item.addEventListener('click', (e) => {
      // If clicking the deck badge, navigate to study that deck
      if (e.target.classList.contains('vocab-deck-link')) {
        const dIdx = parseInt(e.target.dataset.deck);
        const relativeIdx = wordIndex % CARDS_PER_DECK;
        
        startStudy(dIdx);
        // Set specific card active
        activeCardIndex = relativeIdx;
        updateStudyProgress();
        renderCard();
        return;
      }
      
      item.classList.toggle('expanded');
    });
    
    listContainer.appendChild(item);
  });
}

// Event listeners setup
function setupEventListeners() {
  // Main Nav Tab clicks
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showScreen(tab.dataset.screen);
    });
  });

  // Logo click triggers Decks list
  const logo = document.getElementById('logo-section');
  if (logo) {
    logo.addEventListener('click', () => {
      showScreen('decks');
    });
  }

  // Study Screen Back Button
  const backBtn = document.getElementById('study-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showScreen('decks');
    });
  }

  // Flashcard Clicking flips card
  const card = document.getElementById('flashcard');
  if (card) {
    card.addEventListener('click', () => {
      flipCard();
    });
  }

  // Mnemonic hint button on card front
  const mHintBtn = document.getElementById('mnemonic-hint-btn');
  if (mHintBtn) {
    mHintBtn.addEventListener('click', (e) => {
      toggleFrontMnemonic(e);
    });
  }

  // Close front mnemonic drawer
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', (e) => {
      toggleFrontMnemonic(e);
    });
  }

  // Study controls clicks
  document.getElementById('study-prev-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    prevCard();
  });

  document.getElementById('study-next-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    nextCard();
  });

  document.getElementById('study-flip-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    flipCard();
  });

  document.getElementById('study-mastery-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMastered();
  });

  // Search input typing listener
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderSearch();
    });
  }

  // Celebration overlay actions
  document.getElementById('celebration-close-btn').addEventListener('click', () => {
    document.getElementById('celebration-overlay').classList.remove('active');
  });

  document.getElementById('celebration-decks-btn').addEventListener('click', () => {
    document.getElementById('celebration-overlay').classList.remove('active');
    showScreen('decks');
  });

  document.getElementById('celebration-next-deck-btn').addEventListener('click', () => {
    document.getElementById('celebration-overlay').classList.remove('active');
    if (activeDeckIndex !== null && activeDeckIndex < decks.length - 1) {
      startStudy(activeDeckIndex + 1);
    }
  });

  // Global Keyboard listener
  document.addEventListener('keydown', (e) => {
    // Only capture keyboard shortcuts when on study screen
    if (currentScreen !== 'study' || activeDeckIndex === null) return;
    
    // Ignore if user typing in any input field
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }
    
    if (e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (e.key === 'ArrowLeft') {
      prevCard();
    } else if (e.key === 'ArrowRight') {
      nextCard();
    } else if (e.key === 'ArrowUp' || e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleFrontMnemonic();
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      toggleMastered();
    }
  });
}

// Launch application on DOM content load
document.addEventListener('DOMContentLoaded', init);
