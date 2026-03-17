// YOUR TMDB API KEY
const TMDB_API_KEY = 'cdf8b88e96f4a94a572eadb391b2677a';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMG_ORIGINAL_URL = 'https://image.tmdb.org/t/p/original';

// Multiple video sources
const VIDEO_SOURCES = {
    vidsrc: { url: 'https://vidsrc.me/embed/movie', name: 'Server 1 (Vidsrc)', enabled: true },
    vidsrcpro: { url: 'https://vidsrc.pro/embed/movie', name: 'Server 2 (Vidsrc Pro)', enabled: true },
    vidsrcto: { url: 'https://vidsrc.to/embed/movie', name: 'Server 3 (Vidsrc.to)', enabled: true },
    embed: { url: 'https://embed.su/embed/movie', name: 'Server 4 (Embed.su)', enabled: true },
    moviesapi: { url: 'https://moviesapi.club/movie', name: 'Server 5 (MoviesAPI)', enabled: true },
    '2embed': { url: 'https://www.2embed.cc/embed', name: 'Server 6 (2Embed)', enabled: true },
    auto: { url: null, name: 'Auto (Best Server)', enabled: true }
};

// State management
let currentPage = 1;
let currentCategory = 'popular';
let currentSearchQuery = '';
let totalPages = 1;
let watchHistory = JSON.parse(localStorage.getItem('watchHistory')) || [];
let movieCache = new Map();
let genresList = [];

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const sectionTitle = document.getElementById('sectionTitle');
const movieCount = document.getElementById('movieCount');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const heroTitle = document.getElementById('heroTitle');
const heroDesc = document.getElementById('heroDesc');
const playFeaturedBtn = document.getElementById('playFeaturedBtn');
const infoFeaturedBtn = document.getElementById('infoFeaturedBtn');
const modal = document.getElementById('movieModal');
const videoModal = document.getElementById('videoModal');
const modalBody = document.getElementById('modalBody');
const videoPlayer = document.getElementById('videoPlayer');
const videoSourceSelect = document.getElementById('videoSourceSelect');
const closeModals = document.querySelectorAll('.close-modal');
const filterBtns = document.querySelectorAll('.filter-btn');
const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a, footer a[data-category]');
const navbar = document.querySelector('.navbar');
const genresGrid = document.getElementById('genresGrid');
const footerGenres = document.getElementById('footerGenres');
const continueWatchingGrid = document.getElementById('continueWatchingGrid');
const continueWatchingSection = document.getElementById('continueWatchingSection');
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const categoriesFilter = document.getElementById('categoriesFilter');

// Current movie being played
let currentMovieId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    console.log('🎬 MovieFlix initializing with TMDB API...');
    
    try {
        // Load initial data
        await Promise.all([
            loadMovies('popular', 1),
            loadGenres(),
            loadContinueWatching(),
            loadFeaturedMovie()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ MovieFlix ready!');
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to load content. Please refresh the page.');
    }
}

// Load movies
async function loadMovies(category, page = 1, searchQuery = '') {
    try {
        showLoading();
        
        let url;
        if (searchQuery) {
            url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}&page=${page}`;
        } else if (category === 'trending') {
            url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&page=${page}`;
        } else {
            url = `${TMDB_BASE_URL}/movie/${category}?api_key=${TMDB_API_KEY}&page=${page}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Cache movies
            data.results.forEach(movie => movieCache.set(movie.id, movie));
            
            if (page === 1) {
                displayMovies(data.results);
            } else {
                appendMovies(data.results);
            }
            
            totalPages = data.total_pages || 1;
            movieCount.textContent = `${data.total_results || data.results.length} movies`;
            
            // Show/hide load more button
            if (page < totalPages) {
                loadMoreBtn.style.display = 'inline-block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
            
            return data;
        } else {
            moviesGrid.innerHTML = '<div class="loading-spinner">No movies found</div>';
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        showError('Failed to load movies. Please try again.');
    }
}

// Show loading state
function showLoading() {
    if (currentPage === 1) {
        moviesGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading amazing movies...</p>
            </div>
        `;
    }
}

// Show error
function showError(message) {
    moviesGrid.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Display movies in grid
function displayMovies(movies) {
    moviesGrid.innerHTML = '';
    
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });
}

// Append more movies
function appendMovies(movies) {
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });
}

// Create movie card
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('data-movie-id', movie.id);
    
    const posterPath = movie.poster_path 
        ? `${IMG_BASE_URL}${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    const year = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    card.innerHTML = `
        <img src="${posterPath}" alt="${movie.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-rating"><i class="fas fa-star"></i> ${rating}</span>
                <span>${year}</span>
            </div>
            <button class="play-btn" onclick="event.stopPropagation(); playMovie(${movie.id})">
                <i class="fas fa-play"></i> Play
            </button>
        </div>
    `;
    
    card.addEventListener('click', () => {
        showMovieDetails(movie.id);
    });
    
    return card;
}

// Show movie details
async function showMovieDetails(movieId) {
    try {
        const movieResponse = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`);
        const movie = await movieResponse.json();
        
        const posterPath = movie.poster_path 
            ? `${IMG_BASE_URL}${movie.poster_path}`
            : 'https://via.placeholder.com/500x750?text=No+Poster';
        
        const year = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        const cast = movie.credits?.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'Information not available';
        const director = movie.credits?.crew?.find(person => person.job === 'Director')?.name || 'Information not available';
        
        modalBody.innerHTML = `
            <div class="movie-details">
                <img src="${posterPath}" alt="${movie.title}">
                <div class="movie-details-info">
                    <h2>${movie.title}</h2>
                    <div class="movie-details-meta">
                        <span><i class="fas fa-calendar"></i> ${year}</span>
                        <span><i class="fas fa-clock"></i> ${runtime}</span>
                        <span><i class="fas fa-star" style="color: #ffd700;"></i> ${rating}</span>
                    </div>
                    
                    <div class="movie-details-genres">
                        ${movie.genres ? movie.genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('') : ''}
                    </div>
                    
                    <h3>Overview</h3>
                    <p class="movie-details-overview">${movie.overview || 'No overview available.'}</p>
                    
                    <h3>Cast</h3>
                    <div class="cast-list">
                        ${movie.credits?.cast?.slice(0, 5).map(actor => 
                            `<span class="cast-item">${actor.name}</span>`
                        ).join('') || 'Information not available'}
                    </div>
                    
                    <h3>Director</h3>
                    <p>${director}</p>
                    
                    <div style="margin-top: 20px;">
                        <button class="hero-btn primary" onclick="playMovie(${movie.id})">
                            <i class="fas fa-play"></i> Play Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading movie details:', error);
        modalBody.innerHTML = '<div class="error">Failed to load movie details. Please try again.</div>';
    }
}

// Play movie
function playMovie(movieId) {
    currentMovieId = movieId;
    addToWatchHistory(movieId);
    
    const selectedSource = videoSourceSelect.value;
    
    if (selectedSource === 'auto') {
        trySourcesInOrder(movieId);
    } else {
        const sourceUrl = VIDEO_SOURCES[selectedSource].url;
        if (sourceUrl) {
            videoPlayer.src = `${sourceUrl}/${movieId}`;
        }
    }
    
    videoModal.style.display = 'block';
}

// Try multiple video sources
async function trySourcesInOrder(movieId) {
    const sources = ['vidsrc', 'vidsrcpro', 'vidsrcto', 'embed', 'moviesapi', '2embed'];
    
    for (const source of sources) {
        const sourceUrl = VIDEO_SOURCES[source].url;
        if (sourceUrl) {
            videoPlayer.src = `${sourceUrl}/${movieId}`;
            console.log(`Trying source: ${source}`);
            // Give it time to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
        }
    }
}

// Add to watch history
function addToWatchHistory(movieId) {
    const movie = movieCache.get(movieId);
    if (!movie) return;
    
    watchHistory = watchHistory.filter(id => id !== movieId);
    watchHistory.unshift(movieId);
    
    if (watchHistory.length > 20) {
        watchHistory = watchHistory.slice(0, 20);
    }
    
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    loadContinueWatching();
}

// Load continue watching
async function loadContinueWatching() {
    if (watchHistory.length === 0) {
        continueWatchingSection.style.display = 'none';
        return;
    }
    
    continueWatchingSection.style.display = 'block';
    continueWatchingGrid.innerHTML = '';
    
    for (const movieId of watchHistory.slice(0, 10)) {
        try {
            const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`);
            const movie = await response.json();
            
            const card = createMovieCard(movie);
            continueWatchingGrid.appendChild(card);
        } catch (error) {
            console.error('Error loading watched movie:', error);
        }
    }
}

// Load genres
async function loadGenres() {
    try {
        const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        
        genresList = data.genres;
        
        // Display genres in grid
        genresGrid.innerHTML = data.genres.map(genre => `
            <div class="genre-card" onclick="loadGenreMovies(${genre.id}, '${genre.name}')">
                ${genre.name}
            </div>
        `).join('');
        
        // Display genres in footer
        footerGenres.innerHTML = data.genres.slice(0, 6).map(genre => `
            <li><a href="#" onclick="loadGenreMovies(${genre.id}, '${genre.name}'); return false;">${genre.name}</a></li>
        `).join('');
        
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Load movies by genre - FIXED FUNCTION
window.loadGenreMovies = function(genreId, genreName) {
    console.log(`Loading genre: ${genreName} (ID: ${genreId})`);
    
    // Update current state
    currentCategory = `discover/movie?with_genres=${genreId}`;
    currentSearchQuery = '';
    currentPage = 1;
    
    // Update UI
    sectionTitle.textContent = `${genreName} Movies`;
    
    // Update active states
    filterBtns.forEach(btn => btn.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Load movies for this genre
    loadMoviesByGenre(genreId, 1);
    
    // Close mobile menu if open
    mobileMenu.classList.remove('active');
    
    // Scroll to movies section
    document.querySelector('.movies-section').scrollIntoView({ behavior: 'smooth' });
    
    return false;
};

// Load movies by genre
async function loadMoviesByGenre(genreId, page = 1) {
    try {
        showLoading();
        
        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(movie => movieCache.set(movie.id, movie));
            
            if (page === 1) {
                displayMovies(data.results);
            } else {
                appendMovies(data.results);
            }
            
            totalPages = data.total_pages || 1;
            movieCount.textContent = `${data.total_results} movies`;
            
            if (page < totalPages) {
                loadMoreBtn.style.display = 'inline-block';
                loadMoreBtn.onclick = () => {
                    currentPage++;
                    loadMoviesByGenre(genreId, currentPage);
                };
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            moviesGrid.innerHTML = '<div class="loading-spinner">No movies found in this genre</div>';
        }
    } catch (error) {
        console.error('Error loading genre movies:', error);
        showError('Failed to load genre movies. Please try again.');
    }
}

// Load featured movie
async function loadFeaturedMovie() {
    try {
        const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const featured = data.results[0];
            heroTitle.textContent = featured.title;
            heroDesc.textContent = featured.overview ? featured.overview.substring(0, 150) + '...' : 'Watch this amazing movie now!';
            
            if (featured.backdrop_path) {
                const heroSection = document.querySelector('.hero');
                heroSection.style.background = `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%), url('${IMG_ORIGINAL_URL}${featured.backdrop_path}')`;
                heroSection.style.backgroundSize = 'cover';
                heroSection.style.backgroundPosition = 'center';
            }
            
            playFeaturedBtn.onclick = () => playMovie(featured.id);
            infoFeaturedBtn.onclick = () => showMovieDetails(featured.id);
        }
    } catch (error) {
        console.error('Error loading featured movie:', error);
    }
}

// Search movies
async function searchMovies() {
    const query = searchInput.value.trim();
    if (!query) {
        alert('Please enter a movie name');
        return;
    }
    
    console.log(`Searching for: ${query}`);
    
    currentSearchQuery = query;
    currentCategory = 'search';
    currentPage = 1;
    sectionTitle.textContent = `Search Results for "${query}"`;
    
    await loadMovies('search', 1, query);
    
    // Update active states
    filterBtns.forEach(btn => btn.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));
}

// Setup event listeners
function setupEventListeners() {
    // Search
    searchBtn.addEventListener('click', searchMovies);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });
    
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            console.log(`Filter clicked: ${filter}`);
            
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCategory = filter;
            currentSearchQuery = '';
            currentPage = 1;
            
            // Update section title
            const filterNames = {
                'popular': 'Popular Movies',
                'now_playing': 'Now Playing',
                'top_rated': 'Top Rated',
                'upcoming': 'Upcoming Movies',
                'trending': 'Trending This Week'
            };
            sectionTitle.textContent = filterNames[filter] || 'Movies';
            
            loadMovies(filter, 1);
        });
    });
    
    // Navigation links (including mobile and footer)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const category = link.dataset.category;
            console.log(`Nav link clicked: ${category}`);
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            if (category === 'home') {
                window.location.reload();
            } else if (category === 'movies') {
                sectionTitle.textContent = 'Popular Movies';
                currentCategory = 'popular';
                loadMovies('popular', 1);
                
                // Update filter buttons
                filterBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.filter === 'popular') {
                        btn.classList.add('active');
                    }
                });
            } else if (category === 'trending') {
                sectionTitle.textContent = 'Trending This Week';
                currentCategory = 'trending';
                loadMovies('trending', 1);
                
                filterBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.filter === 'trending') {
                        btn.classList.add('active');
                    }
                });
            } else if (category === 'upcoming') {
                sectionTitle.textContent = 'Upcoming Movies';
                currentCategory = 'upcoming';
                loadMovies('upcoming', 1);
                
                filterBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.filter === 'upcoming') {
                        btn.classList.add('active');
                    }
                });
            } else if (category === 'genres') {
                document.getElementById('genresSection').scrollIntoView({ behavior: 'smooth' });
            }
            
            // Close mobile menu
            mobileMenu.classList.remove('active');
        });
    });
    
    // Mobile menu button
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
    
    // Load more button
    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        
        if (currentCategory.startsWith('discover')) {
            // Extract genre ID from currentCategory
            const genreId = currentCategory.split('=')[1];
            loadMoviesByGenre(parseInt(genreId), currentPage);
        } else if (currentSearchQuery) {
            loadMovies('search', currentPage, currentSearchQuery);
        } else {
            loadMovies(currentCategory, currentPage);
        }
    });
    
    // Close modals
    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            videoModal.style.display = 'none';
            videoPlayer.src = '';
        });
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
        if (e.target === videoModal) {
            videoModal.style.display = 'none';
            videoPlayer.src = '';
        }
    });
    
    // Video source change
    videoSourceSelect.addEventListener('change', () => {
        if (currentMovieId) {
            playMovie(currentMovieId);
        }
    });
    
    // Scroll effect for navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Close mobile menu on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            mobileMenu.classList.remove('active');
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            videoModal.style.display = 'none';
            videoPlayer.src = '';
            mobileMenu.classList.remove('active');
        }
    });
}

// Make functions global
window.playMovie = playMovie;
window.showMovieDetails = showMovieDetails;
window.loadGenreMovies = loadGenreMovies;
