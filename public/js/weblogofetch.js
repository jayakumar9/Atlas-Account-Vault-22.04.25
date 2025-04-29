class WebLogoFetch extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
            <div class="web-logo-fetch-container">
                <div class="input-group">
                    <input type="text" id="website" placeholder="Enter website (e.g., google.com)" />
                    <button id="fetchButton">Fetch Logo</button>
                </div>
                <div class="logo-preview" style="margin-top: 10px; text-align: center;">
                    <img id="selectedLogo" style="max-width: 128px; max-height: 128px; display: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                </div>
                <div class="thumbnails-container" style="margin-top: 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 10px;">
                </div>
            </div>
        `;
        
        this.initEventListeners();
        this.loadThumbnails();
    }

    initEventListeners() {
        const websiteInput = this.querySelector('#website');
        const fetchButton = this.querySelector('#fetchButton');
        
        fetchButton.addEventListener('click', () => this.handleFetch());
        websiteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleFetch();
            }
        });
    }

    async handleFetch() {
        const websiteInput = this.querySelector('#website');
        const domain = this.cleanDomain(websiteInput.value);
        
        if (!domain || !this.isValidDomain(domain)) {
            console.error('Please enter a valid domain');
            return;
        }

        try {
            const logo = await this.fetchLogo(domain);
            if (logo) {
                // Update preview immediately
                this.updateLogoPreview(logo);
                
                // Show logo selection dialog
                const selectedLogo = await this.showLogoSelectionDialog([logo], domain);
                if (selectedLogo) {
                    this.updateLogoPreview(selectedLogo);
                    this.saveThumbnail(domain, selectedLogo);
                    this.loadThumbnails();
                }
            }
        } catch (error) {
            console.error('Error fetching logo:', error);
        }
    }

    updateLogoPreview(logoUrl) {
        const previewImg = this.querySelector('#selectedLogo');
        previewImg.src = logoUrl;
        previewImg.style.display = 'inline-block';
    }

    saveThumbnail(domain, logoUrl) {
        const thumbnails = JSON.parse(localStorage.getItem('logoThumbnails') || '[]');
        const newThumbnail = {
            domain,
            logoUrl,
            timestamp: new Date().toISOString()
        };
        
        // Add new thumbnail at the beginning and keep only last 12
        thumbnails.unshift(newThumbnail);
        if (thumbnails.length > 12) {
            thumbnails.pop();
        }
        
        localStorage.setItem('logoThumbnails', JSON.stringify(thumbnails));
    }

    loadThumbnails() {
        const container = this.querySelector('.thumbnails-container');
        const thumbnails = JSON.parse(localStorage.getItem('logoThumbnails') || '[]');
        
        container.innerHTML = thumbnails.map(thumb => `
            <div class="thumbnail" style="cursor: pointer; text-align: center;">
                <img src="${thumb.logoUrl}" 
                     alt="${thumb.domain}" 
                     title="${thumb.domain}\n${new Date(thumb.timestamp).toLocaleString()}"
                     style="width: 48px; height: 48px; object-fit: contain; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
                     onclick="this.closest('web-logo-fetch').updateLogoPreview('${thumb.logoUrl}')" />
            </div>
        `).join('');
    }

    async fetchLogo(domain) {
        if (!domain) {
            console.error('Domain is required');
            return null;
        }

        const cleanedDomain = this.cleanDomain(domain);
        if (!this.isValidDomain(cleanedDomain)) {
            console.error('Invalid domain:', cleanedDomain);
            return null;
        }

        const providers = [
            `https://www.google.com/s2/favicons?domain=${cleanedDomain}&sz=128`,
            `https://icons.duckduckgo.com/ip3/${cleanedDomain}.ico`,
            `https://logo.clearbit.com/${cleanedDomain}`,
            `https://api.faviconkit.com/${cleanedDomain}/128`
        ];

        for (const provider of providers) {
            try {
                console.log(`Attempting to fetch logo from: ${provider}`);
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(provider)}`;
                
                const response = await fetch(proxyUrl);
                if (!response.ok) {
                    console.warn(`Failed to fetch from ${provider}: ${response.status}`);
                    continue;
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);

                try {
                    const dimensions = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve({ width: img.width, height: img.height });
                        img.onerror = () => reject(new Error('Failed to load image'));
                        img.src = objectUrl;
                    });

                    if (dimensions.width < 8 || dimensions.height < 8) {
                        console.warn(`Image too small from ${provider}: ${dimensions.width}x${dimensions.height}`);
                        URL.revokeObjectURL(objectUrl);
                        continue;
                    }

                    // Normalize to 128x128 while maintaining aspect ratio
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = canvas.height = 128;

                    const img = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = objectUrl;
                    });

                    // Clear canvas
                    ctx.clearRect(0, 0, 128, 128);

                    // Calculate dimensions maintaining aspect ratio
                    const scale = Math.min(128 / img.width, 128 / img.height);
                    const width = img.width * scale;
                    const height = img.height * scale;
                    const x = (128 - width) / 2;
                    const y = (128 - height) / 2;

                    // Draw image centered
                    ctx.drawImage(img, x, y, width, height);

                    URL.revokeObjectURL(objectUrl);
                    return canvas.toDataURL('image/png');
                } catch (error) {
                    console.warn(`Error processing image from ${provider}:`, error);
                    URL.revokeObjectURL(objectUrl);
                    continue;
                }
            } catch (error) {
                console.warn(`Error fetching from ${provider}:`, error);
                continue;
            }
        }

        console.log('No logo found, creating default logo');
        return this.createDefaultLogo(cleanedDomain);
    }

    isValidDomain(domain) {
        if (!domain) return false;
        if (domain.length < 4 || !domain.includes('.')) return false;
        const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        return domainRegex.test(domain);
    }

    cleanDomain(url) {
        try {
            if (!url) return null;
            let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');
            domain = domain.split('/')[0];
            domain = domain.split('?')[0].split('#')[0];
            domain = domain.toLowerCase().trim();
            return domain.length < 4 || !domain.includes('.') ? null : domain;
        } catch (e) {
            console.error('Error cleaning domain:', e);
            return null;
        }
    }

    createDefaultLogo(domain) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#1a73e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Text (first two letters of domain)
        const text = domain.substring(0, 2).toUpperCase();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        return canvas.toDataURL('image/png');
    }

    async showLogoSelectionDialog(logos, domain) {
        // Clean up any existing dialogs
        const existingDialogs = document.querySelectorAll('.logo-selection-dialog');
        const existingOverlays = document.querySelectorAll('.logo-selection-overlay');
        existingDialogs.forEach(dialog => dialog.remove());
        existingOverlays.forEach(overlay => overlay.remove());

        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'logo-selection-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                z-index: 999;
            `;

            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = 'logo-selection-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2d2d2d;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                min-width: 500px;
            `;

            // Add title
            const title = document.createElement('h3');
            title.textContent = 'Select Logo';
            title.style.cssText = `
                margin: 0 0 20px 0;
                color: white;
                font-size: 18px;
                text-align: center;
            `;
            dialog.appendChild(title);

            // Create logo options container
            const optionsContainer = document.createElement('div');
            optionsContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            `;

            // Add logo options
            const options = [
                {
                    type: 'actual',
                    label: 'Company Logo',
                    url: logos[0]?.url || this.createDefaultLogo(domain)
                },
                {
                    type: 'default',
                    label: 'Default Logo',
                    url: this.createDefaultLogo(domain)
                },
                {
                    type: 'upload',
                    label: 'Upload Logo',
                    icon: '⬆️'
                }
            ];

            let selectedOption = options[0];

            options.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.style.cssText = `
                    border: 2px solid ${index === 0 ? '#1a73e8' : '#404040'};
                    border-radius: 8px;
                    padding: 15px;
                    cursor: pointer;
                    text-align: center;
                    background: #363636;
                    transition: all 0.2s;
                `;

                if (option.url) {
                    const img = document.createElement('img');
                    img.src = option.url;
                    img.style.cssText = `
                        width: 64px;
                        height: 64px;
                        margin-bottom: 10px;
                        object-fit: contain;
                    `;
                    optionElement.appendChild(img);
                } else if (option.icon) {
                    const iconDiv = document.createElement('div');
                    iconDiv.innerHTML = option.icon;
                    iconDiv.style.cssText = `
                        font-size: 32px;
                        margin-bottom: 10px;
                    `;
                    optionElement.appendChild(iconDiv);
                }

                const label = document.createElement('div');
                label.textContent = option.label;
                label.style.cssText = `
                    color: white;
                    font-size: 14px;
                `;
                optionElement.appendChild(label);

                optionElement.addEventListener('click', () => {
                    if (option.type === 'upload') {
                        fileInput.click();
                        return;
                    }
                    optionsContainer.querySelectorAll('div').forEach(div => {
                        div.style.borderColor = '#404040';
                    });
                    optionElement.style.borderColor = '#1a73e8';
                    selectedOption = option;
                });

                optionsContainer.appendChild(optionElement);
            });

            dialog.appendChild(optionsContainer);

            // Add file input for upload option
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files[0];
                if (file) {
                    try {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            cleanup();
                            resolve({
                                url: e.target.result,
                                type: 'uploaded',
                                label: 'Uploaded Logo'
                            });
                        };
                        reader.readAsDataURL(file);
                    } catch (error) {
                        console.error('Error processing upload:', error);
                    }
                }
            });
            dialog.appendChild(fileInput);

            // Add buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 10px;
            `;

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm';
            confirmBtn.style.cssText = `
                padding: 8px 20px;
                border: none;
                border-radius: 4px;
                background: #1a73e8;
                color: white;
                cursor: pointer;
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 8px 20px;
                border: none;
                border-radius: 4px;
                background: #dc3545;
                color: white;
                cursor: pointer;
            `;

            const cleanup = () => {
                document.body.removeChild(overlay);
                document.body.removeChild(dialog);
            };

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(selectedOption);
            });

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);
            dialog.appendChild(buttonContainer);

            document.body.appendChild(overlay);
            document.body.appendChild(dialog);
        });
    }
}

// Register the web component
customElements.define('web-logo-fetch', WebLogoFetch); 