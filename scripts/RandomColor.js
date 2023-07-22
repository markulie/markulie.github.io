// Function to generate a random color
function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Apply a random color on hover
function applyRandomColor() {
    let element = document.getElementById('random-text');
    element.style.color = getRandomColor();
}

// Invoke applyRandomColor() when the page loads
window.addEventListener('load', function () {
    applyRandomColor();
});