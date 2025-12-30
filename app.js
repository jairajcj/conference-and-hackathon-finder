// State
let eventsData = []; // Will be fetched from backend
let currentFilter = {
    search: "",
    locations: ["India", "Virtual"], // Default checked
    type: "all",
    indexing: [],
    sortBy: "date-asc"
};

// DOM Elements
const eventsGrid = document.getElementById('eventsGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const locationCheckboxes = document.querySelectorAll('.filter-location');
const typeRadios = document.querySelectorAll('input[name="eventType"]');
const indexingCheckboxes = document.querySelectorAll('.filter-indexing');
const indexingFilterContainer = document.getElementById('indexingFilterCtn');

// Modal Elements
const modal = document.getElementById('eventModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const modalLocation = document.getElementById('modalLocation');
const modalDate = document.getElementById('modalDate');
const modalDeadline = document.getElementById('modalDeadline');
const modalPrice = document.getElementById('modalPrice');
const modalIndexing = document.getElementById('modalIndexing');
const modalDescription = document.getElementById('modalDescription');
const modalTags = document.getElementById('modalTags');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchEvents();
    setupEventListeners();
});

async function fetchEvents() {
    eventsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; display:flex; flex-direction:column; align-items:center; gap:15px;">
            <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p>Searching Google & Conference Portals...</p>
        </div>
    `;

    // Add spinner style dynamically if not exists
    if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }

    try {
        const response = await fetch('http://localhost:5000/api/events');
        if (!response.ok) throw new Error("Network response was not ok");
        eventsData = await response.json();
        renderEvents();
    } catch (error) {
        console.error("Error fetching events:", error);
        eventsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--accent); padding: 40px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; margin-bottom: 10px;"></ion-icon>
                <p>Failed to load live events. Please ensure 'server.py' is running.</p>
                <button class="btn btn-secondary" onclick="fetchEvents()" style="margin-top:15px;">Retry</button>
            </div>
        `;
        // Fallback or retry logic
    }
}


function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        currentFilter.search = e.target.value.toLowerCase();
        renderEvents();
    });

    sortSelect.addEventListener('change', (e) => {
        currentFilter.sortBy = e.target.value;
        renderEvents();
    });

    locationCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            updateLocationFilter();
            renderEvents();
        });
    });

    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentFilter.type = e.target.value;
            // Toggle Indexing visibility if not conference?
            if (currentFilter.type === 'hackathon') {
                indexingFilterContainer.style.opacity = '0.3';
                indexingFilterContainer.style.pointerEvents = 'none';
            } else {
                indexingFilterContainer.style.opacity = '1';
                indexingFilterContainer.style.pointerEvents = 'auto';
            }
            renderEvents();
        });
    });

    indexingCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            updateIndexingFilter();
            renderEvents();
        });
    });

    // Modal
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function updateLocationFilter() {
    currentFilter.locations = Array.from(locationCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function updateIndexingFilter() {
    currentFilter.indexing = Array.from(indexingCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function filterEvents(events) {
    return events.filter(event => {
        // Search
        if (!event.title.toLowerCase().includes(currentFilter.search) &&
            !event.location.toLowerCase().includes(currentFilter.search)) {
            return false;
        }

        // Type
        if (currentFilter.type !== 'all' && event.type !== currentFilter.type) {
            return false;
        }

        // Location
        // Logic: if 'India' is checked, show India events. If 'Virtual' checked, show Virtual.
        // If event is Virtual, check if 'Virtual' is in filter.
        // If event is Physical (India), check if 'India' is in filter.
        const isEventVirtual = event.isVirtual;
        const showVirtual = currentFilter.locations.includes('Virtual');
        const showIndia = currentFilter.locations.includes('India');

        if (isEventVirtual && !showVirtual) return false;
        if (!isEventVirtual && !showIndia) return false;

        // Indexing (Only applies if Indexing filter is active)
        if (currentFilter.indexing.length > 0) {
            // If event has NO indexing, it fails filter? Or check intersection?
            // Usually if I filter for IEEE, I want events that have IEEE.
            const hasMatch = event.indexing.some(idx => currentFilter.indexing.includes(idx));
            if (!hasMatch) return false;
        }

        return true;
    });
}

function sortEvents(events) {
    return events.sort((a, b) => {
        if (currentFilter.sortBy === 'price-asc') return a.price - b.price;
        if (currentFilter.sortBy === 'price-desc') return b.price - a.price;
        if (currentFilter.sortBy === 'date-asc') return new Date(a.startDate) - new Date(b.startDate);
        return 0;
    });
}

function renderEvents() {
    eventsGrid.innerHTML = '';

    let filtered = filterEvents(eventsData);
    filtered = sortEvents(filtered);

    if (filtered.length === 0) {
        eventsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">
                <ion-icon name="search" style="font-size: 3rem; margin-bottom: 10px;"></ion-icon>
                <p>No events found matching your criteria.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(event => {
        const dateObj = new Date(event.startDate);
        const month = dateObj.toLocaleString('default', { month: 'short' });
        const day = dateObj.getDate();

        const card = document.createElement('div');
        card.className = 'event-card';
        card.onclick = () => openModal(event);

        // Badge
        const badgeClass = event.type === 'hackathon' ? 'badge-hackathon' : 'badge-conference';

        // Tags HTML
        const indexTags = event.indexing.map(idx => `<span class="idx-tag">${idx}</span>`).join('');

        card.innerHTML = `
            <span class="card-badge ${badgeClass}">${event.type}</span>
            <div class="event-date-box">
                <span class="date-month">${month}</span>
                <span class="date-day">${day}</span>
            </div>
            <h3 class="event-title">${event.title}</h3>
            <div class="event-location">
                <ion-icon name="${event.isVirtual ? 'laptop-outline' : 'location-outline'}"></ion-icon>
                ${event.location}
            </div>
            <div class="card-footer">
                <div class="price">${event.price === 0 ? "Free" : event.currency + event.price}</div>
                <div class="indexing-tags">${indexTags}</div>
            </div>
        `;

        eventsGrid.appendChild(card);
    });
}

function openModal(event) {
    modalTitle.textContent = event.title;
    modalLocation.textContent = event.location;

    const d = new Date(event.startDate);
    modalDate.textContent = d.toDateString();

    modalDeadline.textContent = event.submissionDeadline;
    modalPrice.textContent = event.price === 0 ? "Free" : event.currency + event.price + (event.type === 'conference' ? ' (Approx APC/Reg)' : '');

    modalIndexing.textContent = event.indexing.length > 0 ? event.indexing.join(', ') : 'N/A';
    modalDescription.textContent = event.description;

    // Tags
    modalTags.innerHTML = `<span class="card-badge ${event.type === 'hackathon' ? 'badge-hackathon' : 'badge-conference'}" style="position:static;">${event.type}</span>`;

    modal.classList.add('active');
}
