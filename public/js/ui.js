// UI Module
window.UI = {
    showMainContent() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        if (Auth.currentUser) {
            document.getElementById('username-display').textContent = `Welcome, ${Auth.currentUser.username}`;
        }
    },

    showAuthForms() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
    },

    showNotification(message, type = 'success') {
        console.log('[UI] Showing notification:', { message, type });
        
        if (!window.NotificationSystem) {
            console.error('[UI] NotificationSystem not loaded!');
            return;
        }
        
        console.log('[UI] NotificationSystem available, calling method:', type);
        if (type === 'success') {
            NotificationSystem.success(message);
        } else {
            NotificationSystem.error(message);
        }
    },

    fillAccountForm(account) {
        document.getElementById('account-id').value = account._id || '';
        document.getElementById('website').value = account.website || '';
        document.getElementById('name').value = account.name || '';
        document.getElementById('username').value = account.username || '';
        document.getElementById('email').value = account.email || '';
        document.getElementById('password').value = account.password || '';
        document.getElementById('note').value = account.note || '';
    },

    resetForm() {
        const form = document.getElementById('account-form');
        form.reset();
        document.getElementById('account-id').value = '';
        document.getElementById('attachedFile').value = '';
        if (window.AccountManager) {
            AccountManager.isEditing = false;
        }
    },

    async createAccountLogo(account) {
        // Input validation
        if (!account || typeof account !== 'object') {
            console.error('Invalid account object:', account);
            return this.createDefaultLogo();
        }

        // Return default logo if no website
        if (!account.website) {
            return this.createDefaultLogoFromName(account.name);
        }

        try {
            let websiteUrl = account.website.toLowerCase().trim();
            console.log('Processing website:', websiteUrl);
            
            // Clean up the URL and handle special cases
            if (websiteUrl.includes('gmail')) {
                websiteUrl = 'https://gmail.com';
            } else if (websiteUrl.includes('facebook')) {
                websiteUrl = 'https://facebook.com';
            } else {
                // Remove trailing slash
                websiteUrl = websiteUrl.replace(/\/$/, '');
                
                // Add https:// if no protocol is specified
                if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
                    websiteUrl = 'https://' + websiteUrl;
                }
            }

            console.log('Cleaned URL:', websiteUrl);

            // Parse URL and get hostname
            const url = new URL(websiteUrl);
            const hostname = url.hostname.replace(/^www\./, '');
            console.log('Hostname for favicon:', hostname);

            // Define favicon/logo providers to try in order
            let providers = [];
            if (hostname === 'gmail.com' || hostname === 'mail.google.com') {
                providers.push('https://mail.google.com/favicon.ico');
            }
            providers = providers.concat([
                `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
                `https://logo.clearbit.com/${hostname}`,
                `https://api.faviconkit.com/${hostname}/64`
            ]);

            for (const providerUrl of providers) {
                try {
                    console.log('Attempting to fetch favicon from:', providerUrl);
                    const response = await fetch(`/api/fetch-logo?url=${encodeURIComponent(providerUrl)}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        // Check if blob is an actual image (not a 404 or error page)
                        if (blob.size > 0 && blob.type.startsWith('image/')) {
                            const dataUrl = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                            return dataUrl;
                        } else {
                            console.warn(`Fetched blob from ${providerUrl} is not a valid image.`);
                        }
                    } else {
                        console.warn(`Failed to fetch logo from ${providerUrl}: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`Error fetching favicon from ${providerUrl}:`, error);
                }
            }
            // All providers failed, use fallback
            console.warn('All favicon providers failed, using fallback SVG.');
            return this.createDefaultLogoFromName(account.name);
        } catch (error) {
            console.error('Error creating account logo:', error);
            return this.createDefaultLogo();
        }
    },

    createDefaultLogoFromName(name) {
        // Generate logo from name
        const displayName = name || '??';
        const hash = displayName.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const hue = hash % 360;
        const color = `hsl(${hue}, 65%, 45%)`;
        const initial = displayName.substring(0, 2).toUpperCase();
        
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
                <rect width="40" height="40" fill="${color}" rx="4"/>
                <text x="50%" y="50%" font-family="Arial" font-size="20" 
                    fill="white" text-anchor="middle" dy=".3em"
                    font-weight="bold">${initial}</text>
            </svg>
        `)}`;
    },

    createDefaultLogo() {
        return this.createDefaultLogoFromName('??');
    },

    togglePasswordVisibility(element) {
        if (!element) return;
        
        try {
            // Check if this is a show/hide button in an account card
            if (element.classList.contains('show-password')) {
                const passwordSpan = element.previousElementSibling;
                if (passwordSpan && passwordSpan.classList.contains('password-value')) {
                    const password = passwordSpan.getAttribute('data-password');
                    if (passwordSpan.textContent === '••••••••') {
                        passwordSpan.textContent = password;
                        element.textContent = 'Hide';
                    } else {
                        passwordSpan.textContent = '••••••••';
                        element.textContent = 'Show';
                    }
                    return;
                }
            }

            // Handle password input fields (for forms)
            const input = element.previousElementSibling;
            if (!input || !input.type) {
                console.error('No password input found');
                return;
            }

            if (input.type === 'password') {
                input.type = 'text';
                element.classList.remove('fa-eye');
                element.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                element.classList.remove('fa-eye-slash');
                element.classList.add('fa-eye');
            }
        } catch (error) {
            console.error('Error toggling password visibility:', error);
        }
    },

    generatePassword(targetId = null) {
        try {
            const length = 16;
            const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
            let password = '';
            
            // Ensure at least one of each type
            password += charset.match(/[a-z]/)[0];
            password += charset.match(/[A-Z]/)[0];
            password += charset.match(/[0-9]/)[0];
            password += charset.match(/[^a-zA-Z0-9]/)[0];
            
            // Fill the rest randomly
            for (let i = password.length; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * charset.length);
                password += charset[randomIndex];
            }
            
            // Shuffle the password
            password = password.split('').sort(() => Math.random() - 0.5).join('');
            
            // Set the password in the input field
            const passwordInput = document.getElementById(targetId || 'password');
            if (passwordInput) {
                passwordInput.value = password;
                passwordInput.type = 'text';
                setTimeout(() => {
                    passwordInput.type = 'password';
                }, 2000);
            }
        } catch (error) {
            console.error('Error generating password:', error);
            UI.showNotification('Error generating password', 'error');
        }
    },

    displayFileName: function(input) {
        const fileNameDisplay = document.getElementById('file-name-display');
        if (!fileNameDisplay) {
            console.error('[UI.displayFileName] file-name-display element not found in DOM');
            return;
        }

        if (input.files && input.files[0]) {
            console.log('[UI.displayFileName] File selected:', input.files[0].name);
            fileNameDisplay.textContent = `Selected file: ${input.files[0].name}`;
        } else {
            console.log('[UI.displayFileName] No file selected');
            fileNameDisplay.textContent = '';
        }
    }
};

// Update database info in header
async function updateDatabaseInfo() {
    try {
        const response = await fetch('/api/db-info');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const dbNameElement = document.getElementById('db-name');
        const collectionNameElement = document.getElementById('collection-name');
        
        if (dbNameElement && data.dbName) {
            dbNameElement.textContent = data.dbName;
            dbNameElement.style.color = data.dbName === 'Not connected' ? '#dc3545' : '#4CAF50';
        }
        
        if (collectionNameElement && data.collectionName) {
            collectionNameElement.textContent = data.collectionName;
            collectionNameElement.style.color = data.collectionName === 'Error' ? '#dc3545' : '#4CAF50';
        }
    } catch (error) {
        console.error('Error fetching database info:', error);
        const dbNameElement = document.getElementById('db-name');
        const collectionNameElement = document.getElementById('collection-name');
        
        if (dbNameElement) {
            dbNameElement.textContent = 'Error';
            dbNameElement.style.color = '#dc3545';
        }
        if (collectionNameElement) {
            collectionNameElement.textContent = 'Error';
            collectionNameElement.style.color = '#dc3545';
        }
    }
}

// Call this when initializing the UI and periodically
document.addEventListener('DOMContentLoaded', () => {
    updateDatabaseInfo();
    // Update database info every 30 seconds
    setInterval(updateDatabaseInfo, 30000);
});