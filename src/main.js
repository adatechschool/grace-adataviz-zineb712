// ============================================
// GESTION DE LA TRANSITION
// ============================================

// Éléments DOM
const welcomePage = document.getElementById('welcome-page');
const mainPage = document.getElementById('app');
const enterBtn = document.getElementById('enterBtn');
const backToHomeBtn = document.getElementById('backToHome');

// Variables d'état
let hasTransitioned = false;

// ============================================
// CONFIGURATION API
// ============================================

const API_URL = "https://opendata.paris.fr/api/records/1.0/search/?dataset=arbresremarquablesparis";
let start = 0;
const ROWS_PER_PAGE = 9;

// Variables d'état pour l'API
let isLoading = false;
let totalResults = 0;
let currentQuery = '';

// ============================================
// FONCTIONS DE TRANSITION
// ============================================

// Fonction pour passer à la page principale
function goToMainPage() {
    if (hasTransitioned) return;
    
    hasTransitioned = true;
    
    // Transition fluide
    welcomePage.classList.add('hidden');
    mainPage.classList.add('active');
    
    // Initialiser la page principale
    initMainPage();
}

// Fonction pour revenir à l'accueil
function goToHomePage() {
    if (!hasTransitioned) return;
    
    // Cacher la page principale
    mainPage.classList.remove('active');
    
    // Réafficher l'accueil
    setTimeout(() => {
        welcomePage.classList.remove('hidden');
        hasTransitioned = false;
    }, 300);
}

// ============================================
// INITIALISATION
// ============================================

// Événements
if (enterBtn) {
    enterBtn.addEventListener('click', goToMainPage);
}

if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', goToHomePage);
}

// ============================================
// INITIALISATION PAGE PRINCIPALE
// ============================================

// Variables pour les éléments DOM de la page principale
let dataContainer, searchInput, searchBtn, loadMoreBtn, resultsCount;

// Fonction pour initialiser les éléments DOM après la transition
function initMainPage() {
    // Sélectionner les éléments DOM
    dataContainer = document.getElementById('dataContainer');
    searchInput = document.getElementById('searchInput');
    searchBtn = document.getElementById('searchBtn');
    loadMoreBtn = document.getElementById('loadMoreBtn');
    resultsCount = document.getElementById('resultsCount');
    
    // Vérifier que les éléments existent
    if (!dataContainer || !searchBtn || !loadMoreBtn || !resultsCount) {
        console.error('Certains éléments sont introuvables');
        return;
    }
    
    // Initialiser les événements
    searchBtn.addEventListener('click', performSearch);
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    loadMoreBtn.addEventListener('click', loadMore);
    
    // Charger les données initiales
    loadInitialData();
}

// ============================================
// FONCTIONS API (restent identiques)
// ============================================

async function loadInitialData() {
    showLoader();
    const records = await fetchData();
    displayData(records, true);
}

function showLoader() {
    if (!dataContainer) return;
    
    dataContainer.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
            <p>Chargement des arbres remarquables...</p>
        </div>
    `;
}

function showError(message) {
    if (!dataContainer) return;
    
    dataContainer.innerHTML = `
        <div class="error-message">
            <h3>❌ Erreur</h3>
            <p>${message}</p>
            <p>Vérifiez votre connexion internet ou réessayez plus tard.</p>
        </div>
    `;
}

function showNoResults() {
    if (!dataContainer) return;
    
    dataContainer.innerHTML = `
        <div class="no-results">
            <h3>🔍 Aucun arbre trouvé</h3>
            <p>Essayez avec d'autres termes de recherche.</p>
        </div>
    `;
}

async function fetchData(query = '') {
    if (isLoading) return [];
    
    isLoading = true;
    
    try {
        const url = new URL(API_URL);
        url.searchParams.append('rows', ROWS_PER_PAGE);
        url.searchParams.append('start', start);
        
        if (query.trim()) {
            url.searchParams.append('q', query);
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        totalResults = data.nhits || 0;
        updateResultsCount();
        
        return data.records || [];
        
    } catch (error) {
        console.error('Erreur:', error);
        showError(`Impossible de charger les données: ${error.message}`);
        return [];
    } finally {
        isLoading = false;
    }
}

function updateResultsCount() {
    if (!resultsCount || !loadMoreBtn) return;
    
    const displayedCount = Math.min(start + ROWS_PER_PAGE, totalResults);
    resultsCount.textContent = `${displayedCount} arbres sur ${totalResults}`;
    
    if (displayedCount < totalResults) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

function formatData(record) {
    const fields = record.fields || {};
    
    const title = fields.com_nom_usuel || fields.arbres_libellefrancais || 'Arbre remarquable';
    const latinName = fields.com_nom_latin || `${fields.arbres_genre || ''} ${fields.arbres_espece || ''}`.trim();
    
    const details = [];
    
    if (latinName) {
        details.push(`🌿 <strong>Nom latin:</strong> ${latinName}`);
    }
    
    if (fields.com_adresse || fields.arbres_adresse) {
        const adresse = fields.com_adresse || fields.arbres_adresse;
        details.push(`📍 <strong>Adresse:</strong> ${adresse}`);
    }
    
    if (fields.com_arrondissement || fields.arbres_arrondissement) {
        const arrondissement = fields.com_arrondissement || fields.arbres_arrondissement;
        details.push(`🏙️ <strong>Arrondissement:</strong> ${arrondissement}`);
    }
    
    if (fields.arbres_hauteurenm) {
        details.push(`📏 <strong>Hauteur:</strong> ${fields.arbres_hauteurenm} m`);
    }
    
    if (fields.arbres_circonferenceencm) {
        details.push(`📐 <strong>Circonférence:</strong> ${fields.arbres_circonferenceencm} cm`);
    }
    
    if (fields.com_annee_plantation || fields.arbres_dateplantation) {
        const annee = fields.com_annee_plantation || 
                     (fields.arbres_dateplantation ? fields.arbres_dateplantation.split('-')[0] : '');
        if (annee) {
            details.push(`🌱 <strong>Planté en:</strong> ${annee}`);
        }
    }
    
    // Gestion de la photo
    const hasPhoto = fields.com_url_photo1;
    let photoSection = '';
    
    if (hasPhoto) {
        photoSection = `
            <div class="photo-info">
                <p class="photo-link">📷 <a href="${fields.com_url_photo1}" target="_blank">Voir la photo</a></p>
            </div>
        `;
    } else {
        photoSection = `
            <div class="no-photo-info">
                <p class="no-photo">🌳 <em>Photo non disponible</em></p>
            </div>
        `;
    }
    
    return {
        title: `🌳 ${title}`,
        details: details,
        photoSection: photoSection
    };
}

function displayData(records, isNewSearch = false) {
    if (!dataContainer) return;
    
    if (isNewSearch) {
        dataContainer.innerHTML = '';
        start = 0;
    }
    
    if (records.length === 0 && isNewSearch) {
        showNoResults();
        return;
    }
    
    records.forEach(record => {
        const formatted = formatData(record);
        
        const card = document.createElement('div');
        card.className = 'data-card';
        
        card.innerHTML = `
            <h3>${formatted.title}</h3>
            <div class="card-content">
                ${formatted.photoSection}
                <div class="card-details">
                    ${formatted.details.map(detail => `<p>${detail}</p>`).join('')}
                </div>
            </div>
        `;
        
        dataContainer.appendChild(card);
        
        // Pour mobile : toggle au clic
        card.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                this.classList.toggle('active');
            }
        });
    });
}

async function performSearch() {
    if (!searchInput || !dataContainer) return;
    
    const query = searchInput.value.trim();
    currentQuery = query;
    
    showLoader();
    start = 0;
    
    const records = await fetchData(query);
    displayData(records, true);
}

async function loadMore() {
    start += ROWS_PER_PAGE;
    
    const records = await fetchData(currentQuery);
    displayData(records, false);
}

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🌳 Arbres Remarquables de Paris - Prêt');
});