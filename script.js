/* =========================================================
   Forkful — recipe search
   Data source: TheMealDB public API (no key required)
     https://www.themealdb.com/api.php
   Endpoints used:
     - categories.php            list all categories
     - search.php?s=<name>       search recipes by name
     - filter.php?c=<category>   list recipes in a category
     - lookup.php?i=<id>         full detail for one recipe
   ========================================================= */

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';
const FAVORITES_KEY = 'forkful:favorites';

// ---- DOM references ----
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const categoryChips = document.getElementById('categoryChips');
const resultsGrid = document.getElementById('resultsGrid');
const resultsHeading = document.getElementById('resultsHeading');
const resultsCount = document.getElementById('resultsCount');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const noResultsState = document.getElementById('noResultsState');
const favToggleBtn = document.getElementById('favToggleBtn');
const favCountLabel = document.getElementById('favCountLabel');
const recipeModalBody = document.getElementById('recipeModalBody');
const recipeModalLabel = document.getElementById('recipeModalLabel');
const themeToggleBtn = document.getElementById("themeToggleBtn");

let activeCategory = null;   // currently selected category chip (or null)
let showingFavorites = false;
let recipeModal;

document.addEventListener('DOMContentLoaded', () => {
    recipeModal = new bootstrap.Modal(document.getElementById('recipeModal'));

    loadCategories();
    updateFavCount();

    const savedTheme = localStorage.getItem("theme");

if(savedTheme==="dark"){
    document.body.classList.add("dark-mode");
    themeToggleBtn.textContent="☀️";
}

    searchForm.addEventListener('submit', handleSearchSubmit);
    favToggleBtn.addEventListener('click', toggleFavoritesView);
    themeToggleBtn.addEventListener("click",toggleTheme);
});

/* =========================================================
   Categories
   ========================================================= */

async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories.php`);
        if (!res.ok) throw new Error(`Categories request failed (${res.status})`);
        const data = await res.json();

        categoryChips.innerHTML = '';
        data.categories.slice(0, 10).forEach(cat => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'category-chip';
            chip.textContent = cat.strCategory;
            chip.addEventListener('click', () => handleCategoryClick(cat.strCategory, chip));
            categoryChips.appendChild(chip);
        });
    } catch (err) {
        categoryChips.innerHTML = '<span class="chip-placeholder">Categories unavailable right now.</span>';
    }
}

function handleCategoryClick(categoryName, chipEl) {
    showingFavorites = false;
    favToggleBtn.classList.remove('is-active');

    const alreadyActive = chipEl.classList.contains('is-active');
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('is-active'));

    if (alreadyActive) {
        // toggling the same chip off returns to the empty/start state
        activeCategory = null;
        showEmptyState();
        resultsHeading.textContent = 'Start exploring';
        resultsCount.textContent = '';
        return;
    }

    activeCategory = categoryName;
    chipEl.classList.add('is-active');
    searchInput.value = '';
    fetchByCategory(categoryName);
}

/* =========================================================
   Search
   ========================================================= */

function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    showingFavorites = false;
    favToggleBtn.classList.remove('is-active');
    activeCategory = null;
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('is-active'));

    fetchBySearch(query);
}

async function fetchBySearch(query) {
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE}/search.php?s=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`Search request failed (${res.status})`);
        const data = await res.json();

        resultsHeading.textContent = `Results for “${query}”`;
        renderMeals(data.meals);
    } catch (err) {
        showErrorState(err.message);
    } finally {
        setLoading(false);
    }
}

async function fetchByCategory(categoryName) {
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE}/filter.php?c=${encodeURIComponent(categoryName)}`);
        if (!res.ok) throw new Error(`Category request failed (${res.status})`);
        const data = await res.json();

        resultsHeading.textContent = categoryName;
        // filter.php only returns id/name/thumbnail — good enough for the grid view
        renderMeals(data.meals);
    } catch (err) {
        showErrorState(err.message);
    } finally {
        setLoading(false);
    }
}

/* =========================================================
   Rendering
   ========================================================= */

function renderMeals(meals) {
    resultsGrid.innerHTML = '';
    hideAllStates();

    if (!meals || meals.length === 0) {
        resultsCount.textContent = '';
        noResultsState.classList.remove('d-none');
        return;
    }

    resultsCount.textContent = `${meals.length} recipe${meals.length === 1 ? '' : 's'}`;

    meals.forEach(meal => {
        resultsGrid.appendChild(buildMealCard(meal));
    });
}

function buildMealCard(meal) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-lg-4 col-xl-3';

    const isSaved = isFavorite(meal.idMeal);
    const areaOrCategory = meal.strArea || meal.strCategory || '';

    col.innerHTML = `
        <article class="recipe-card">
            <div class="recipe-card-image-wrap">
                ${areaOrCategory ? `<span class="recipe-ribbon">${escapeHtml(areaOrCategory)}</span>` : ''}
                <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy">
            </div>
            <div class="recipe-card-body">
                <h3 class="recipe-name">${escapeHtml(meal.strMeal)}</h3>
                <div class="recipe-card-actions">
                    <button type="button" class="btn btn-view-recipe" data-id="${meal.idMeal}">
                        View Recipe
                    </button>
                    <button type="button" class="btn btn-save ${isSaved ? 'is-saved' : ''}"
                        data-id="${meal.idMeal}"
                        data-name="${escapeHtml(meal.strMeal)}"
                        data-thumb="${meal.strMealThumb}"
                        aria-label="${isSaved ? 'Remove from saved' : 'Save recipe'}">
                        ${isSaved ? '&#9829;' : '&#9825;'}
                    </button>
                </div>
            </div>
        </article>
    `;

    col.querySelector('.btn-view-recipe').addEventListener('click', () => openRecipeModal(meal.idMeal));
    col.querySelector('.btn-save').addEventListener('click', (e) => handleSaveToggle(e, meal));

    return col;
}

/* =========================================================
   Recipe detail modal
   ========================================================= */

async function openRecipeModal(id) {
    recipeModalLabel.textContent = 'Loading…';
    recipeModalBody.innerHTML = `
        <div class="state-block">
            <div class="spinner-border" role="status"><span class="visually-hidden">Loading…</span></div>
        </div>
    `;
    recipeModal.show();

    try {
        const res = await fetch(`${API_BASE}/lookup.php?i=${id}`);
        if (!res.ok) throw new Error(`Recipe lookup failed (${res.status})`);
        const data = await res.json();
        const meal = data.meals && data.meals[0];

        if (!meal) {
            recipeModalBody.innerHTML = `<p class="text-muted">Recipe details couldn't be found.</p>`;
            return;
        }

        recipeModalLabel.textContent = meal.strMeal;
        recipeModalBody.innerHTML = buildRecipeDetailMarkup(meal);

    } catch (err) {
        recipeModalBody.innerHTML = `<p class="text-muted">Couldn't load this recipe. Please try again.</p>`;
    }
}

function buildRecipeDetailMarkup(meal) {
    const ingredients = getIngredientList(meal)
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join('');

    const youtubeButton = meal.strYoutube
        ? `<a class="btn-youtube" href="${meal.strYoutube}" target="_blank" rel="noopener">Watch on YouTube</a>`
        : '';

    return `
        <img class="recipe-modal-image" src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}">
        <div class="recipe-modal-tags">
            ${meal.strCategory ? `<span class="tag">${escapeHtml(meal.strCategory)}</span>` : ''}
            ${meal.strArea ? `<span class="tag">${escapeHtml(meal.strArea)}</span>` : ''}
        </div>
        <h6 class="section-label">Ingredients</h6>
        <ul class="ingredients-list">${ingredients}</ul>
        <h6 class="section-label">Instructions</h6>
        <p class="recipe-instructions">${escapeHtml(meal.strInstructions)}</p>
        ${youtubeButton}
    `;
}

// TheMealDB spreads ingredients across strIngredient1..20 / strMeasure1..20
function getIngredientList(meal) {
    const list = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
            list.push(`${measure ? measure.trim() : ''} ${ingredient.trim()}`.trim());
        }
    }
    return list;
}

/* =========================================================
   Favorites (persisted with localStorage)
   ========================================================= */

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
        return [];
    }
}

function isFavorite(id) {
    return getFavorites().some(f => f.idMeal === id);
}

function handleSaveToggle(event, meal) {
    const btn = event.currentTarget;
    const favorites = getFavorites();
    const existingIndex = favorites.findIndex(f => f.idMeal === meal.idMeal);

    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
        btn.classList.remove('is-saved');
        btn.innerHTML = '&#9825;';
        btn.setAttribute('aria-label', 'Save recipe');
    } else {
        favorites.push({
            idMeal: meal.idMeal,
            strMeal: meal.strMeal,
            strMealThumb: meal.strMealThumb,
            strArea: meal.strArea || meal.strCategory || ''
        });
        btn.classList.add('is-saved');
        btn.innerHTML = '&#9829;';
        btn.setAttribute('aria-label', 'Remove from saved');
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    updateFavCount();

    // if currently viewing the favorites list, re-render so removals disappear immediately
    if (showingFavorites) {
        renderMeals(getFavorites().map(f => ({
            idMeal: f.idMeal,
            strMeal: f.strMeal,
            strMealThumb: f.strMealThumb,
            strArea: f.strArea
        })));
        resultsCount.textContent = `${getFavorites().length} saved`;
    }
}

function updateFavCount() {
    favCountLabel.textContent = `Saved (${getFavorites().length})`;
}

function toggleFavoritesView() {
    showingFavorites = !showingFavorites;
    favToggleBtn.classList.toggle('is-active', showingFavorites);

    if (showingFavorites) {
        activeCategory = null;
        searchInput.value = '';
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('is-active'));

        const favorites = getFavorites();
        resultsHeading.textContent = 'Your saved recipes';
        renderMeals(favorites.map(f => ({
            idMeal: f.idMeal,
            strMeal: f.strMeal,
            strMealThumb: f.strMealThumb,
            strArea: f.strArea
        })));
    } else {
        resultsHeading.textContent = 'Start exploring';
        resultsCount.textContent = '';
        showEmptyState();
    }
}

/* =========================================================
   UI state helpers
   ========================================================= */

function setLoading(isLoading) {
    if (isLoading) {
        hideAllStates();
        loadingState.classList.remove('d-none');
    } else {
        loadingState.classList.add('d-none');
    }
}

function showErrorState(message) {
    hideAllStates();
    resultsGrid.innerHTML = '';
    if (message) errorMessage.textContent = message;
    errorState.classList.remove('d-none');
}

function showEmptyState() {
    resultsGrid.innerHTML = '';
    hideAllStates();
    emptyState.classList.remove('d-none');
}

function hideAllStates() {
    loadingState.classList.add('d-none');
    errorState.classList.add('d-none');
    emptyState.classList.add('d-none');
    noResultsState.classList.add('d-none');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function toggleTheme(){

    document.body.classList.toggle("dark-mode");

    if(document.body.classList.contains("dark-mode")){

        localStorage.setItem("theme","dark");
        themeToggleBtn.textContent="☀️";

    }else{

        localStorage.setItem("theme","light");
        themeToggleBtn.textContent="🌙";

    }

}