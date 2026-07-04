"use client";

import { useState, useEffect, useMemo } from "react";
import { flashcardsData } from "../data/data";

const CARDS_PER_DECK = 10;

export default function Home() {
  // Screens state
  const [currentScreen, setCurrentScreen] = useState("decks"); // "decks", "study", "search"
  const [activeDeckIndex, setActiveDeckIndex] = useState(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showingHint, setShowingHint] = useState(false);
  const [activeHintType, setActiveHintType] = useState("mnemonic"); // "mnemonic" or "example"
  
  // Progress state (client-side only loaded after mount to avoid hydration mismatch)
  const [masteredWords, setMasteredWords] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSearchWord, setExpandedSearchWord] = useState(null);

  // Confetti particles
  const [particles, setParticles] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Load progress on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem("gre_mastered_words");
      if (saved) {
        setMasteredWords(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load progress from localStorage", e);
    }
  }, []);

  // Save progress when masteredWords changes
  const saveProgress = (updatedList) => {
    setMasteredWords(updatedList);
    try {
      localStorage.setItem("gre_mastered_words", JSON.stringify(updatedList));
    } catch (e) {
      console.error("Failed to save progress to localStorage", e);
    }
  };

  // Convert flashcardsData into Decks of 10 cards each
  const Decks = useMemo(() => {
    const totalCards = flashcardsData.length;
    const tempDecks = [];
    for (let i = 0; i < totalCards; i += CARDS_PER_DECK) {
      const deckCards = flashcardsData.slice(i, i + CARDS_PER_DECK);
      tempDecks.push({
        index: tempDecks.length,
        cards: deckCards,
        range: `${deckCards[0].word} - ${deckCards[deckCards.length - 1].word}`
      });
    }
    return tempDecks;
  }, []);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalWords = flashcardsData.length;
    const totalMastered = masteredWords.length;
    const percentage = totalWords > 0 ? Math.round((totalMastered / totalWords) * 100) : 0;
    
    // Count completed decks
    let completedDecks = 0;
    Decks.forEach(deck => {
      const isCompleted = deck.cards.every(c => masteredWords.includes(c.word));
      if (isCompleted && deck.cards.length > 0) completedDecks++;
    });

    return {
      totalWords,
      totalMastered,
      percentage,
      completedDecks
    };
  }, [masteredWords, Decks]);

  // Mastered set for quick lookup
  const masteredSet = useMemo(() => new Set(masteredWords), [masteredWords]);

  // Handle deck selection
  const selectDeck = (idx) => {
    setActiveDeckIndex(idx);
    setActiveCardIndex(0);
    setIsFlipped(false);
    setShowingHint(false);
    setCurrentScreen("study");
  };

  // Toggle master status for active card
  const toggleMastered = () => {
    if (activeDeckIndex === null) return;
    const word = Decks[activeDeckIndex].cards[activeCardIndex].word;
    let newList;
    if (masteredSet.has(word)) {
      newList = masteredWords.filter(w => w !== word);
    } else {
      newList = [...masteredWords, word];
    }
    saveProgress(newList);
  };

  // Navigate study cards
  const nextCard = () => {
    if (activeDeckIndex === null) return;
    const deck = Decks[activeDeckIndex];
    if (activeCardIndex < deck.cards.length - 1) {
      setActiveCardIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowingHint(false);
    } else {
      // Reached the end of the deck, check status and show celebration
      const masteredCountInDeck = deck.cards.filter(c => masteredSet.has(c.word)).length;
      if (masteredCountInDeck === deck.cards.length) {
        triggerConfetti();
      }
      setShowCelebration(true);
    }
  };

  const prevCard = () => {
    if (activeCardIndex > 0) {
      setActiveCardIndex(prev => prev - 1);
      setIsFlipped(false);
      setShowingHint(false);
    }
  };

  // Mnemonic hint trigger
  const triggerConfetti = () => {
    const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
    const newParticles = Array.from({ length: 60 }).map((_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100 + "vw",
      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      transform: `scale(${Math.random() * 0.7 + 0.3})`,
      animationDelay: `${Math.random() * 2}s`,
      animationDuration: `${Math.random() * 1.5 + 1.5}s`
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 3500);
  };

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentScreen !== "study" || activeDeckIndex === null || showCelebration) return;
      
      // Ignore key events in inputs
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === "ArrowLeft") {
        prevCard();
      } else if (e.key === "ArrowRight") {
        nextCard();
      } else if (e.key === "ArrowUp" || e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (!isFlipped) {
          setShowingHint(prev => !prev);
        }
      } else if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        toggleMastered();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentScreen, activeDeckIndex, activeCardIndex, isFlipped, masteredWords, showCelebration]);

  // Filtered Vocabulary for Search
  const filteredVocab = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return flashcardsData;
    return flashcardsData.filter(card => {
      return card.word.toLowerCase().includes(query) ||
             card.definition.toLowerCase().includes(query) ||
             card.mnemonic.toLowerCase().includes(query) ||
             (card.example && card.example.toLowerCase().includes(query));
    });
  }, [searchQuery]);

  // Jump from search item to deck study
  const jumpToCard = (word) => {
    const wordIndex = flashcardsData.findIndex(c => c.word === word);
    if (wordIndex === -1) return;
    const deckIdx = Math.floor(wordIndex / CARDS_PER_DECK);
    const cardIdx = wordIndex % CARDS_PER_DECK;
    
    setActiveDeckIndex(deckIdx);
    setActiveCardIndex(cardIdx);
    setIsFlipped(false);
    setShowingHint(false);
    setCurrentScreen("study");
  };

  // Ensure client render match
  const displayPercentage = isMounted ? stats.percentage : 0;
  const displayMastered = isMounted ? stats.totalMastered : 0;
  const displayCompletedDecks = isMounted ? stats.completedDecks : 0;

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#090d16] text-[#f8fafc] overflow-x-hidden selection:bg-violet-500/30">
      {/* Confetti particles */}
      {particles.map(p => (
        <div 
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.left,
            backgroundColor: p.backgroundColor,
            transform: p.transform,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration
          }}
        />
      ))}

      {/* App Header */}
      <header className="sticky top-0 z-50 px-4 py-4 md:px-8 bg-[#090d16]/60 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentScreen("decks")}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-xl bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent leading-none">
                GRE Vocab Master
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-0.5">
                Indonesian Mnemonics
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-3 md:gap-4 justify-between sm:justify-start">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl px-3 py-1.5 flex flex-col items-center min-w-[75px]">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Total</span>
              <span className="font-heading font-bold text-sm text-slate-200">{stats.totalWords}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl px-3 py-1.5 flex flex-col items-center min-w-[90px]">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Dikuasai</span>
              <span className="font-heading font-bold text-sm text-emerald-400">{displayMastered} ({displayPercentage}%)</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl px-3 py-1.5 flex flex-col items-center min-w-[85px]">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Decks</span>
              <span className="font-heading font-bold text-sm text-violet-400">{displayCompletedDecks} / {Decks.length}</span>
            </div>
          </div>

          {/* Navigation Tab Menu */}
          <nav className="flex bg-slate-950/60 border border-slate-800/60 p-1 rounded-xl gap-1 self-start md:self-auto">
            <button 
              onClick={() => setCurrentScreen("decks")}
              className={`flex items-center gap-2 px-4 py-2 font-heading font-semibold text-xs rounded-lg transition-all ${
                currentScreen === "decks" || currentScreen === "study"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
              </svg>
              Decks
            </button>
            <button 
              onClick={() => {
                setCurrentScreen("search");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-4 py-2 font-heading font-semibold text-xs rounded-lg transition-all ${
                currentScreen === "search" 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              Cari Kata
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-10">
        
        {/* SCREEN 1: DECKS GRID */}
        {currentScreen === "decks" && (
          <section className="animate-fade-in">
            {/* Quick overview dashboard panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-4 bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Kosakata</h3>
                  <p className="font-heading font-extrabold text-2xl text-slate-100">{stats.totalWords}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sudah Dikuasai</h3>
                  <p className="font-heading font-extrabold text-2xl text-emerald-400">{displayMastered}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-15h-2v6h6v-2h-4V7z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pencapaian Deck</h3>
                  <p className="font-heading font-extrabold text-2xl text-amber-400">{displayCompletedDecks} / {Decks.length}</p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
                Daftar Seri Deck
                <span className="text-xs font-medium text-slate-400 px-2.5 py-1 bg-slate-800/50 rounded-full border border-slate-700/60">
                  10 kartu per deck
                </span>
              </h2>
            </div>

            {/* Decks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Decks.map((deck) => {
                const totalDeckCards = deck.cards.length;
                const masteredCount = deck.cards.filter(c => masteredSet.has(c.word)).length;
                const progressPercent = totalDeckCards > 0 ? Math.round((masteredCount / totalDeckCards) * 100) : 0;
                const isCompleted = masteredCount === totalDeckCards && totalDeckCards > 0;

                return (
                  <div 
                    key={deck.index}
                    onClick={() => selectDeck(deck.index)}
                    className={`group relative overflow-hidden bg-slate-900/35 backdrop-blur-md border border-slate-850 rounded-2xl p-5 cursor-pointer flex flex-col justify-between min-h-[170px] shadow-md hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-[0_12px_28px_rgba(139,92,246,0.12)] transition-all duration-300 ${
                      isCompleted ? "hover:border-emerald-500/40 hover:shadow-[0_12px_28px_rgba(16,185,129,0.12)] border-emerald-500/10" : ""
                    }`}
                  >
                    {/* Top Topline highlight */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-violet-600/60 opacity-60 group-hover:opacity-100 transition-opacity ${
                      isCompleted ? "bg-emerald-600/70" : ""
                    }`} />

                    <div className="flex justify-between items-start mb-2">
                      <span className="font-heading font-extrabold text-base text-slate-100 group-hover:text-violet-400 transition-colors">
                        Deck {deck.index + 1}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isCompleted ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800/60 text-slate-400"
                      }`}>
                        {isCompleted ? "Selesai" : "Belum"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 italic mb-6 line-clamp-2 leading-relaxed">
                      {deck.range}
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between items-center text-[10px] font-semibold mb-1">
                        <span className="text-slate-300">{masteredCount} / {totalDeckCards} Kata</span>
                        <span className={isCompleted ? "text-emerald-400" : "text-violet-400"}>{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? "bg-emerald-500" : "bg-violet-600"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SCREEN 2: STUDY SCREEN */}
        {currentScreen === "study" && activeDeckIndex !== null && (
          <section className="animate-fade-in max-w-2xl mx-auto">
            {/* Header controls */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setCurrentScreen("decks")}
                className="flex items-center gap-2 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl text-slate-200 text-xs font-heading font-semibold hover:-translate-x-0.5 transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Kembali
              </button>
              
              <div className="text-center">
                <h2 className="font-heading font-extrabold text-lg text-slate-100">Deck {activeDeckIndex + 1}</h2>
                <p className="text-[10px] text-slate-400 italic mt-0.5">{Decks[activeDeckIndex].range}</p>
              </div>
              
              <div className="w-24"></div> {/* spacer */}
            </div>

            {/* Progress indicators */}
            <div className="w-full mb-6">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-1.5">
                <span>Kosakata {activeCardIndex + 1} dari {Decks[activeDeckIndex].cards.length}</span>
              </div>
              <div className="w-full h-2 bg-slate-950/60 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400 transition-all duration-300"
                  style={{ width: `${((activeCardIndex + 1) / Decks[activeDeckIndex].cards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Flashcard Area */}
            <div className="flex justify-center items-center my-8 px-4 w-full">
              <div 
                className="perspective-1000 w-[550px] max-w-full h-[320px] sm:h-[300px] cursor-pointer"
                onClick={() => setIsFlipped(prev => !prev)}
              >
                <div 
                  className="transform-style-3d duration-500 relative w-full h-full"
                  style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                >
                  
                  {/* CARD FRONT */}
                  <div 
                    className="backface-hidden absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-slate-800 bg-gradient-to-br from-slate-900/75 to-slate-950/75 backdrop-blur-md shadow-2xl"
                    style={{ transform: "rotateY(0deg) translateZ(1px)" }}
                  >
                    {/* Front Header */}
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] font-bold bg-slate-900/80 border border-slate-850 px-2.5 py-1 rounded-full text-slate-400">
                        Kata {activeCardIndex + 1}
                      </span>
                      {isMounted && masteredSet.has(Decks[activeDeckIndex].cards[activeCardIndex].word) && (
                        <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full tracking-wider animate-bounce-short">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          Mastered
                        </div>
                      )}
                    </div>

                    {/* Word area */}
                    <div className="text-center my-auto">
                      <h3 className="font-heading font-extrabold text-4xl sm:text-5xl text-white tracking-tight leading-tight select-none">
                        {Decks[activeDeckIndex].cards[activeCardIndex].word}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-3 block select-none">
                        Klik kartu untuk membalik
                      </span>
                    </div>

                    {/* Front Footer */}
                    <div className="flex justify-center items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setActiveHintType("mnemonic");
                          setShowingHint(true);
                        }}
                        className="flex items-center gap-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-xs px-3.5 py-1.5 rounded-xl font-heading font-semibold transition-all hover:scale-[1.02]"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                        Hint Mnemonik
                      </button>
                      <button 
                        onClick={() => {
                          setActiveHintType("example");
                          setShowingHint(true);
                        }}
                        className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs px-3.5 py-1.5 rounded-xl font-heading font-semibold transition-all hover:scale-[1.02]"
                      >
                        <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Contoh Kalimat
                      </button>
                    </div>

                    {/* Front Hint Drawer Slide-Up */}
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute inset-0 bg-slate-950/95 border ${activeHintType === "mnemonic" ? "border-violet-500/30" : "border-emerald-500/30"} p-6 rounded-3xl flex flex-col justify-between text-left transition-all duration-350 ${
                        showingHint ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                      } z-10`}
                    >
                      <div>
                        {/* Tab Segmented Control */}
                        <div className="flex bg-slate-900/80 p-1 rounded-xl gap-1 mb-4 border border-slate-800">
                          <button
                            onClick={() => setActiveHintType("mnemonic")}
                            className={`flex-1 py-1.5 text-center font-heading font-bold text-xs rounded-lg transition-all ${
                              activeHintType === "mnemonic"
                                ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                                : "text-slate-400 hover:text-slate-250"
                            }`}
                          >
                            Mnemonik
                          </button>
                          <button
                            onClick={() => setActiveHintType("example")}
                            className={`flex-1 py-1.5 text-center font-heading font-bold text-xs rounded-lg transition-all ${
                              activeHintType === "example"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                : "text-slate-400 hover:text-slate-250"
                            }`}
                          >
                            Contoh Kalimat
                          </button>
                        </div>

                        {activeHintType === "mnemonic" ? (
                          <div className="animate-fade-in">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400">Mnemonik Hint</span>
                            <p className="text-sm text-slate-200 leading-relaxed font-semibold mt-3">
                              {Decks[activeDeckIndex].cards[activeCardIndex].mnemonic || "Tidak ada mnemonik untuk kata ini."}
                            </p>
                          </div>
                        ) : (
                          <div className="animate-fade-in">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Contoh Kalimat</span>
                            <p className="text-sm text-slate-200 leading-relaxed font-semibold mt-3 italic">
                              "{Decks[activeDeckIndex].cards[activeCardIndex].example || "Tidak ada contoh kalimat untuk kata ini."}"
                            </p>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setShowingHint(false)}
                        className={`w-full ${activeHintType === "mnemonic" ? "bg-violet-600 hover:bg-violet-500" : "bg-emerald-600 hover:bg-emerald-500"} text-white text-xs py-2.5 rounded-xl font-heading font-bold text-center mt-4 transition-all`}
                      >
                        Tutup Hint
                      </button>
                    </div>
                  </div>

                  {/* CARD BACK */}
                  <div 
                    className="backface-hidden absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-slate-800 bg-gradient-to-br from-slate-900/75 to-slate-950/75 backdrop-blur-md shadow-2xl text-left"
                    style={{ transform: "rotateY(180deg) translateZ(1px)" }}
                  >
                    {/* Back Header */}
                    <div className="flex justify-between items-center w-full select-none">
                      <span className="text-[10px] font-bold bg-slate-900/80 border border-slate-850 px-2.5 py-1 rounded-full text-slate-400">
                        Makna & Mnemonik
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Klik untuk kembali
                      </span>
                    </div>

                    {/* Contents */}
                    <div className="flex-1 overflow-y-auto my-3 pr-1 flex flex-col justify-start gap-3 py-1">
                      <div>
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Makna / Definisi</h4>
                        <p className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
                          {Decks[activeDeckIndex].cards[activeCardIndex].definition}
                        </p>
                      </div>
                      <div className="bg-violet-600/5 border-l-2 border-violet-500 p-3 rounded-r-xl">
                        <h4 className="text-[9px] font-bold text-violet-400 uppercase tracking-wider mb-1">Mnemonik (Asosiasi)</h4>
                        <p className="text-xs sm:text-sm text-violet-200 font-medium leading-relaxed italic">
                          {Decks[activeDeckIndex].cards[activeCardIndex].mnemonic || "Tidak ada mnemonik."}
                        </p>
                      </div>
                      {Decks[activeDeckIndex].cards[activeCardIndex].example && (
                        <div className="bg-emerald-600/5 border-l-2 border-emerald-500 p-3 rounded-r-xl">
                          <h4 className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Contoh Kalimat</h4>
                          <p className="text-xs sm:text-sm text-emerald-200 font-medium leading-relaxed italic">
                            "{Decks[activeDeckIndex].cards[activeCardIndex].example}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Back Footer */}
                    <div className="flex justify-between items-center w-full select-none">
                      <span className="font-heading font-extrabold text-sm text-slate-400">
                        {Decks[activeDeckIndex].cards[activeCardIndex].word}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Spasi untuk membalik
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-3 w-full max-w-lg mx-auto px-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  prevCard();
                }}
                disabled={activeCardIndex === 0}
                className="order-1 col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none px-4 py-3 rounded-2xl text-slate-200 text-xs font-heading font-semibold transition-all hover:scale-[1.01]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
                Sebelumnya
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(prev => !prev);
                }}
                className="order-3 col-span-1 sm:flex-none bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 px-6 py-3 rounded-2xl text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/>
                </svg>
                Balik
              </button>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMastered();
                }}
                className={`order-4 col-span-1 sm:flex-none px-4 py-3 rounded-2xl border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] ${
                  isMounted && masteredSet.has(Decks[activeDeckIndex].cards[activeCardIndex].word)
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-slate-900/40 border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {isMounted && masteredSet.has(Decks[activeDeckIndex].cards[activeCardIndex].word) ? "Mastered" : "Tandai Mastered"}
              </button>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  nextCard();
                }}
                className="order-2 col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 px-4 py-3 rounded-2xl text-slate-200 text-xs font-heading font-semibold transition-all hover:scale-[1.01]"
              >
                Berikutnya
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            </div>

            {/* Keyboard Guide info */}
            <div className="hidden sm:flex flex-wrap items-center justify-center gap-4 mt-8 px-4 py-3 border border-slate-800/40 bg-slate-950/20 rounded-2xl text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono shadow-sm">Spasi</kbd>
                <span>Balik Kartu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono shadow-sm">←</kbd>
                <span>Sebelumnya</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono shadow-sm">→</kbd>
                <span>Berikutnya</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono shadow-sm">↑</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono shadow-sm">M</kbd>
                <span>Hint</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono shadow-sm">↓</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono shadow-sm">Enter</kbd>
                <span>Mastered</span>
              </div>
            </div>
          </section>
        )}

        {/* SCREEN 3: SEARCH SCREEN */}
        {currentScreen === "search" && (
          <section className="animate-fade-in max-w-3xl mx-auto">
            {/* Search Input Box */}
            <div className="relative w-full mb-6">
              <input 
                type="text" 
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kosakata, makna, atau mnemonik..."
                className="w-full bg-slate-900/35 border border-slate-850 px-4 py-3.5 pl-11 rounded-2xl text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/80 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all backdrop-blur-md"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </div>
            </div>
            
            {/* Matches stats */}
            <p className="text-xs text-slate-400 font-semibold mb-6 px-1">
              Menampilkan {filteredVocab.length} dari {flashcardsData.length} kosakata
            </p>

            {/* Results Grid List */}
            <div className="flex flex-col gap-3">
              {filteredVocab.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/10 border border-slate-800/40 rounded-2xl">
                  <svg className="w-12 h-12 fill-slate-500 opacity-40 mx-auto mb-3" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <p className="text-slate-400 text-sm font-medium">Tidak ada kata yang cocok dengan pencarian.</p>
                </div>
              ) : (
                filteredVocab.map((card) => {
                  const isMastered = isMounted && masteredSet.has(card.word);
                  const wordIndex = flashcardsData.findIndex(c => c.word === card.word);
                  const deckIndex = Math.floor(wordIndex / CARDS_PER_DECK);
                  const isExpanded = expandedSearchWord === card.word;

                  return (
                    <div 
                      key={card.word}
                      onClick={() => setExpandedSearchWord(isExpanded ? null : card.word)}
                      className={`bg-slate-900/35 border rounded-2xl p-4 md:p-5 cursor-pointer hover:bg-slate-900/60 hover:border-violet-500/40 transition-all ${
                        isExpanded ? "border-violet-500/40" : "border-slate-850"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                          <span className="font-heading font-bold text-base text-slate-100">{card.word}</span>
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToCard(card.word);
                            }}
                            className="text-[9px] font-extrabold uppercase bg-violet-500/10 border border-violet-500/25 text-violet-300 px-2 py-0.5 rounded-full hover:bg-violet-600 hover:text-white transition-colors"
                          >
                            Deck {deckIndex + 1}
                          </span>
                        </div>
                        {isMastered && (
                          <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/15">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                            Mastered
                          </div>
                        )}
                      </div>

                      {/* Expandable Body */}
                      <div className={`mt-4 pt-4 border-t border-dashed border-slate-800/80 flex flex-col gap-3 transition-all ${
                        isExpanded ? "block" : "hidden"
                      }`}>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Makna</span>
                          <p className="text-sm font-medium text-slate-200 mt-0.5">{card.definition}</p>
                        </div>
                        {card.mnemonic && (
                          <div className="bg-violet-600/5 border-l-2 border-violet-500 p-2.5 rounded-r-lg">
                            <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Mnemonik</span>
                            <p className="text-xs text-violet-200 font-medium leading-relaxed mt-0.5 italic">{card.mnemonic}</p>
                          </div>
                        )}
                        {card.example && (
                          <div className="bg-emerald-600/5 border-l-2 border-emerald-500 p-2.5 rounded-r-lg">
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Contoh Kalimat</span>
                            <p className="text-xs text-emerald-200 font-medium leading-relaxed mt-0.5 italic">"{card.example}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

      </main>

      {/* Celebration Modal Overlay */}
      {showCelebration && activeDeckIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-violet-500/25 shadow-2xl shadow-violet-500/10 rounded-3xl max-w-md w-full p-8 text-center animate-modal-pop">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto mb-5 shadow-lg shadow-emerald-500/10">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            
            <h3 className="font-heading font-extrabold text-2xl text-white mb-2 tracking-tight">
              {Decks[activeDeckIndex].cards.filter(c => masteredSet.has(c.word)).length === Decks[activeDeckIndex].cards.length
                ? "Luar Biasa!"
                : "Deck Selesai Ditinjau!"}
            </h3>
            
            <p className="text-sm text-slate-350 leading-relaxed mb-6">
              {Decks[activeDeckIndex].cards.filter(c => masteredSet.has(c.word)).length === Decks[activeDeckIndex].cards.length
                ? `Anda telah menguasai semua 10 kosakata di Deck ${activeDeckIndex + 1}! Tetap konsisten dan pertahankan semangat belajarnya!`
                : `Anda telah meninjau semua kartu di Deck ${activeDeckIndex + 1}. Anda menguasai ${Decks[activeDeckIndex].cards.filter(c => masteredSet.has(c.word)).length} dari ${Decks[activeDeckIndex].cards.length} kartu.`}
            </p>
            
            <div className="flex flex-col gap-3">
              {activeDeckIndex < Decks.length - 1 && (
                <button 
                  onClick={() => {
                    setShowCelebration(false);
                    selectDeck(activeDeckIndex + 1);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 hover:scale-[1.01] transition-all"
                >
                  Lanjut ke Deck {activeDeckIndex + 2}
                </button>
              )}
              <button 
                onClick={() => {
                  setShowCelebration(false);
                  setActiveCardIndex(0);
                  setIsFlipped(false);
                  setShowingHint(false);
                }}
                className="w-full bg-violet-600/25 hover:bg-violet-600/35 border border-violet-500/30 text-violet-300 font-heading font-bold text-sm px-6 py-3.5 rounded-2xl hover:scale-[1.01] transition-all"
              >
                Ulangi Deck {activeDeckIndex + 1}
              </button>
              <button 
                onClick={() => {
                  setShowCelebration(false);
                  setCurrentScreen("decks");
                  setActiveDeckIndex(null);
                }}
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-900/80 text-slate-200 font-heading font-semibold text-sm px-6 py-3.5 rounded-2xl hover:scale-[1.01] transition-all"
              >
                Kembali ke Daftar Deck
              </button>
              <button 
                onClick={() => setShowCelebration(false)}
                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-300 mt-2"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Footer */}
      <footer className="py-6 px-8 text-center text-[10px] text-slate-500 border-t border-slate-900/60 mt-auto bg-slate-950/20">
        <p>
          GRE Vocabulary Flashcard App &copy; {new Date().getFullYear()}. Dibuat dengan 10 kartu per deck untuk mempermudah ingatan menggunakan teknik Mnemonik.
        </p>
      </footer>
    </div>
  );
}
