// Global variables
let itemCount = 1;
let map = null;
let marker = null;
let autocomplete = null;
let geocoder = null;
let records = [];
let visibleRecords = 5;
const RECORDS_KEY = 'recycleRecords';

// Hong Kong configuration
const MAP_CONFIG = {
    bounds: {
        north: 22.559,
        south: 22.153,
        west: 113.825,
        east: 114.434
    },
    center: { lat: 22.3193, lng: 114.1694 },
    zoom: 12,
    minZoom: 11,
    maxZoom: 20
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set minimum booking date (2 days from today)
    const today = new Date();
    const minDate = new Date();
    minDate.setDate(today.getDate() + 2);
    document.getElementById("booking-date").min = minDate.toISOString().split('T')[0];
    
    // Load Google Maps API
    if (!document.querySelector('script[src*="googleapis.com/maps/api/js"]')) {
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key={YOURAPI}&libraries=places&callback=initGoogleMaps&language=en&region=HK';
        script.async = true;
        script.defer = true;
        script.onerror = showErrorMap;
        document.head.appendChild(script);
    }
    
    // Load existing records
    loadRecords();
    
    // Show main page
    showPage('main-page');
});

// Page Navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.container').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show the requested page
    document.getElementById(pageId).classList.remove('hidden');
    
    // Initialize map when add-request page is shown
    if (pageId === 'add-request' && (typeof google === 'undefined' || !map)) {
        initGoogleMaps();
    }
    
    // Refresh records when records page is shown
    if (pageId === 'records') {
        renderRecords();
    }
}

// Item Management
function addItem() {
    itemCount++;
    const itemsContainer = document.getElementById('items-container');
    
    if (!itemsContainer) {
        console.error("Items container not found");
        return;
    }
    
    const newItem = document.createElement('div');
    newItem.className = 'item-group';
    newItem.innerHTML = `
        <div class="form-group item-category-select">
            <label for="item-type-${itemCount}">Waste Category</label>
            <select id="item-type-${itemCount}" class="form-control" required>
                <option value="">Select waste category</option>
                <option value="electronic-components">Electronic Components</option>
                <option value="phone-accessories">Phone Accessories</option>
                <option value="appliances">Appliances</option>
                <option value="precious-metal-products">Precious Metal Products</option>
                <option value="destruction-service">Destruction Service</option>
                <option value="beauty-products">Beauty Products</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="item-${itemCount}">Item Description</label>
            <input type="text" class="form-control" id="item-${itemCount}" placeholder="e.g. Plastic bottles, Cardboard" required>
        </div>
        
        <div class="form-group">
            <label for="quantity-${itemCount}">Quantity</label>
            <input type="number" class="form-control" id="quantity-${itemCount}" min="1" value="1" required>
        </div>
        
        <div class="form-group">
            <label for="photo-${itemCount}">Photo of Item (Optional)</label>
            <input type="file" class="form-control" id="photo-${itemCount}" accept="image/*">
        </div>
        
        <button type="button" class="btn btn-small remove-btn" onclick="removeItem(this)">
            <i class="fas fa-trash"></i> Remove Item
        </button>
    `;
    
    itemsContainer.appendChild(newItem);
}

function removeItem(button) {
    if (document.querySelectorAll('.item-group').length > 1) {
        button.closest('.item-group').remove();
    } else {
        alert("You need at least one item in your request.");
    }
}

// Google Maps Functions
function initGoogleMaps() {
    if (map) return;
    
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded');
        showErrorMap();
        return;
    }

    try {
        geocoder = new google.maps.Geocoder();
        
        map = new google.maps.Map(document.getElementById("map"), {
            center: MAP_CONFIG.center,
            zoom: MAP_CONFIG.zoom,
            minZoom: MAP_CONFIG.minZoom,
            maxZoom: MAP_CONFIG.maxZoom,
            restriction: {
                latLngBounds: MAP_CONFIG.bounds,
                strictBounds: false
            },
            streetViewControl: true,
            mapTypeControl: true,
            fullscreenControl: true
        });
        
        initAutocomplete();
        
        map.addListener("click", (event) => {
            placeMarker(event.latLng);
            updateLocationFields(event.latLng);
        });

        map.setOptions({
            styles: [
                { featureType: "poi", stylers: [{ visibility: "on" }] },
                { featureType: "transit", stylers: [{ visibility: "on" }] }
            ]
        });
        
    } catch (error) {
        console.error('Error initializing Google Maps:', error);
        showErrorMap();
    }
}

function initAutocomplete() {
    if (!map || !google.maps.places) {
        console.error('Map or Places API not ready');
        return;
    }

    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById("location"),
        {
            types: ["geocode"],
            fields: ["geometry", "formatted_address", "name"],
            componentRestrictions: { country: "hk" }
        }
    );
    
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            alert("No details available for input: " + place.name);
            return;
        }
        
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(18);
        }
        
        placeMarker(place.geometry.location);
        updateLocationFields(place.geometry.location);
    });
}

function placeMarker(location) {
    if (!map || !location) return;
    
    if (marker) {
        marker.setMap(null);
    }
    
    marker = new google.maps.Marker({
        position: location,
        map: map,
        title: "Selected Location",
        draggable: true
    });
    
    map.setZoom(18);
    map.panTo(location);

    marker.addListener('dragend', function() {
        updateLocationFields(marker.getPosition());
    });
}

function updateLocationFields(location) {
    if (!location) return;
    
    document.getElementById("latitude").value = location.lat();
    document.getElementById("longitude").value = location.lng();
    
    if (geocoder) {
        geocoder.geocode({ location: location, region: 'hk' }, (results, status) => {
            if (status === "OK" && results[0]) {
                document.getElementById("location").value = results[0].formatted_address;
            }
        });
    }
}

function showErrorMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;
    
    mapElement.innerHTML = '<div class="map-error">Unable to load Google Maps. Please check your internet connection and try again.</div>';
    mapElement.style.backgroundColor = '#f8d7da';
    mapElement.style.color = '#721c24';
    mapElement.style.padding = '20px';
    mapElement.style.textAlign = 'center';
}

// Records Management
function saveRecords() {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function loadRecords() {
    const savedRecords = localStorage.getItem(RECORDS_KEY);
    records = savedRecords ? JSON.parse(savedRecords) : [];
}

function addRecord(newRecord) {
    newRecord.id = Date.now();
    records.unshift(newRecord);
    saveRecords();
    renderRecords();
}

// Update the renderRecords function
function renderRecords(filteredRecords = null) {
    const recordsToShow = filteredRecords || records.slice(0, visibleRecords);
    const requestsList = document.getElementById('requests-list');
    
    if (!requestsList) {
        console.error("Requests list element not found");
        return;
    }
    
    requestsList.innerHTML = '';

    if (recordsToShow.length === 0) {
        requestsList.innerHTML = '<div class="no-records"><i class="fas fa-inbox"></i><p>No recycling requests found</p></div>';
        return;
    }

    recordsToShow.forEach(record => {
        const recordElement = document.createElement('div');
        recordElement.className = 'request-item';
        
        // Calculate total quantity
        const totalQuantity = record.items.reduce((sum, item) => sum + parseInt(item.quantity), 0);
        
        // Format items list
        const itemsList = record.items.map(item => `
            <li>
                <span>
                    ${item.description} 
                    <span class="item-category">(${formatItemType(item.type)})</span>
                </span>
                <span>${item.quantity} ${item.quantity > 1 ? 'items' : 'item'}</span>
            </li>
        `).join('');
        
        recordElement.innerHTML = `
            <div class="request-item-header">
                <div>
                    <span class="request-id">Request #RC-${record.id.toString().slice(-4)}</span>
                    <span class="request-date">Submitted on ${formatDate(record.createdAt)}</span>
                </div>
                <span class="status-badge status-${record.status}">
                    ${capitalizeFirstLetter(record.status)}
                </span>
            </div>
            
            <div class="request-details">
                <div class="request-detail">
                    <span class="request-detail-label">Pickup Date</span>
                    <span class="request-detail-value">${formatDate(record.bookingDate)}</span>
                </div>
                
                <div class="request-detail">
                    <span class="request-detail-label">Location</span>
                    <span class="request-detail-value">${record.location}</span>
                </div>
                
                <div class="request-detail">
                    <span class="request-detail-label">Total Items</span>
                    <span class="request-detail-value">
                        ${record.items.length} ${record.items.length > 1 ? 'types' : 'type'} 
                        <span class="total-quantity">${totalQuantity} total</span>
                    </span>
                </div>
            </div>
            
            <div class="request-items">
                <h4>Items Details</h4>
                <ul class="request-item-list">
                    ${itemsList}
                </ul>
            </div>
        `;
        requestsList.appendChild(recordElement);
    });

    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 
            (filteredRecords || visibleRecords >= records.length) ? 'none' : 'block';
    }
}


function filterRecords() {
    const searchTerm = document.getElementById('records-search').value.toLowerCase();
    const filterValue = document.getElementById('records-filter').value;
    
    let filtered = records;
    
    if (filterValue !== 'all') {
        filtered = filtered.filter(record => record.status === filterValue);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(record => 
            record.location.toLowerCase().includes(searchTerm) ||
            (record.items && record.items.some(item => 
                item.description.toLowerCase().includes(searchTerm)))
        );
    }
    
    renderRecords(filtered.slice(0, visibleRecords));
}

function loadMoreRecords() {
    visibleRecords += 5;
    filterRecords();
}

// Helper Functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getItemSummary(items) {
    if (!items || items.length === 0) return 'No items';
    return items.map(item => item.description).slice(0, 3).join(', ') + 
           (items.length > 3 ? '...' : '');
}

function capitalizeFirstLetter(string) {
    return string ? string.charAt(0).toUpperCase() + string.slice(1) : '';
}

function formatItemType(type) {
    const typeMap = {
        'electronic-components': 'Electronic Components',
        'phone-accessories': 'Phone Accessories',
        'appliances': 'Appliances',
        'precious-metal-products': 'Precious Metal Products',
        'destruction-service': 'Destruction Service',
        'beauty-products': 'Beauty Products'
    };
    return typeMap[type] || type;
}

// Form Submission
function submitRecycleRequest(event) {
    event.preventDefault();
    
    const location = document.getElementById("location").value;
    const bookingDate = document.getElementById("booking-date").value;
    
    // Validate minimum 2 days in advance
    const today = new Date();
    const selectedDate = new Date(bookingDate);
    const minDate = new Date();
    minDate.setDate(today.getDate() + 2);
    
    if (!location || !bookingDate) {
        alert("Please fill in all required fields");
        return;
    }
    
    if (selectedDate < minDate) {
        alert("Please select a date at least 2 days from today");
        return;
    }
    
    // Collect items data
    const items = [];
    const itemGroups = document.querySelectorAll('.item-group');
    
    // Validate each item
    for (let i = 0; i < itemGroups.length; i++) {
        const itemId = i + 1;
        const type = document.getElementById(`item-type-${itemId}`)?.value || 
                     document.getElementById(`item-type`).value;
        const description = document.getElementById(`item-${itemId}`).value;
        const quantity = document.getElementById(`quantity-${itemId}`).value;
        
        if (!type || !description || !quantity) {
            alert(`Please fill in all fields for item ${itemId}`);
            return;
        }
        
        items.push({
            description: description,
            quantity: quantity,
            type: type,
            photo: document.getElementById(`photo-${itemId}`)?.files[0]?.name || null
        });
    }
    
    // Create request object
    const newRecord = {
        id: Date.now(),
        location: location,
        latitude: document.getElementById("latitude").value,
        longitude: document.getElementById("longitude").value,
        bookingDate: bookingDate,
        items: items,
        status: "pending",
        createdAt: new Date().toISOString()
    };
    
    // Add to records and show success
    addRecord(newRecord);
    alert("Request submitted successfully!");
    
    // Reset form and return to main page
    resetRequestForm();
    showPage('main-page');
}

function resetRequestForm() {
    document.getElementById("request-form").reset();
    document.getElementById("items-container").innerHTML = `
        <div class="item-group">
            <div class="form-group">
                <label for="item-1">Item Description</label>
                <input type="text" class="form-control" id="item-1" placeholder="e.g. Plastic bottles, Cardboard" required>
            </div>
            
            <div class="form-group">
                <label for="quantity-1">Quantity</label>
                <input type="number" class="form-control" id="quantity-1" min="1" value="1" required>
            </div>
            
            <div class="form-group">
                <label for="photo-1">Photo of Item (Optional)</label>
                <input type="file" class="form-control" id="photo-1" accept="image/*">
            </div>
        </div>
    `;
    itemCount = 1;
    
    // Set minimum date for booking
    const today = new Date();
    const minDate = new Date();
    minDate.setDate(today.getDate() + 2);
    document.getElementById("booking-date").min = minDate.toISOString().split('T')[0];

}
