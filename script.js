document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Cover Page / Hub
    const coverPage = document.getElementById('cover-page');
    const openBookBtn = document.getElementById('open-book-btn');
    const mainApp = document.getElementById('main-app');

    // DOM Elements - Stories Page
    const storyCardsContainer = document.getElementById('story-cards-container');
    const storyDisplay = document.getElementById('story-display');
    const backToStoriesBtn = document.getElementById('back-to-stories-btn');
    const dTitle = document.getElementById('display-title');
    const dKanda = document.getElementById('display-kanda');
    const dImage = document.getElementById('display-image');
    const dText = document.getElementById('display-text');

    // DOM Elements - Inspiration Page
    const problemInput = document.getElementById('problem-input');
    const seekGuidanceBtn = document.getElementById('seek-guidance-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const inspirationResultsContainer = document.getElementById('inspiration-results-container');
    const noResult = document.getElementById('no-result');

    // DOM Elements - Characters Page
    const characterGrid = document.getElementById('character-grid');
    const modal = document.getElementById('character-modal');
    const closeModal = document.getElementById('close-modal');

    // Global Data Store
    let ramayanData = null;

    // Initialize App
    async function init() {
        ramayanData = await fetchRamayanData();
        if(ramayanData) {
            if(storyCardsContainer) populateStories();
            if(characterGrid) renderCharacters();
        }
    }

    // --- API Simulation ---
    async function fetchRamayanData() {
        try {
            const response = await fetch('data.json');
            if(!response.ok) throw new Error("Could not fetch data");
            const data = await response.json();
            return data;
        } catch(error) {
            console.error("Error loading Ramayan data:", error);
            return null;
        }
    }

    // --- Cover Page Logic (Index Only) ---
    if(openBookBtn && coverPage && mainApp) {
        // Direct navigation to main app if hash is present
        if(window.location.hash === '#main-app') {
            coverPage.classList.add('hidden');
            mainApp.classList.remove('hidden');
        }

        openBookBtn.addEventListener('click', () => {
            coverPage.classList.add('open');
            setTimeout(() => {
                coverPage.classList.add('hidden');
                mainApp.classList.remove('hidden');
            }, 800);
        });
    }

    // --- Section 1: Stories Logic ---
    function populateStories() {
        if(!ramayanData || !ramayanData.stories || !storyCardsContainer) return;
        
        storyCardsContainer.innerHTML = '';
        ramayanData.stories.forEach((story, index) => {
            const card = document.createElement('div');
            card.className = 'story-card fade-in';
            card.style.animationDelay = `${index * 0.1}s`;
            
            card.innerHTML = `
                <div class="card-bg" style="background-image: url('${story.imageUrl}')"></div>
                <div class="card-content">
                    <span class="kanda-badge">${story.kanda}</span>
                    <h3>${story.title}</h3>
                </div>
            `;
            
            card.addEventListener('click', () => {
                showStory(story);
            });
            
            storyCardsContainer.appendChild(card);
        });
    }

    function showStory(story) {
        dTitle.textContent = story.title;
        dKanda.textContent = story.kanda;
        dImage.src = story.imageUrl;
        dText.textContent = story.summary;
        
        storyCardsContainer.classList.add('hidden');
        storyDisplay.classList.remove('hidden');
    }

    if(backToStoriesBtn) {
        backToStoriesBtn.addEventListener('click', () => {
            storyDisplay.classList.add('hidden');
            storyCardsContainer.classList.remove('hidden');
        });
    }

    // --- Section 2: Inspiration Logic ---
    if(seekGuidanceBtn) {
        seekGuidanceBtn.addEventListener('click', () => {
            const inputStr = problemInput.value.toLowerCase().trim();
            if(!inputStr) return;

            // Reset UI
            if(inspirationResultsContainer) {
                inspirationResultsContainer.innerHTML = '';
                inspirationResultsContainer.classList.add('hidden');
            }
            if(noResult) noResult.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');

            // Simulate API Processing Delay (1.5s)
            setTimeout(() => {
                loadingSpinner.classList.add('hidden');
                findInspiration(inputStr);
            }, 1500);
        });
    }

    // Advanced NLP Tokenizer
    function processInput(rawText) {
        const stop_words = new Set(['i', 'am', 'is', 'are', 'the', 'a', 'an', 'my', 'feel', 'very', 'so', 'to', 'and', 'but', 'for', 'with', 'in', 'of', 'from', 'that', 'this', 'me', 'please', 'can', 'you']);
        
        // Custom stemming rules for common suffixes
        const stemRules = [
            [/ing$/, ''], [/tion$/, 'te'], [/ed$/, ''],
            [/ness$/, ''], [/ful$/, ''], [/ly$/, ''], [/es$/, ''], [/s$/, '']
        ];
        
        return rawText
            .toLowerCase()
            .replace(/[^a-z\s]/g, '') // remove punctuation
            .split(/\s+/)
            .filter(w => w.length > 2 && !stop_words.has(w))
            .map(word => {
                let stemmed = word;
                for (const [pattern, replacement] of stemRules) {
                    if (pattern.test(stemmed)) {
                        stemmed = stemmed.replace(pattern, replacement);
                        break;
                    }
                }
                return stemmed;
            });
    }

    // Levenshtein distance for spell correction & fuzzy matching
    function levenshtein(a, b) {
        if(a.length === 0) return b.length;
        if(b.length === 0) return a.length;
        const matrix = [];
        for(let i = 0; i <= b.length; i++) matrix[i] = [i];
        for(let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for(let i = 1; i <= b.length; i++) {
            for(let j = 1; j <= a.length; j++) {
                if(b.charAt(i-1) === a.charAt(j-1)) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // Weighted Scorer with Fuzzy Match
    function scoreInspiration(tokenizedInput, inspiration) {
        let score = 0;
        const inputSet = new Set(tokenizedInput);

        if(inspiration.synonymClusters) {
            inspiration.synonymClusters.forEach(cluster => {
                cluster.words.forEach(word => {
                    // Exact match
                    if (inputSet.has(word)) {
                        score += cluster.weight;
                    } else {
                        // Fuzzy and partial token match
                        tokenizedInput.forEach(token => {
                            const distance = levenshtein(word, token);
                            // If strings are very similar (1 typo allowed for words > 4 chars, 2 for > 6 chars)
                            if ((token.length > 4 && distance <= 1) || (token.length > 6 && distance <= 2)) {
                                score += (cluster.weight * 0.8);
                            } else if ((word.startsWith(token) || token.startsWith(word)) && token.length > 2) {
                                score += (cluster.weight * 0.5);
                            }
                        });
                    }
                });
            });
        }

        if(inspiration.antiKeywords) {
            inspiration.antiKeywords.forEach(w => {
                if (inputSet.has(w)) score -= 2;
            });
        }
        return score;
    }

    function findInspiration(input) {
        if(!ramayanData || !ramayanData.inspirations || !inspirationResultsContainer) return;

        // If user is just testing or asking broadly, provide universal guidance
        if (input.includes('guide') || input.includes('help')) {
            // Add a small artificial score boost to "exile" (directionless) or "dilemma"
        }

        const tokens = processInput(input);
        
        let results = ramayanData.inspirations
            .map(insp => ({ insp, score: scoreInspiration(tokens, insp) }));

        // Dynamic thresholding: if no high scores, lower the threshold to strictly score > 0
        let highestScore = Math.max(...results.map(r => r.score));
        let threshold = highestScore > 1 ? 0.5 : 0;

        results = results
            .filter(r => r.score > threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // Get top 3

        // Universal Fallback if still absolutely 0 results
        if(results.length === 0) {
            // Use Rama + Hanuman as universal guidance for lost/struggling souls
            const fallbackInspirations = ramayanData.inspirations.filter(i => i.id === 'exile' || i.id === 'impossible');
            results = fallbackInspirations.map(insp => ({ insp, score: 0.1 }));
        }

        if(results.length > 0) {
            inspirationResultsContainer.innerHTML = '';
            
            // Add a title showing we found results if multiple
            if (results.length > 1) {
                const resultsHeader = document.createElement('h3');
                resultsHeader.className = 'results-title fade-in';
                resultsHeader.textContent = `The texts reveal ${results.length} paths of wisdom...`;
                inspirationResultsContainer.appendChild(resultsHeader);
            }

            results.forEach((r, index) => {
                const bestMatch = r.insp;
                const resultDiv = document.createElement('div');
                resultDiv.className = 'inspiration-result glass-panel slide-up';
                resultDiv.style.animationDelay = `${index * 0.2}s`;
                
                resultDiv.innerHTML = `
                    <div class="result-header">
                        <h4>${results.length > 1 ? `Path ${index + 1}: ` : 'Relevant Path: '}<span class="golden-text">${bestMatch.instance}</span></h4>
                        <span class="badge">${bestMatch.character}</span>
                    </div>
                    <div class="result-body">
                        <h5>The Story</h5>
                        <p>${bestMatch.story}</p>
                        <div class="separator-line"></div>
                        <h5>The Eternal Teaching</h5>
                        <div class="teaching-quote">
                            <i class="fa-solid fa-quote-left quote-icon"></i>
                            <p class="highlight-text">${bestMatch.teaching}</p>
                        </div>
                    </div>
                `;
                inspirationResultsContainer.appendChild(resultDiv);
            });
            
            inspirationResultsContainer.classList.remove('hidden');
        } else {
            // This case should ideally never hit anymore due to fallback, but keeping it as safety
            if(noResult) noResult.classList.remove('hidden');
        }
    }

    // --- Section 3: Characters Logic ---
    function renderCharacters() {
        if(!ramayanData || !ramayanData.characters || !characterGrid) return;
        
        characterGrid.innerHTML = ''; // Clear grid

        ramayanData.characters.forEach(char => {
            const card = document.createElement('div');
            card.classList.add('character-card');
            card.innerHTML = `
                <div class="character-img-container">
                    <img src="${char.imageUrl}" alt="${char.name}">
                </div>
                <div class="character-info">
                    <h4>${char.name}</h4>
                    <p>${char.role}</p>
                </div>
            `;
            // Add click event to open modal
            card.addEventListener('click', () => openModal(char));
            characterGrid.appendChild(card);
        });
    }

    // --- Modal Logic ---
    function openModal(char) {
        if(!modal) return;
        document.getElementById('modal-img').src = char.imageUrl;
        document.getElementById('modal-name').textContent = char.name;
        document.getElementById('modal-role').textContent = char.role;
        document.getElementById('modal-traits').textContent = char.traits.join(', ');
        document.getElementById('modal-teachings').textContent = char.teachings;
        modal.classList.remove('hidden');
    }

    if(closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if(modal) {
        // Close modal if clicking outside content
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

    // Start
    init();
});
