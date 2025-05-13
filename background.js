
chrome.action.onClicked.addListener(() => {
    // This is only called if the popup isn't set in the manifest
    chrome.action.setPopup({ popup: 'popup.html' });
});
