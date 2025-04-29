// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');

    // Initialize password toggle icons
    const initializePasswordToggles = () => {
        document.querySelectorAll('.toggle-password').forEach(icon => {
            icon.removeEventListener('click', handlePasswordToggle);
            icon.addEventListener('click', handlePasswordToggle);
        });
    };

    const handlePasswordToggle = function(e) {
        e.preventDefault();
        e.stopPropagation();
        UI.togglePasswordVisibility(this);
    };

    // Initial setup of password toggles
    initializePasswordToggles();

    // Function to show login form
    window.showLoginForm = () => {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.querySelector('.auth-toggle button:first-child').classList.add('active');
        document.querySelector('.auth-toggle button:last-child').classList.remove('active');
        initializePasswordToggles(); // Reinitialize toggles after form switch
    };

    // Function to show register form
    window.showRegisterForm = () => {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
        document.querySelector('.auth-toggle button:first-child').classList.remove('active');
        document.querySelector('.auth-toggle button:last-child').classList.add('active');
        initializePasswordToggles(); // Reinitialize toggles after form switch
    };

    // Add form submit event listeners
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', (e) => AccountManager.handleAccountSubmit(e));
    }

    // Add click handlers for auth toggle buttons
    const loginToggle = document.querySelector('.auth-toggle button:first-child');
    const registerToggle = document.querySelector('.auth-toggle button:last-child');
    
    if (loginToggle) {
        loginToggle.addEventListener('click', showLoginForm);
    }

    if (registerToggle) {
        registerToggle.addEventListener('click', showRegisterForm);
    }

    // Add click handler for logout button
    const logoutButton = document.querySelector('button[onclick="Auth.logout()"]');
    if (logoutButton) {
        logoutButton.onclick = () => Auth.logout();
    }

    // Add click handler for generate password button
    const generatePasswordButton = document.querySelector('button[onclick="UI.generatePassword()"]');
    if (generatePasswordButton) {
        generatePasswordButton.onclick = () => UI.generatePassword();
    }

    // Initialize the UI state
    if (Auth.isAuthenticated()) {
        UI.showMainContent();
        AccountManager.loadAccounts();
    } else {
        UI.showAuthForms();
    }

    // Check authentication status on page load
    Auth.checkAuth();

    // Test script for file-name-display element
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) {
        console.log('[Debug] file-name-display element found in DOM.');
        console.log('[Debug] Current text content:', fileNameDisplay.textContent);
        console.log('[Debug] Current visibility:', window.getComputedStyle(fileNameDisplay).visibility);
        console.log('[Debug] Current display:', window.getComputedStyle(fileNameDisplay).display);
    } else {
        console.error('[Debug] file-name-display element not found in DOM.');
    }

    console.log('Application initialized');
});