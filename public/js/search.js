// ✅ Cleaned, fully working search with client-side filtering
let searchTimeout; // This will hold the reference to the timeout

window.filterAccounts = function filterAccounts() {
    const searchInput = document.getElementById('account-search');
    const filter = searchInput.value.trim().toLowerCase();

    // If the input is empty, show all accounts
    if (!filter) {
        console.log("[Search] Empty input, showing all accounts");
        AccountManager.displayAccounts(AccountManager.allAccounts);
        return;
    }

    // Clear the previous timeout (if any)
    clearTimeout(searchTimeout);

    // Set a new timeout to delay the search by 500ms
    searchTimeout = setTimeout(() => {
        const isWebsiteSearch = filter.endsWith('.com');

        // If the filter starts with '#' and is followed by numbers, it's a serial number search
        const serialFilter = filter.startsWith('#') ? filter.substring(1) : filter;
        const serialFilterNumber = Number(serialFilter);

        console.log(`[Search] User input: '${filter}'`);
        console.log(`[Search] Parsed serial filter number: '${serialFilterNumber}'`);

        // Filtering accounts logic
        const filteredAccounts = AccountManager.allAccounts.filter(account => {
            if (!account) return false;

            let matches = false;

            // If the input ends with '.com', only check the website field
            if (isWebsiteSearch) {
                matches = account.website && account.website.toLowerCase().includes(filter);
            } else {
                // If the filter starts with '#' and is a valid number, look for serial number match
                if (filter.startsWith('#') && !isNaN(serialFilterNumber)) {
                    matches = (account.serialNumber === serialFilterNumber);
                } else {
                    // Otherwise, search across all fields (name, website, username, email, note)
                    matches =
                        (account.name && account.name.toLowerCase().includes(filter)) ||
                        (account.website && account.website.toLowerCase().includes(filter)) ||
                        (account.username && account.username.toLowerCase().includes(filter)) ||
                        (account.email && account.email.toLowerCase().includes(filter)) ||
                        (account.note && account.note.toLowerCase().includes(filter));
                }
            }

            console.log(`[Filter] Account '${account.name}' matches:`, matches);
            return matches;
        });

        console.log(`[Search] Found ${filteredAccounts.length} matching accounts`);

        // If there are matching accounts, display them, else show "No accounts found."
        const accountsList = document.getElementById('accounts-list');
        if (filteredAccounts.length === 0) {
            accountsList.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="260" height="60">
                <rect x="0" y="0" rx="10" ry="10" width="260" height="60" fill="blue"/>
                <text x="130" y="38" fill="white" font-size="16" text-anchor="middle" font-family="Arial, sans-serif">
                  No accounts found!
                </text>
              </svg>
            `;
          } else {
            AccountManager.displayAccounts(filteredAccounts);
          }
      

    }, 3000); // Delay search by 500ms
};







// Attach the event listener after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('account-search');
    if (searchInput) {
        searchInput.addEventListener('input', window.filterAccounts); // Use "input" event for smoothness
    } else {
        console.error("[Search] #account-search input not found on page");
    }

    // Check if the file name is displayed in the web view
    const fileNameElement = document.getElementById('file-name-display');
    if (!fileNameElement) {
        console.error("[File Display] File name element not found in the web view");
    } else {
        console.log("[File Display] File name element is present in the web view");
    }
});


