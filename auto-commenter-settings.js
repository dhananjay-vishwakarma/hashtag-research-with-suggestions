// LinkedIn Auto Commenter Settings Handler
document.addEventListener('DOMContentLoaded', () => {
  // Set up tab navigation
  setupTabs();
  
  // Load auto commenter settings
  loadAutoCommenterSettings();

  document.getElementById('apiKey').addEventListener('input', (e) => {
    loadModelOptions(e.target.value, document.getElementById('modelSelect').value);
  });
  
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
async function loadModelOptions(apiKey, selected) {
  const select = document.getElementById('modelSelect');
  if (!select) return;
  if (!apiKey) {
    select.innerHTML = '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
    return;
  }
  select.innerHTML = '<option>Loading...</option>';
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const models = data.data
      .map(m => m.id)
      .filter(id => id.startsWith('gpt-'))
      .sort();
    select.innerHTML = '';
    models.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      select.appendChild(opt);
    });
    if (selected) select.value = selected;
  } catch (err) {
    console.error('Failed to fetch models', err);
    select.innerHTML = `<option value="${selected || 'gpt-3.5-turbo'}">${selected || 'gpt-3.5-turbo'}</option>`;
  }
}

function loadAutoCommenterSettings() {
  chrome.storage.local.get(['autoCommenterConfig'], (result) => {
    if (result.autoCommenterConfig) {
      const config = result.autoCommenterConfig;

      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('userSignature').value = config.userSignature || '';
      document.getElementById('commentPrompt').value = config.commentPrompt || 'Write a professional, thoughtful, and concise comment (maximum 100 words) in response to this LinkedIn post:';
      document.getElementById('commentFrequency').value = config.commentFrequency || '50';
      document.getElementById('analyzeImages').checked = config.analyzeImages !== false;
      document.getElementById('analyzeVideos').checked = config.analyzeVideos || false;
      document.getElementById('enableAutoCommenter').checked = config.enabled || false;

      loadModelOptions(config.apiKey, config.model || 'gpt-3.5-turbo');
    } else {
      loadModelOptions('', 'gpt-3.5-turbo');
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
