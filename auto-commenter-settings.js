// LinkedIn Auto Commenter Settings Handler
document.addEventListener('DOMContentLoaded', () => {
  // Set up tab navigation
  setupTabs();
  
  // Load auto commenter settings
  loadAutoCommenterSettings();
  
  // Add event listener for saving settings
  document.getElementById('saveAutoCommenterSettings').addEventListener('click', saveAutoCommenterSettings);
});

// Set up tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding content
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-content`).classList.add('active');
    });
  });
}

// Load saved auto commenter settings
function loadAutoCommenterSettings() {
  chrome.storage.local.get(['autoCommenterConfig'], (result) => {
    if (result.autoCommenterConfig) {
      const config = result.autoCommenterConfig;
      
      // Set form values
      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('userSignature').value = config.userSignature || '';
      document.getElementById('commentPrompt').value = config.commentPrompt || 'Write a professional, thoughtful, and concise comment (maximum 100 words) in response to this LinkedIn post:';
      document.getElementById('modelSelect').value = config.model || 'gpt-4.1-nano-2025-04-14';
      document.getElementById('commentFrequency').value = config.commentFrequency || '50';
      document.getElementById('analyzeImages').checked = config.analyzeImages !== false;
      document.getElementById('analyzeVideos').checked = config.analyzeVideos || false;
      document.getElementById('enableAutoCommenter').checked = config.enabled || false;
    }
  });
}

// Save auto commenter settings
function saveAutoCommenterSettings() {
  const config = {
    apiKey: document.getElementById('apiKey').value,
    userSignature: document.getElementById('userSignature').value,
    commentPrompt: document.getElementById('commentPrompt').value,
    model: document.getElementById('modelSelect').value,
    commentFrequency: document.getElementById('commentFrequency').value,
    analyzeImages: document.getElementById('analyzeImages').checked,
    analyzeVideos: document.getElementById('analyzeVideos').checked,
    enabled: document.getElementById('enableAutoCommenter').checked
  };
  
  chrome.storage.local.set({ autoCommenterConfig: config }, () => {
    alert('Settings saved!');
  });
}
