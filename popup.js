document.addEventListener("DOMContentLoaded", function () {
    const saveUrlButton = document.getElementById("saveUrl");
    const urlList = document.getElementById("urlList");
    const categorySelect = document.getElementById("category");
    const customCategoryDiv = document.querySelector(".custom-category");
    const customCategoryInput = document.getElementById("customCategory");
    
    // Handle custom category selection
    categorySelect.addEventListener("change", function() {
        if (this.value === "custom") {
            customCategoryDiv.style.display = "block";
            customCategoryInput.focus();
        } else {
            customCategoryDiv.style.display = "none";
        }
    });
    
    saveUrlButton.addEventListener("click", async function () {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Get category - check if custom category is being used
        let category = categorySelect.value;
        if (category === "custom") {
            category = customCategoryInput.value.trim();
            
            // Validate custom category
            if (!category) {
                alert("Please enter a custom category name");
                customCategoryInput.focus();
                return;
            }
            
            // Add this custom category to the dropdown for future use
            addCustomCategoryToDropdown(category);
        }
        
        let savedItems = (await chrome.storage.local.get("urls"))?.urls || [];

        // Add visual feedback
        saveUrlButton.textContent = "Saving...";
        saveUrlButton.style.opacity = "0.7";

        // Prevent duplicate URLs
        if (!savedItems.some(item => item.url === tab.url)) {
            savedItems.push({ 
                url: tab.url, 
                category, 
                title: tab.title || "Study Resource",
                dateAdded: new Date().toISOString()
            });
            await chrome.storage.local.set({ urls: savedItems });
            
            // Show success animation
            setTimeout(() => {
                saveUrlButton.textContent = "Saved!";
                saveUrlButton.style.background = "linear-gradient(135deg, #48bb78 0%, #38a169 100%)";
                  setTimeout(() => {
                    saveUrlButton.textContent = "Save Resource";
                    saveUrlButton.style.background = "linear-gradient(135deg, #5e72eb 0%, #4c56ad 100%)";
                    saveUrlButton.style.opacity = "1";
                    
                    // Reset form
                    categorySelect.value = "";
                    customCategoryDiv.style.display = "none";
                    customCategoryInput.value = "";
                }, 1000);
            }, 300);
        } else {
            saveUrlButton.textContent = "Already Saved";
            setTimeout(() => {
                saveUrlButton.textContent = "Save Resource";                saveUrlButton.style.opacity = "1";
            }, 1000);
        }
        loadUrls();
    });

    function loadUrls() {
        chrome.storage.local.get("urls", function (data) {
            urlList.innerHTML = "";
            (data.urls || []).forEach((item, index) => {
                let li = document.createElement("li");
                let domain = new URL(item.url).hostname;
                let title = item.title || domain;
                
                // Format date if available
                let dateDisplay = '';
                if (item.dateAdded) {
                    try {
                        const date = new Date(item.dateAdded);
                        const options = { month: 'short', day: 'numeric', year: 'numeric' };
                        dateDisplay = `<span class="resource-date">Added: ${date.toLocaleDateString('en-US', options)}</span>`;
                    } catch (e) {
                        console.error('Error formatting date:', e);
                    }
                }
                
                // Truncate long titles
                if (title.length > 40) {
                    title = title.substring(0, 37) + "...";
                }
                  li.innerHTML = `
                    <div class="resource-item">
                        <div class="resource-header">
                            <span class="category-tag">${item.category}</span> 
                            <button data-index='${index}' class='delete-btn'>×</button>
                        </div>
                        <a class='resource-title' href='${item.url}' target='_blank' title='${item.url}'>${title}</a>
                        ${'' /* item.notes ? `<p class="resource-notes">${item.notes}</p>` : '' */} 
                        <div class="resource-footer">
                            <span class="resource-domain">${domain}</span>
                            ${dateDisplay}
                        </div>
                    </div>
                `;
                urlList.appendChild(li);
            });
        });
    }

    urlList.addEventListener("click", async function (event) {
        if (event.target.classList.contains("delete-btn")) {
            let index = event.target.getAttribute("data-index");
            let savedItems = (await chrome.storage.local.get("urls"))?.urls || [];
            savedItems.splice(index, 1);
            await chrome.storage.local.set({ urls: savedItems });
            loadUrls();
        }
    });

    // Function to add custom category to dropdown and save it
    function addCustomCategoryToDropdown(categoryName) {
        // Check if this category already exists
        let exists = false;
        for (let i = 0; i < categorySelect.options.length; i++) {
            if (categorySelect.options[i].value === categoryName) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            // Add to dropdown
            const newOption = document.createElement("option");
            newOption.value = categoryName;
            newOption.textContent = categoryName;
            
            // Insert before the "Add Custom Category" option
            const customOption = categorySelect.querySelector('option[value="custom"]');
            categorySelect.insertBefore(newOption, customOption);
            
            // Save custom categories to storage
            saveCustomCategories();
        }
        
        // Select the new category
        categorySelect.value = categoryName;
        customCategoryDiv.style.display = "none";
        customCategoryInput.value = "";
    }
    
    // Function to save custom categories
    function saveCustomCategories() {
        const customCategories = [];
        
        // Collect all non-default categories
        for (let i = 0; i < categorySelect.options.length; i++) {
            const option = categorySelect.options[i];
            if (option.value !== "" && 
                option.value !== "Course" && 
                option.value !== "Tutorial" && 
                option.value !== "Documentation" && 
                option.value !== "custom") {
                customCategories.push(option.value);
            }
        }
        
        // Save to storage
        chrome.storage.local.set({ customCategories });
    }
    
    // Load custom categories on startup
    function loadCustomCategories() {
        chrome.storage.local.get("customCategories", function(data) {
            if (data.customCategories && data.customCategories.length > 0) {
                // Get the "Add Custom Category" option
                const customOption = categorySelect.querySelector('option[value="custom"]');
                
                // Add each saved custom category
                data.customCategories.forEach(category => {
                    const newOption = document.createElement("option");
                    newOption.value = category;
                    newOption.textContent = category;
                    categorySelect.insertBefore(newOption, customOption);
                });
            }
        });
    }
    
    // Initialize custom categories
    loadCustomCategories();

    loadUrls();
});
