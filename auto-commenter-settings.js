// LinkedIn Auto Commenter Settings Handler
const ENCRYPTION_PASSPHRASE = 'linkedin-auto-commenter';

async function getKeyMaterial() {
  const enc = new TextEncoder();
  return crypto.subtle.digest('SHA-256', enc.encode(ENCRYPTION_PASSPHRASE));
}

async function getKey() {
  const keyMaterial = await getKeyMaterial();
  return crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptString(str) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const encoded = new TextEncoder().encode(str);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipher);
  const result = new Uint8Array(iv.length + cipherBytes.length);
  result.set(iv);
  result.set(cipherBytes, iv.length);
  return btoa(String.fromCharCode(...result));
}

async function decryptString(str) {
  try {
    const data = Uint8Array.from(atob(str), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const cipher = data.slice(12);
    const key = await getKey();
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch (e) {
    console.error('Failed to decrypt API key', e);
    return '';
  }
}

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
async function loadAutoCommenterSettings() {
  chrome.storage.sync.get(['autoCommenterConfig', 'autoCommenterKey'], async (result) => {
    if (result.autoCommenterConfig) {
      const config = result.autoCommenterConfig;

      // Set form values
      document.getElementById('userSignature').value = config.userSignature || '';
      document.getElementById('commentPrompt').value = config.commentPrompt || 'Write a professional, thoughtful, and concise comment (maximum 100 words) in response to this LinkedIn post:';
      document.getElementById('modelSelect').value = config.model || 'gpt-4.1-nano-2025-04-14';
      document.getElementById('commentFrequency').value = config.commentFrequency || '50';
      document.getElementById('analyzeImages').checked = config.analyzeImages !== false;
      document.getElementById('analyzeVideos').checked = config.analyzeVideos || false;
      document.getElementById('enableAutoCommenter').checked = config.enabled || false;
    }

    if (result.autoCommenterKey) {
      document.getElementById('apiKey').value = await decryptString(result.autoCommenterKey);
    }
  });
}

// Save auto commenter settings
async function saveAutoCommenterSettings() {
  const apiKey = document.getElementById('apiKey').value;
  const encryptedKey = apiKey ? await encryptString(apiKey) : '';
  const config = {
    userSignature: document.getElementById('userSignature').value,
    commentPrompt: document.getElementById('commentPrompt').value,
    model: document.getElementById('modelSelect').value,
    commentFrequency: document.getElementById('commentFrequency').value,
    analyzeImages: document.getElementById('analyzeImages').checked,
    analyzeVideos: document.getElementById('analyzeVideos').checked,
    enabled: document.getElementById('enableAutoCommenter').checked
  };

  chrome.storage.sync.set({ autoCommenterConfig: config, autoCommenterKey: encryptedKey }, () => {
    alert('Settings saved!');
  });
}
