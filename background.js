
chrome.browserAction.onClicked.addListener(() => {
    chrome.browserAction.setPopup({ popup: 'popup.html' });
});
