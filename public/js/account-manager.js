window.AccountManager = {
    isEditing: false,
    allAccounts: [], // Store all fetched accounts

    // Initialize accounts after login
    async initializeAccounts() {
        console.log('[AccountManager] Initializing accounts after login');
        await this.loadAccounts(); // Automatically displays accounts
    },

    // Load all accounts from server
    async loadAccounts() {
        console.log('[AccountManager] Starting loadAccounts');
        const accountsList = document.getElementById('accounts-list');

        if (!accountsList) {
            console.error('accounts-list element not found');
            return;
        }

        try {
            const token = Auth.getToken();
            if (!token) {
                console.error('No authentication token found');
                UI.showAuthForms();
                return;
            }

            const response = await fetch('/api/accounts', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const accounts = await response.json();

            // Deduplicate and sort
            const uniqueAccounts = accounts.reduce((acc, account) => {
                if (account._id && !acc.some(existing => existing._id === account._id)) {
                    acc.push(account);
                }
                return acc;
            }, []).sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));

            this.allAccounts = uniqueAccounts;
            await this.displayAccounts(this.allAccounts); // Display all accounts
        } catch (error) {
            console.error('Error in loadAccounts:', error);
            accountsList.innerHTML = '<div class="error-message">Error loading accounts: ' + error.message + '</div>';
            UI.showNotification('Failed to load accounts', 'error');
        }
    },

    // Filter accounts based on search query
    async filterAccounts(query) {
        console.log('[AccountManager] Filtering accounts with query:', query);
        const filter = query.trim().toLowerCase();
    
        let filteredAccounts = [];
    
        if (!filter) {
            // If search box is empty, show all
            filteredAccounts = this.allAccounts;
        } else if (filter.startsWith('#')) {
            // Filter by serial number like "#2"
            const serial = parseInt(filter.slice(1));
            if (!isNaN(serial)) {
                if (serial >= 1 && serial <= this.allAccounts.length) {
                    filteredAccounts = [this.allAccounts[serial - 1]];
                }
            }
        } else {
            // General keyword filter
            filteredAccounts = this.allAccounts.filter(account => {
                return (
                    account.website?.toLowerCase().includes(filter) ||
                    account.name?.toLowerCase().includes(filter) ||
                    account.username?.toLowerCase().includes(filter) ||
                    account.email?.toLowerCase().includes(filter) ||
                    account.note?.toLowerCase().includes(filter)
                );
            });
        }
    
        // Re-assign serial numbers fresh for display
        const refreshedAccounts = filteredAccounts.map((acc, index) => ({
            ...acc,
            serialNumber: index + 1
        }));
    
        await this.displayAccounts(refreshedAccounts);
    },
    

    // Display accounts to the DOM
    async displayAccounts(accounts) {
        console.log('Displaying', accounts.length, 'accounts');
        const accountsList = document.getElementById('accounts-list');
        const accountsTitle = document.querySelector('.accounts-container h2');

        if (!accountsList || !window.UI) {
            console.error('Required DOM elements or UI module missing');
            return;
        }

        accountsList.innerHTML = '';

        if (accountsTitle) {
            accountsTitle.textContent = `Stored Accounts (${accounts.length})`;
        }

        if (accounts.length === 0) {
            accountsList.innerHTML = '<div class="no-accounts">No accounts found. Add your first account using the form above.</div>';
            return;
        }

        for (let index = 0; index < accounts.length; index++) {
            const account = accounts[index];
            try {
                const accountCard = document.createElement('div');
                accountCard.className = 'account-card';

                const serialNumber = account.serialNumber || (index + 1);
                const accountLogo = await window.UI.createAccountLogo(account);

                let hostname = '';
                if (account.website) {
                    try {
                        const websiteUrl = account.website.toLowerCase();
                        const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl);
                        hostname = url.hostname.replace(/^www\./, '');
                    } catch (e) {
                        console.error('Invalid website URL:', e);
                    }
                }

                accountCard.innerHTML = `
                    <div class="serial-number">#${serialNumber}</div>
                    <div class="account-content">
                        <div class="account-logo-container">
                            <img 
                                src="${accountLogo}"
                                alt="${account.name || 'Account'}"
                                class="account-logo"
                                data-website="${hostname}"
                                onerror="this.src='${UI.createDefaultLogoFromName(account.name)}';"
                            />
                        </div>
                        <div class="account-info">
                            <h3>${account.name || 'Unnamed Account'}</h3>
                            <p><strong>Website:</strong> ${account.website || 'N/A'}</p>
                            <p><strong>Username:</strong> ${account.username || 'N/A'}</p>
                            <p><strong>Email:</strong> ${account.email || 'N/A'}</p>
                            <div class="password-field">
                                <strong>Password:</strong> 
                                <span class="password-value" data-password="${account.password || ''}">••••••••</span>
                                <button type="button" class="show-password" onclick="UI.togglePasswordVisibility(this)">Show</button>
                            </div>
                            ${account.note ? `<p><strong>Note:</strong> ${account.note}</p>` : ''}
                            ${account.attachedFile ? `
                                <div class="file-info">
                                    <strong>File:</strong> 
                                    <a href="#" onclick="AccountManager.viewFile('${account._id}', '${account.attachedFile.filename}'); return false;" 
                                       class="file-link">
                                        <i class="fas fa-paperclip"></i>
                                        ${account.attachedFile.filename}
                                    </a>
                                </div>` : ''}
                        </div>
                        <div class="account-actions">
                            <button onclick="AccountManager.editAccount('${account._id}')" class="edit-btn">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button onclick="AccountManager.deleteAccount('${account._id}')" class="delete-btn">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;

                accountsList.appendChild(accountCard);
            } catch (err) {
                console.error(`Error rendering account ${index + 1}:`, err);
            }
        }

        console.log('All accounts displayed successfully');
    }
};
