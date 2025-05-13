document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const folderList = document.getElementById("folderList");
    const resourceList = document.getElementById("resourceList");
    const newFolderNameInput = document.getElementById("newFolderNameInput");
    const addFolderButton = document.getElementById("addFolderButton");
    const saveUrlButton = document.getElementById("saveUrlButton");
    const newResourceNameInput = document.getElementById("newResourceNameInput");
    const currentFolderNameDisplay = document.getElementById("currentFolderNameDisplay");
    const noFoldersMessage = document.getElementById("noFoldersMessage");
    const noResourcesMessage = document.getElementById("noResourcesMessage");

    // State variables
    let activeFolderId = null;
    
    // Main initialization
    initializeExtension();
    
    // Add event listeners
    addFolderButton.addEventListener("click", createNewFolder);
    saveUrlButton.addEventListener("click", saveCurrentPageToFolder);
    newFolderNameInput.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
            createNewFolder();
        }
    });
    newResourceNameInput.addEventListener("keyup", function(event) {
        if (event.key === "Enter" && !saveUrlButton.disabled) {
            saveCurrentPageToFolder();
        }
    });
    
    // Initialize the extension
    async function initializeExtension() {
        await loadFolders();
        updateSaveButtonState();
    }
    
    // Load and display folders from storage
    async function loadFolders() {
        const data = await chrome.storage.local.get("folders");
        const folders = data.folders || [];
        
        folderList.innerHTML = "";
        
        if (folders.length === 0) {
            noFoldersMessage.style.display = "block";
            activeFolderId = null;
            currentFolderNameDisplay.textContent = "No folder selected";
            return;
        } else {
            noFoldersMessage.style.display = "none";
        }
        
        // If we have folders but no active folder, set the first one as active
        if (!activeFolderId && folders.length > 0) {
            activeFolderId = folders[0].id;
        }
        
        // Create and add folder elements to the UI
        folders.forEach(folder => {
            const folderItem = createFolderElement(folder);
            folderList.appendChild(folderItem);
        });
        
        // Load resources for the active folder
        await loadFolderResources(activeFolderId);
    }
    
    // Create folder HTML element
    function createFolderElement(folder) {
        const li = document.createElement("li");
        li.className = "folder-item";
        li.setAttribute("data-folder-id", folder.id);
        
        if (folder.id === activeFolderId) {
            li.classList.add("active");
        }
        
        li.innerHTML = `
            <span class="folder-name-display">${folder.name}</span>
            <div class="folder-item-actions">
                <button class="rename-folder-btn icon-button" title="Rename folder">✏️</button>
                <button class="delete-folder-btn icon-button" title="Delete folder">🗑️</button>
            </div>
        `;
        
        // Add event listeners for folder interactions
        li.querySelector(".folder-name-display").addEventListener("click", () => selectFolder(folder.id));
        li.querySelector(".rename-folder-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            renameFolder(folder.id);
        });
        li.querySelector(".delete-folder-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            deleteFolder(folder.id);
        });
        
        return li;
    }
    
    // Create a new folder
    async function createNewFolder() {
        const folderName = newFolderNameInput.value.trim();
        
        if (!folderName) {
            alert("Please enter a folder name");
            newFolderNameInput.focus();
            return;
        }
        
        const data = await chrome.storage.local.get("folders");
        const folders = data.folders || [];
        
        // Check if folder name already exists
        if (folders.some(folder => folder.name.toLowerCase() === folderName.toLowerCase())) {
            alert("A folder with this name already exists");
            newFolderNameInput.focus();
            return;
        }
        
        // Create new folder with unique ID
        const newFolder = {
            id: "folder_" + Date.now(),
            name: folderName,
            urls: []
        };
        
        folders.push(newFolder);
        await chrome.storage.local.set({ folders });
        
        // Clear input and reset UI
        newFolderNameInput.value = "";
        
        // Set new folder as active
        activeFolderId = newFolder.id;
        
        // Reload folders to update UI
        await loadFolders();
    }
    
    // Select a folder
    async function selectFolder(folderId) {
        activeFolderId = folderId;
        
        // Update UI to show the active folder
        const folderItems = folderList.querySelectorAll(".folder-item");
        folderItems.forEach(item => {
            if (item.getAttribute("data-folder-id") === folderId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
        
        // Load resources for the selected folder
        await loadFolderResources(folderId);
        
        // Update save button state
        updateSaveButtonState();
    }
    
    // Rename a folder
    async function renameFolder(folderId) {
        const data = await chrome.storage.local.get("folders");
        const folders = data.folders || [];
        
        // Find the folder
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return;
        
        // Prompt for new name
        const newName = prompt("Enter a new name for this folder:", folder.name);
        
        if (!newName || newName.trim() === "") return;
        
        // Check if name exists in other folders
        if (folders.some(f => f.id !== folderId && f.name.toLowerCase() === newName.trim().toLowerCase())) {
            alert("A folder with this name already exists");
            return;
        }
        
        // Update folder name
        folder.name = newName.trim();
        await chrome.storage.local.set({ folders });
        
        // Reload folders to update UI
        await loadFolders();
    }
    
    // Delete a folder and its contents
    async function deleteFolder(folderId) {
        if (!confirm("Are you sure you want to delete this folder and all its contents?")) {
            return;
        }
        
        const data = await chrome.storage.local.get("folders");
        const folders = data.folders || [];
        
        // Remove the folder
        const updatedFolders = folders.filter(folder => folder.id !== folderId);
        await chrome.storage.local.set({ folders: updatedFolders });
        
        // If the deleted folder was active, set another folder as active
        if (folderId === activeFolderId) {
            activeFolderId = updatedFolders.length > 0 ? updatedFolders[0].id : null;
        }
        
        // Reload folders to update UI
        await loadFolders();
    }
    
    // Load resources for a specific folder
    async function loadFolderResources(folderId) {
        resourceList.innerHTML = "";
        
        if (!folderId) {
            noResourcesMessage.style.display = "block";
            currentFolderNameDisplay.textContent = "No folder selected";
            return;
        }
        
        const data = await chrome.storage.local.get("folders");
        const folders = data.folders || [];
        
        // Find the folder
        const folder = folders.find(f => f.id === folderId);
        if (!folder) {
            noResourcesMessage.style.display = "block";
            currentFolderNameDisplay.textContent = "Folder not found";
            return;
        }
        
        // Update folder name display
        currentFolderNameDisplay.textContent = folder.name;
        
        // Display resources or show empty message
        if (!folder.urls || folder.urls.length === 0) {
            noResourcesMessage.style.display = "block";
            return;
        }
        
        noResourcesMessage.style.display = "none";
        
        // Create and add resource elements to the UI
        folder.urls.forEach((resource, index) => {
            const resourceItem = createResourceElement(resource, index);
            resourceList.appendChild(resourceItem);
        });
    }
    
    // Create resource HTML element
    function createResourceElement(resource, index) {
        const li = document.createElement("li");
        li.className = "resource-item";
        li.setAttribute("data-resource-id", resource.id);
        li.setAttribute("data-url", resource.url);
        
        // Extract domain for display
        let domain = "";
        try {
            domain = new URL(resource.url).hostname;
        } catch (e) {
            console.error('Error parsing URL:', e);
            domain = "unknown";
        }
        
        // Format date
        let dateDisplay = '';
        if (resource.dateAdded) {
            try {
                const date = new Date(resource.dateAdded);
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                dateDisplay = `<span class="resource-date">Added: ${date.toLocaleDateString('en-US', options)}</span>`;
            } catch (e) {
                console.error('Error formatting date:', e);
            }
        }
        
        li.innerHTML = `
            <div class="resource-info">
                <a href="${resource.url}" target="_blank" class="resource-link" title="${resource.url}">${resource.customName}</a>
                <div class="resource-details">
                    <span class="resource-domain">${domain}</span>
                    ${dateDisplay}
                </div>
            </div>
            <div class="resource-item-actions">
                <button class="rename-resource-btn icon-button" title="Rename resource" data-index="${index}">✏️</button>
                <button class="delete-resource-btn icon-button" title="Delete resource" data-index="${index}">🗑️</button>
            </div>
        `;
        
        // Add event listeners for resource interactions
        li.querySelector(".rename-resource-btn").addEventListener("click", (e) => {
            e.preventDefault();
            renameResource(index);
        });
        li.querySelector(".delete-resource-btn").addEventListener("click", (e) => {
            e.preventDefault();
            deleteResource(index);
        });
        
        return li;
    }
    
    // Save current page to active folder
    async function saveCurrentPageToFolder() {
        if (!activeFolderId) {
            alert("Please select or create a folder first");
            return;
        }
        
        const customName = newResourceNameInput.value.trim();
        if (!customName) {
            alert("Please enter a name for this resource");
            newResourceNameInput.focus();
            return;
        }
        
        try {
            // Get current tab information
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get folders from storage
            const data = await chrome.storage.local.get("folders");
            const folders = data.folders || [];
            
            // Find active folder
            const folderIndex = folders.findIndex(f => f.id === activeFolderId);
            if (folderIndex === -1) return;
            
            // Add visual feedback
            saveUrlButton.textContent = "Saving...";
            saveUrlButton.disabled = true;
            
            // Check if URL already exists in this folder
            if (folders[folderIndex].urls && folders[folderIndex].urls.some(item => item.url === tab.url)) {
                alert("This URL is already saved in this folder");
                saveUrlButton.textContent = "Save Resource";
                saveUrlButton.disabled = false;
                return;
            }
            
            // Create new resource
            const newResource = {
                id: "resource_" + Date.now(),
                customName,
                url: tab.url,
                title: tab.title || "Web Resource",
                dateAdded: new Date().toISOString()
            };
            
            // Add to folder
            if (!folders[folderIndex].urls) folders[folderIndex].urls = [];
            folders[folderIndex].urls.push(newResource);
            
            // Save to storage
            await chrome.storage.local.set({ folders });
            
            // Reset input
            newResourceNameInput.value = "";
            
            // Show success feedback
            saveUrlButton.textContent = "Saved!";
            setTimeout(() => {
                saveUrlButton.textContent = "Save Resource";
                saveUrlButton.disabled = false;
            }, 1000);
            
            // Reload resources to update UI
            await loadFolderResources(activeFolderId);
            
        } catch (error) {
            console.error("Error saving resource:", error);
            saveUrlButton.textContent = "Error";
            setTimeout(() => {
                saveUrlButton.textContent = "Save Resource";
                saveUrlButton.disabled = false;
            }, 1000);
        }
    }
    
    // Rename a resource
    async function renameResource(index) {
        if (!activeFolderId) return;
        
        const data = await chrome.storage.local.get("folders");
        const folders = data.folders || [];
        
        // Find active folder
        const folderIndex = folders.findIndex(f => f.id === activeFolderId);
        if (folderIndex === -1 || !folders[folderIndex].urls || index >= folders[folderIndex].urls.length) return;
        
        // Prompt for new name
        const resource = folders[folderIndex].urls[index];
        const newName = prompt("Enter a new name for this resource:", resource.customName);
        
        if (!newName || newName.trim() === "") return;
        
        // Update resource name
        resource.customName = newName.trim();
        await chrome.storage.local.set({ folders });
        
        // Reload resources to update UI
        await loadFolderResources(activeFolderId);
    }
    
    // Delete a resource
    async function deleteResource(index) {
        if (!activeFolderId) return;
        
        if (!confirm("Are you sure you want to delete this resource?")) {
            return;
        }
        
        const data = await chrome.storage.local.get("folders");
        const folders = data.folders || [];
        
        // Find active folder
        const folderIndex = folders.findIndex(f => f.id === activeFolderId);
        if (folderIndex === -1 || !folders[folderIndex].urls || index >= folders[folderIndex].urls.length) return;
        
        // Remove the resource
        folders[folderIndex].urls.splice(index, 1);
        await chrome.storage.local.set({ folders });
        
        // Reload resources to update UI
        await loadFolderResources(activeFolderId);
    }
    
    // Update save button state based on folder selection
    function updateSaveButtonState() {
        saveUrlButton.disabled = !activeFolderId;
        if (!activeFolderId) {
            saveUrlButton.classList.add("disabled");
        } else {
            saveUrlButton.classList.remove("disabled");
        }
    }
});
