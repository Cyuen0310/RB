let itemCount = 1;

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.container').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show the requested page
    document.getElementById(pageId).classList.remove('hidden');
}

function addItem() {
    itemCount++;
    const itemsContainer = document.getElementById('items-container');
    
    const newItem = document.createElement('div');
    newItem.className = 'item-group';
    newItem.innerHTML = `
        <div class="form-group">
            <label for="item-${itemCount}">Item Description</label>
            <input type="text" id="item-${itemCount}" placeholder="e.g. Plastic bottles, Cardboard" required>
        </div>
        
        <div class="form-group">
            <label for="quantity-${itemCount}">Quantity</label>
            <input type="number" id="quantity-${itemCount}" min="1" value="1" required>
        </div>
        
        <div class="form-group">
            <label for="photo-${itemCount}">Photo of Item</label>
            <input type="file" id="photo-${itemCount}" accept="image/*">
        </div>
        
        <button type="button" class="btn" style="background-color: #e74c3c;" onclick="removeItem(this)">Remove Item</button>
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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    showPage('main-page');
});