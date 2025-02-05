document.addEventListener("DOMContentLoaded", function () {
    const saveUrlButton = document.getElementById("saveUrl");
    const urlList = document.getElementById("urlList");

    saveUrlButton.addEventListener("click", async function () {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let category = document.getElementById("category").value;
        let savedItems = (await chrome.storage.local.get("urls"))?.urls || [];

        // Prevent duplicate URLs
        if (!savedItems.some(item => item.url === tab.url)) {
            savedItems.push({ url: tab.url, category });
            await chrome.storage.local.set({ urls: savedItems });
        }

        loadUrls();
    });

    function loadUrls() {
        chrome.storage.local.get("urls", function (data) {
            urlList.innerHTML = "";
            (data.urls || []).forEach((item, index) => {
                let li = document.createElement("li");
                li.innerHTML = `
                    <span>${item.category}</span> 
                    <a class='url' href='${item.url}' target='_blank' title='${item.url}'>${item.url}</a> 
                    <button data-index='${index}' class='delete-btn'>X</button>
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

    loadUrls();
});
