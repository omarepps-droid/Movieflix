// YOUR TMDB API KEY
const TMDB_API_KEY = 'cdf8b88e96f4a94a572eadb391b2677a';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMG_ORIGINAL_URL = 'https://image.tmdb.org/t/p/original';

// Multiple video sources for redundancy
const VIDEO_SOURCES = {
    vidsrc: {
        url: 'https://vidsrc.me/embed/movie',
        name: 'Server 1 (Vidsrc)',
        enabled: true
    },
    vidsrcpro: {
        url: 'https://vidsrc.pro/embed/movie',
        name: 'Server 2 (Vidsrc Pro)',
        enabled: true
    },
    vidsrcto: {
        url: 'https://vidsrc.to/embed/movie',
        name: 'Server 3 (Vidsrc.to)',
        enabled: true
    },
    embed: {
        url: 'https://embed.su/embed/movie',
        name: 'Server 4 (Embed.su)',
        enabled: true
    },
    moviesapi: {
        url: 'https://moviesapi.club/movie',
        name: 'Server 5 (MoviesAPI)',
        enabled: true
    },
    '2embed': {
        url: 'https://www.2embed.cc/embed',
        name: 'Server 6 (2Embed)',
        enabled: true
    },
    auto: {
        url: null,
        name: 'Auto (Best Server)',
        enabled: true
    }
};

// Genres mapping
const GENRES = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

// State management
let currentPage = 1;
let currentCategory = 'popular';
let currentSearchQuery = '';
let totalPages = 1;
let watchHistory = JSON.parse(localStorage.getItem('watchHistory')) || [];
let movieCache = new Map();

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
const navLinks = document.querySelectorAll('.nav-links a');
const navbar = document.querySelector('.navbar');
const genresGrid = document.getElementById('genresGrid');
const continueWatchingGrid = document.getElementById('continueWatchingGrid');
const continueWatchingSection = document.getElementById('continueWatching');

// Current movie being played
let currentMovieId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    console.log('🎬 MovieFlix initializing with TMDB API...');
    
    // Show loading state
    moviesGrid.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading amazing movies...</p>
        </div>
    `;
    
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

// Load movies with pagination
async function loadMovies(category, page = 1, searchQuery = '') {
    try {
        let url;
        if (searchQuery) {
            url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}&page=${page}`;
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
            
            totalPages = data.total_pages;
            movieCount.textContent = `${data.total_results} movies`;
            
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

// Display movies in grid
function displayMovies(movies) {
    moviesGrid.innerHTML = '';
    
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });
}

// Append more movies (for pagination)
function appendMovies(movies) {
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });
}

// Create movie card element
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
        <img src="${posterPath}" alt="${movie.title}" loading="lazy">
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-rating"><i class="fas fa-star"></i> ${rating}</span>
                <span>${year}</span>
            </div>
            <button class="play-btn" onclick="playMovie(${movie.id})">
                <i class="fas fa-play"></i> Play
            </button>
        </div>
    `;
    
    // Add click event for movie details
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('play-btn')) {
            showMovieDetails(movie.id);
        }
    });
    
    return card;
}

// Show movie details in modal
async function showMovieDetails(movieId) {
    try {
        // Fetch movie details
        const movieResponse = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`);
        const movie = await movieResponse.json();
        
        // Fetch similar movies
        const similarResponse = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${TMDB_API_KEY}`);
        const similar = await similarResponse.json();
        
        // Create modal content
        const posterPath = movie.poster_path 
            ? `${IMG_BASE_URL}${movie.poster_path}`
            : 'https://via.placeholder.com/500x750?text=No+Poster';
        
        const backdropPath = movie.backdrop_path 
            ? `${IMG_ORIGINAL_URL}${movie.backdrop_path}`
            : null;
        
        const year = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        // Get cast (first 5)
        const cast = movie.credits?.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'Information not available';
        
        // Get director
        const director = movie.credits?.crew?.find(person => person.job === 'Director')?.name || 'Information not available';
        
        // Get trailer
        const trailer = movie.videos?.results?.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        
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
                        ${movie.genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('')}
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
                    
                    ${trailer ? `
                        <h3>Trailer</h3>
                        <a href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" class="hero-btn primary" style="display: inline-block; text-decoration: none; margin-top: 15px;">
                            <i class="fab fa-youtube"></i> Watch Trailer
                        </a>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <button class="hero-btn primary" onclick="playMovie(${movie.id})">
                            <i class="fas fa-play"></i> Play Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Set modal background if backdrop exists
        if (backdropPath) {
            modal.style.background = `linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.9)), url('${backdropPath}')`;
            modal.style.backgroundSize = 'cover';
            modal.style.backgroundPosition = 'center';
        }
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading movie details:', error);
        modalBody.innerHTML = '<div class="error">Failed to load movie details. Please try again.</div>';
    }
}

// Play movie with multiple source options
function playMovie(movieId) {
    currentMovieId = movieId;
    
    // Save to watch history
    addToWatchHistory(movieId);
    
    // Get selected source
    const selectedSource = videoSourceSelect.value;
    
    if (selectedSource === 'auto') {
        // Try sources in order until one works
        trySourcesInOrder(movieId);
    } else {
        // Use selected source
        const sourceUrl = VIDEO_SOURCES[selectedSource].url;
        if (sourceUrl) {
            videoPlayer.src = `${sourceUrl}/${movieId}`;
        }
    }
    
    videoModal.style.display = 'block';
}

// Try multiple video sources in order
async function trySourcesInOrder(movieId) {
    const sources = ['vidsrc', 'vidsrcpro', 'vidsrcto', 'embed', 'moviesapi', '2embed'];
    
    for (const source of sources) {
        const sourceUrl = VIDEO_SOURCES[source].url;
        if (sourceUrl) {
            videoPlayer.src = `${sourceUrl}/${movieId}`;
            
            // Wait a bit to see if source works
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if source works (simplified check)
            try {
                const iframe = videoPlayer;
                // If we can access iframe content (same origin) or it loads, assume it works
                console.log(`Trying source: ${source}`);
                break;
            } catch (e) {
                console.log(`Source ${source} failed, trying next...`);
                continue;
            }
        }
    }
}

// Add movie to watch history
function addToWatchHistory(movieId) {
    const movie = movieCache.get(movieId);
    if (!movie) return;
    
    // Remove if already exists
    watchHistory = watchHistory.filter(id => id !== movieId);
    
    // Add to beginning
    watchHistory.unshift(movieId);
    
    // Keep only last 20
    if (watchHistory.length > 20) {
        watchHistory = watchHistory.slice(0, 20);
    }
    
    // Save to localStorage
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    
    // Update continue watching section
    loadContinueWatching();
}

// Load continue watching section
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
        
        genresGrid.innerHTML = data.genres.map(genre => `
            <div class="genre-card" onclick="loadGenreMovies(${genre.id}, '${genre.name}')">
                ${genre.name}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Load movies by genre
function loadGenreMovies(genreId, genreName) {
    currentCategory = `discover/movie?with_genres=${genreId}`;
    currentSearchQuery = '';
    sectionTitle.textContent = `${genreName} Movies`;
    loadMovies(currentCategory, 1);
    
    // Update active filter
    filterBtns.forEach(btn => btn.classList.remove('active'));
}

// Load featured movie
async function loadFeaturedMovie() {
    try {
        const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const featured = data.results[0];
            heroTitle.textContent = featured.title;
            heroDesc.textContent = featured.overview || 'Watch this amazing movie now!';
            
            // Update hero background
            if (featured.backdrop_path) {
                const heroSection = document.querySelector('.hero');
                heroSection.style.background = `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%), url('${IMG_ORIGINAL_URL}${featured.backdrop_path}')`;
                heroSection.style.backgroundSize = 'cover';
                heroSection.style.backgroundPosition = 'center';
            }
            
            // Set play button to play featured movie
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
    
    currentSearchQuery = query;
    currentCategory = 'search';
    sectionTitle.textContent = `Search Results for "${query}"`;
    await loadMovies('search', 1, query);
}

// Show error message
function showError(message) {
    moviesGrid.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
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
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCategory = btn.dataset.filter;
            currentSearchQuery = '';
            sectionTitle.textContent = btn.textContent;
            loadMovies(currentCategory, 1);
        });
    });
    
    // Nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const category = link.dataset.category;
            if (category === 'home') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
    
    // Load more button
    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        if (currentSearchQuery) {
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
            videoPlayer.src = ''; // Stop video
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
    
    // Handle image errors
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            e.target.src = 'https://via.placeholder.com/500x750?text=Image+Not+Available';
        }
    }, true);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            videoModal.style.display = 'none';
            videoPlayer.src = '';
        }
    });
}

// Make functions global for onclick handlers
window.playMovie = playMovie;
window.showMovieDetails = showMovieDetails;
window.loadGenreMovies = loadGenreMovies;
