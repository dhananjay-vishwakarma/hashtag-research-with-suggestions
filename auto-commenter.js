// LinkedIn Auto Commenter powered by ChatGPT
(function() {
  // Configuration settings
  let config = {
    enabled: false,
    apiKey: '',
    userSignature: '',
    model: 'gpt-4.1-nano-2025-04-14',
    commentPrompt: 'Write a professional, thoughtful, and concise comment (maximum 100 words) in response to this LinkedIn post:',
    maxTokens: 150,
    temperature: 0.7,
    commentFrequency: 50,  // Percentage of posts to comment on (0-100)
    processingDelay: 2000,  // Delay between processing posts (ms)
    worthinessThreshold: 60, // Minimum score (0-100) a post must have to be worth commenting on
    keywordsOfInterest: '', // Comma-separated keywords to look for in posts
    prioritizeConnections: true, // Whether to prioritize posts from 1st connections
    analyzeImages: true, // Whether to analyze image content in posts
    analyzeVideos: false, // Whether to analyze video content in posts
    debugMode: false
  };

  const ENCRYPTION_PASSPHRASE = 'linkedin-auto-commenter';

  async function getKeyMaterial() {
    const enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(ENCRYPTION_PASSPHRASE));
  }

  async function getKey() {
    const keyMaterial = await getKeyMaterial();
    return crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );
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
  
  // Load stored configuration
  function loadConfig() {
    chrome.storage.local.get(['autoCommenterConfig'], (result) => {
      if (result.autoCommenterConfig) {
        config = { ...config, ...result.autoCommenterConfig };
        console.log('Auto commenter config loaded:', config.enabled ? 'enabled' : 'disabled');

        if (config.debugMode) {
          console.log('Auto commenter configuration:', JSON.stringify(config, null, 2));
        }
      }
    });

    chrome.storage.sync.get(['autoCommenterKey'], async (res) => {
      if (res.autoCommenterKey) {
        config.apiKey = await decryptString(res.autoCommenterKey);
      }
    });
  }
  
  // Save configuration (without API key)
  function saveConfig() {
    const { apiKey, ...rest } = config;
    chrome.storage.local.set({ autoCommenterConfig: rest }, () => {
      if (config.debugMode) {
        console.log('Auto commenter config saved:', rest);
      }
    });
  }
  
  // Initialize UI elements
  function initUI() {
    // Create floating control panel
    const controlPanel = document.createElement('div');
    controlPanel.id = 'auto-commenter-panel';
    controlPanel.style = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: white;
      border: 1px solid #0077b5;
      border-radius: 8px;
      padding: 15px;
      width: 300px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      display: none;
    `;
    
    controlPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; color: #0077b5;">Auto Commenter</h3>
        <button id="close-panel" style="background: none; border: none; cursor: pointer; font-size: 16px;">✕</button>
      </div>
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">OpenAI API Key:</label>
        <input type="password" id="api-key-input" style="width: 100%; padding: 5px;" placeholder="sk-...">
      </div>
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">Your Signature:</label>
        <input type="text" id="signature-input" style="width: 100%; padding: 5px;" placeholder="- John Doe, Digital Marketer">
      </div>
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">Comment Frequency:</label>
        <select id="comment-frequency" style="width: 100%; padding: 5px;">
          <option value="100">Comment on all posts (100%)</option>
          <option value="75">Comment on most posts (75%)</option>
          <option value="50" selected>Comment on half of posts (50%)</option>
          <option value="25">Comment on few posts (25%)</option>
          <option value="10">Comment on very few posts (10%)</option>
        </select>
      </div>
      
      <div style="border-top: 1px solid #eee; padding-top: 10px; margin: 10px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0077b5;">Post Targeting Settings</h4>
        
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">Post Quality Threshold:</label>
          <select id="worthiness-threshold" style="width: 100%; padding: 5px;">
            <option value="75">High quality posts only (75+)</option>
            <option value="60" selected>Quality posts (60+)</option>
            <option value="45">Most posts (45+)</option>
            <option value="30">Almost all posts (30+)</option>
          </select>
        </div>
        
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">Keywords of Interest (comma separated):</label>
          <input type="text" id="keywords-input" style="width: 100%; padding: 5px;" placeholder="AI, marketing, leadership">
        </div>
        
        <div style="margin-bottom: 10px; display: flex; align-items: center;">
          <input type="checkbox" id="prioritize-connections" style="margin-right: 5px;" checked>
          <label for="prioritize-connections">Prioritize 1st & 2nd connections</label>
        </div>
        
        <div style="margin-bottom: 10px; display: flex; align-items: center;">
          <input type="checkbox" id="analyze-images" style="margin-right: 5px;" checked>
          <label for="analyze-images">Analyze image content in posts</label>
        </div>
        
        <div style="margin-bottom: 10px; display: flex; align-items: center;">
          <input type="checkbox" id="analyze-videos" style="margin-right: 5px;">
          <label for="analyze-videos">Analyze video content in posts</label>
        </div>
      </div>
      
      <div style="margin-bottom: 10px; display: flex; align-items: center;">
        <input type="checkbox" id="enable-auto-commenter" style="margin-right: 5px;">
        <label for="enable-auto-commenter">Enable Auto-Commenting</label>
      </div>
      <button id="save-settings" style="background-color: #0077b5; color: white; border: none; padding: 8px 15px; width: 100%; cursor: pointer; border-radius: 4px;">Save Settings</button>
    `;
    
    document.body.appendChild(controlPanel);
    
    // Create toggle button
    const toggleButton = document.createElement('div');
    toggleButton.id = 'toggle-auto-commenter';
    toggleButton.style = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #0077b5;
      color: white;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9998;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    toggleButton.innerHTML = `<div style="font-size: 24px;">💬</div>`;
    document.body.appendChild(toggleButton);
    
    // Set up event listeners
    document.getElementById('toggle-auto-commenter').addEventListener('click', () => {
      const panel = document.getElementById('auto-commenter-panel');
      const isVisible = panel.style.display === 'none';
      panel.style.display = isVisible ? 'block' : 'none';
      
      // Update API key status when panel becomes visible
      if (isVisible) {
        setTimeout(updateApiKeyStatus, 100);
      }
    });
    
    document.getElementById('close-panel').addEventListener('click', () => {
      document.getElementById('auto-commenter-panel').style.display = 'none';
    });
    
    // Update API key status when input changes
    document.getElementById('api-key-input').addEventListener('input', updateApiKeyStatus);
    
    document.getElementById('save-settings').addEventListener('click', async () => {
      const apiKeyInput = document.getElementById('api-key-input').value;
      
      // Create a loading indicator
      const saveButton = document.getElementById('save-settings');
      const originalButtonText = saveButton.textContent;
      saveButton.textContent = 'Validating API Key...';
      saveButton.disabled = true;
      
      // Validate API key
      if (apiKeyInput) {
        // First check for common password patterns that are definitely not API keys
        if (apiKeyInput.match(/^[a-z0-9]{1,10}[@#$%^&*]/i)) {
          alert('You appear to have entered a password, not an OpenAI API key. OpenAI API keys always start with "sk-" followed by a long string of characters.');
          saveButton.textContent = originalButtonText;
          saveButton.disabled = false;
          return;
        }
        
        // Check format
        if (!isValidOpenAIApiKey(apiKeyInput)) {
          alert('Invalid API key format. OpenAI API keys should start with "sk-" followed by a series of at least 48 characters.');
          
          // Show more specific guidance based on the error
          if (!apiKeyInput.startsWith('sk-')) {
            alert('Your key doesn\'t start with "sk-". OpenAI API keys always start with "sk-".');
          } else if (apiKeyInput.length < 50) {
            alert('Your API key is too short. OpenAI API keys are typically at least 50 characters long.');
          }
          
          saveButton.textContent = originalButtonText;
          saveButton.disabled = false;
          return;
        }
        
        // Test API key with a live request
        try {
          const validation = await testApiKey(apiKeyInput);
          if (!validation.valid) {
            alert(`API key validation failed: ${validation.error}`);
            
            // Provide additional context for specific error cases
            if (validation.error.includes('401') || validation.error.includes('invalid')) {
              alert('This API key was rejected by OpenAI. Please check that you\'ve copied it correctly from your OpenAI account.');
            } else if (validation.error.includes('rate limit') || validation.error.includes('quota')) {
              alert('This API key has usage limits or billing issues. Please check your OpenAI account billing status.');
            }
            
            saveButton.textContent = originalButtonText;
            saveButton.disabled = false;
            return;
          }
        } catch (error) {
          alert(`Error validating API key: ${error.message}`);
          saveButton.textContent = originalButtonText;
          saveButton.disabled = false;
          return;
        }
      } else {
        // Warning if user is trying to enable auto-commenter without an API key
        const enableCheckbox = document.getElementById('enable-auto-commenter');
        if (enableCheckbox && enableCheckbox.checked) {
          if (!confirm('You are trying to enable auto-commenting without providing an API key. The auto-commenter will not work without a valid OpenAI API key. Do you want to continue?')) {
            saveButton.textContent = originalButtonText;
            saveButton.disabled = false;
            return;
          }
        }
      }
      
      // Restore button state
      saveButton.textContent = originalButtonText;
      saveButton.disabled = false;
      
      // Save config
      config.apiKey = apiKeyInput;
      config.userSignature = document.getElementById('signature-input').value;
      config.commentFrequency = document.getElementById('comment-frequency').value;
      config.worthinessThreshold = document.getElementById('worthiness-threshold').value;
      config.keywordsOfInterest = document.getElementById('keywords-input').value;
      config.prioritizeConnections = document.getElementById('prioritize-connections').checked;
      config.analyzeImages = document.getElementById('analyze-images').checked;
      config.analyzeVideos = document.getElementById('analyze-videos').checked;
      config.enabled = document.getElementById('enable-auto-commenter').checked;
      saveConfig();
      
      // Notify user
      alert(`Auto-commenter ${config.enabled ? 'enabled' : 'disabled'}!\n${apiKeyInput ? 'API key validated successfully.' : 'No API key provided. The auto-commenter will not work without a valid API key.'}`);
      document.getElementById('auto-commenter-panel').style.display = 'none';
    });
    
    // Load saved settings into UI
    document.getElementById('api-key-input').value = config.apiKey || '';
    document.getElementById('signature-input').value = config.userSignature || '';
    document.getElementById('comment-frequency').value = config.commentFrequency || '50';
    document.getElementById('worthiness-threshold').value = config.worthinessThreshold || '60';
    document.getElementById('keywords-input').value = config.keywordsOfInterest || '';
    document.getElementById('prioritize-connections').checked = config.prioritizeConnections !== false;
    document.getElementById('analyze-images').checked = config.analyzeImages !== false;
    document.getElementById('analyze-videos').checked = config.analyzeVideos || false;
    document.getElementById('enable-auto-commenter').checked = config.enabled || false;
    
    // Create test button for quick single post testing
    createTestButton();
    
    // Add API key status indicator to settings panel
    updateApiKeyStatus();
  }
  
  // Create test button for quick single post testing
  function createTestButton() {
    // Check if the button already exists
    if (document.getElementById('test-single-comment')) {
      return;
    }
    
    const testButton = document.createElement('div');
    testButton.id = 'test-single-comment';
    testButton.style = `
      position: fixed;
      bottom: 140px;
      right: 20px;
      background-color: #2e7d32;
      color: white;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9998;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      font-size: 16px;
    `;
    testButton.innerHTML = `<div title="Test comment on single post">🧪</div>`;
    
    // Show test options menu on click
    testButton.addEventListener('click', (event) => {
      event.stopPropagation();
      
      // First check if options menu already exists
      if (document.getElementById('test-options-menu')) {
        document.getElementById('test-options-menu').remove();
        return;
      }
      
      // Create menu
      const optionsMenu = document.createElement('div');
      optionsMenu.id = 'test-options-menu';
      optionsMenu.style = `
        position: fixed;
        bottom: 200px;
        right: 20px;
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 10px 0;
        width: 220px;
        z-index: 9999;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      `;
      
      optionsMenu.innerHTML = `
        <div style="padding: 5px 15px; margin-bottom: 5px; font-weight: bold; color: #0077b5; border-bottom: 1px solid #e0e0e0;">
          Test Comment Options
        </div>
        <div class="test-option" id="test-with-preview" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center;">
          <span style="margin-right: 8px;">👁️</span> Test with preview
        </div>
        <div class="test-option" id="test-direct" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center;">
          <span style="margin-right: 8px;">⚡</span> Test direct post
        </div>
        <div class="test-option" id="test-highlight-posts" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center;">
          <span style="margin-right: 8px;">🔍</span> Highlight new posts
        </div>
        <div class="test-option" id="run-diagnostics" style="padding: 8px 15px; cursor: pointer; display: flex; align-items: center; border-top: 1px solid #e0e0e0; margin-top: 5px;">
          <span style="margin-right: 8px;">🛠️</span> Run diagnostics
        </div>
      `;
      
      // Style hover effect
      const style = document.createElement('style');
      style.textContent = `
        .test-option:hover {
          background-color: #f3f6f8;
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(optionsMenu);
      
      // Add click handlers
      document.getElementById('test-with-preview').addEventListener('click', () => {
        optionsMenu.remove();
        testSinglePost(false); // with preview
      });
      
      document.getElementById('test-direct').addEventListener('click', () => {
        optionsMenu.remove();
        testSinglePost(true); // skip preview
      });
      
      document.getElementById('test-highlight-posts').addEventListener('click', () => {
        optionsMenu.remove();
        highlightNewPosts();
      });
      
      // Add handler for diagnostics button
      document.getElementById('run-diagnostics').addEventListener('click', () => {
        optionsMenu.remove();
        
        // Find the first visible post to run diagnostics on
        const post = document.querySelector('.feed-shared-update-v2, .occludable-update');
        if (post) {
          post.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            debugCommentFeature(post);
          }, 500);
        } else {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.show();
            window.autoCommenterStatus.log('ERROR', 'No posts found for diagnostics');
          } else {
            alert('No posts found for diagnostics. Try scrolling down to load posts.');
          }
        }
      });
      
      // Close menu when clicking elsewhere
      document.addEventListener('click', function closeMenu(e) {
        if (!optionsMenu.contains(e.target) && e.target !== testButton) {
          optionsMenu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    });
    
    document.body.appendChild(testButton);
    
    // Add tooltip for the button
    testButton.addEventListener('mouseenter', () => {
      // Only show tooltip if menu is not open
      if (!document.getElementById('test-options-menu')) {
        const tooltip = document.createElement('div');
        tooltip.id = 'test-button-tooltip';
        tooltip.style = `
          position: fixed;
          bottom: 200px;
          right: 80px;
          background-color: #333;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          z-index: 9999;
          white-space: nowrap;
        `;
        tooltip.textContent = 'Test comment on single post';
        document.body.appendChild(tooltip);
      }
    });
    
    testButton.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('test-button-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    });
    
    return testButton;
  }
  
  // Function to highlight new posts that haven't been commented on
  function highlightNewPosts() {
    if (window.autoCommenterStatus) {
      window.autoCommenterStatus.show();
      window.autoCommenterStatus.setOperation('INFO', 'Highlighting new posts...');
    }
    
    // Find all posts that haven't been processed yet
    const posts = Array.from(document.querySelectorAll('.feed-shared-update-v2:not([data-auto-commented="true"]), .occludable-update:not([data-auto-commented="true"])'));
    
    if (posts.length === 0) {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('INFO', 'No new posts found. Try scrolling down to load more.');
      } else {
        alert('No new posts found. Try scrolling down to load more posts.');
      }
      return;
    }
    
    // Add highlight to all new posts
    posts.forEach((post, index) => {
      post.style.border = '2px solid #2e7d32';
      post.style.boxShadow = '0 0 10px rgba(46, 125, 50, 0.5)';
      
      // Add post number indicator
      const indicator = document.createElement('div');
      indicator.style = `
        position: absolute;
        top: 5px;
        right: 5px;
        background-color: #2e7d32;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        z-index: 9997;
      `;
      indicator.textContent = `${index + 1}`;
      indicator.className = 'highlight-post-indicator';
      
      // Make sure the post has relative positioning
      const currentPosition = window.getComputedStyle(post).position;
      if (currentPosition === 'static') {
        post.style.position = 'relative';
      }
      
      post.appendChild(indicator);
    });
    
    // Add button to clear highlights
    const clearButton = document.createElement('div');
    clearButton.id = 'clear-highlights';
    clearButton.style = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #f44336;
      color: white;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      font-size: 14px;
    `;
    clearButton.textContent = 'Clear Highlights';
    clearButton.addEventListener('click', () => {
      posts.forEach(post => {
        post.style.border = '';
        post.style.boxShadow = '';
        const indicator = post.querySelector('.highlight-post-indicator');
        if (indicator) indicator.remove();
      });
      clearButton.remove();
      
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('INFO', 'Post highlights removed');
      }
    });
    
    document.body.appendChild(clearButton);
    
    // Scroll to the first post
    if (posts.length > 0) {
      posts[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    if (window.autoCommenterStatus) {
      window.autoCommenterStatus.log('SUCCESS', `Found and highlighted ${posts.length} new posts`);
    }
  }
  
  // Extract author information
  function extractAuthorInfo(postElement) {
    try {
      const authorElement = postElement.querySelector('.feed-shared-actor__name, .update-components-actor__name');
      if (!authorElement) return { name: 'Unknown', title: 'Unknown' };
      
      const name = authorElement.textContent.trim();
      
      // Try to find title from various places
      let title = '';
      const titleElements = [
        postElement.querySelector('.feed-shared-actor__description, .update-components-actor__description'),
        postElement.querySelector('.feed-shared-actor__sub-description, .update-components-actor__sub-description'),
        postElement.querySelector('.feed-shared-text-view__description')
      ];
      
      for (const element of titleElements) {
        if (element && element.textContent.trim()) {
          title = element.textContent.trim();
          break;
        }
      }
      
      return { name, title: title || 'LinkedIn Member' };
    } catch (error) {
      console.error('Error extracting author info:', error);
      return { name: 'Unknown', title: 'Unknown' };
    }
  }
  
  // Extract post caption
  function extractPostCaption(postElement) {
    try {
      // Try multiple selectors that might contain the post content
      const selectors = [
        '.feed-shared-update-v2__description-wrapper',
        '.feed-shared-text-view',
        '.feed-shared-update-v2__commentary',
        '.update-components-text',
        '.feed-shared-update__description',
        '.feed-shared-inline-show-more-text'
      ];
      
      for (const selector of selectors) {
        const element = postElement.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      
      // Fallback: get all text within the post
      const allText = Array.from(postElement.querySelectorAll('p, span'))
        .map(el => el.textContent.trim())
        .filter(text => text.length > 20) // Filter out short texts
        .join(' ');
      
      if (allText) return allText;
      
      return 'No caption found';
    } catch (error) {
      console.error('Error extracting post caption:', error);
      return 'Error extracting post content';
    }
  }
  
  // Call ChatGPT API for generating a comment
  async function generateCommentWithAI(authorInfo, postCaption, postElement) {
    try {
      // Check if API key exists
      if (!config.apiKey) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', 'OpenAI API key is not set');
        }
        console.error('OpenAI API key is not set');
        return null;
      }
      
      // Validate API key format
      if (!isValidOpenAIApiKey(config.apiKey)) {
        const errorMsg = 'Invalid OpenAI API key format';
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', `${errorMsg}. Please check your API key in the Auto Commenter settings.`);
        }
        console.error(errorMsg, 'API key:', config.apiKey.substring(0, 5) + '...');
        return null;
      }
      
      // Get post evaluation for context
      const postEvaluation = evaluatePostWorth({
        querySelector: () => null // Mock post object for evaluation
      });
      
      // Check for visual content (images/videos)
      let visualContentDescription = '';
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', 'Analyzing visual content in post...');
      }
      
      if (window.contentAnalyzer && postElement) {
        const isVisualPost = window.contentAnalyzer.isVisualContentPost(postElement);
        if (isVisualPost) {
          visualContentDescription = await window.contentAnalyzer.getVisualContentDescription(postElement);
          
          if (window.autoCommenterStatus && visualContentDescription) {
            window.autoCommenterStatus.log('INFO', `Visual content detected: ${visualContentDescription.substring(0, 50)}...`);
          }
        }
      }
      
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', 'Sending request to OpenAI API...');
      }
      
      const prompt = `${config.commentPrompt}
      
Post by ${authorInfo.name} (${authorInfo.title}):
"${postCaption}"

${visualContentDescription ? `Visual content in post: ${visualContentDescription}\n\n` : ''}

Write a thoughtful, professional comment that is relevant to the post content.
Keep it concise (max 100 words) and conversational.
Do not use hashtags or emojis.

Additional context about this post:
- This post was evaluated as worth commenting on (score: ${postEvaluation.score}/100)
- Reasons to engage: ${postEvaluation.reason || "Content appears relevant and valuable"}`;
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: "system",
                content: "You are a professional LinkedIn user writing thoughtful comments on posts."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: config.maxTokens,
            temperature: config.temperature
          })
        });
        
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('PROCESSING', 'Receiving AI response...');
        }
        
        const data = await response.json();
        
        // Handle HTTP status codes
        if (!response.ok) {
          let errorMessage = data.error?.message || data.error?.type || `HTTP error ${response.status}`;
          
          // Provide more helpful error messages for common issues
          if (response.status === 401) {
            errorMessage = "API key authentication failed. Please check your OpenAI API key in the settings.";
          } else if (response.status === 429) {
            errorMessage = "Rate limit exceeded or insufficient quota. Check your OpenAI billing status.";
          } else if (response.status === 404) {
            errorMessage = `Model "${config.model}" not found. It may be deprecated or not available in your account.`;
          } else if (response.status >= 500) {
            errorMessage = "OpenAI server error. Please try again later.";
          }
          
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('ERROR', `OpenAI API error: ${errorMessage}`);
          }
          console.error('OpenAI API error:', data.error || response.status);
          
          // Record failure in statistics
          chrome.runtime.sendMessage({
            type: 'RECORD_FAILURE',
            error: errorMessage
          });
          return null;
        }
        
        // Handle data error (just in case)
        if (data.error) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('ERROR', `OpenAI API error: ${data.error.message || data.error.type}`);
          }
          console.error('OpenAI API error:', data.error);
          // Record failure in statistics
          chrome.runtime.sendMessage({
            type: 'RECORD_FAILURE',
            error: data.error.message || data.error.type
          });
          return null;
        }
      } catch (apiError) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', `API request failed: ${apiError.message}`);
        }
        console.error('API request failed:', apiError);
        // Record failure in statistics
        chrome.runtime.sendMessage({
          type: 'RECORD_FAILURE',
          error: apiError.message
        });
        return null;
      }
      
      // Validate the response structure
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        const errorMsg = 'Invalid response format from OpenAI API';
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', errorMsg);
        }
        console.error(errorMsg, data);
        return null;
      }
      
      let comment = data.choices[0].message.content.trim();
      
      // Add user signature if available
      if (config.userSignature) {
        comment += `\n\n${config.userSignature}`;
      }
      
      // Calculate token usage
      let tokenUsage = 0;
      if (data.usage && data.usage.total_tokens) {
        tokenUsage = data.usage.total_tokens;
        
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('INFO', `Generated comment using ${tokenUsage} tokens`);
        }
      }
      
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('SUCCESS', 'Comment generated successfully').autoHide();
      }
      
      return {
        text: comment,
        tokenUsage: tokenUsage
      };
    } catch (error) {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('ERROR', `Error generating comment: ${error.message}`);
      }
      console.error('Error generating comment with AI:', error);
      return null;
    }
  }
  
  // Post a comment to a LinkedIn post
  async function postComment(postElement, comment) {
    try {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('INFO', 'Looking for comment button...');
      }
      
      // Try multiple selectors to find the comment button (LinkedIn changes these frequently)
      const commentButtonSelectors = [
        'button[aria-label="Comment on this post"]',
        'button[aria-label*="comment" i]',
        'button[data-control-name="comment"]',
        '.comment-button',
        '.social-actions-button[aria-label*="comment" i]',
        '.feed-shared-social-action-bar__action-button',
        // New selectors to try
        'button.artdeco-button[aria-label*="comment" i]',
        'button.social-actions__button[aria-label*="comment" i]',
        'button.feed-shared-social-actions__button[aria-label*="comment" i]',
        '[data-test-id*="comment-button"]',
        'button:not([disabled])[aria-pressed="false"]',
        '[role="button"][aria-label*="comment" i]'
      ];
      
      // STEP 1: Find the comment button
      let commentButton = null;
      for (const selector of commentButtonSelectors) {
        const buttons = postElement.querySelectorAll(selector);
        if (buttons.length > 0) {
          // For semantic selectors, we can use the first match
          if (selector.includes('comment')) {
            commentButton = buttons[0];
            if (window.autoCommenterStatus) {
              window.autoCommenterStatus.log('INFO', `Found comment button using selector: ${selector}`);
            }
            break;
          }
          
          // For positional selectors (like nth-child), verify if it looks like a comment button
          for (const button of buttons) {
            const textContent = button.textContent.toLowerCase();
            const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
            const innerHtml = button.innerHTML.toLowerCase();
            if (textContent.includes('comment') || ariaLabel.includes('comment') || 
                innerHtml.includes('comment') || innerHtml.includes('speech-bubble')) {
              commentButton = button;
              if (window.autoCommenterStatus) {
                window.autoCommenterStatus.log('INFO', `Found comment button using selector: ${selector}`);
              }
              break;
            }
          }
          
          if (commentButton) break;
        }
      }
      
      // If we still can't find the comment button, try to identify any buttons that might be it
      if (!commentButton) {
        const allButtons = postElement.querySelectorAll('button');
        for (const button of allButtons) {
          const textContent = button.textContent.toLowerCase();
          const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
          const innerHTML = button.innerHTML.toLowerCase();
          
          // Check if this button is likely the comment button
          if (textContent.includes('comment') || ariaLabel.includes('comment') || 
              innerHTML.includes('comment') || innerHTML.includes('speech-bubble') ||
              innerHTML.includes('msg') || innerHTML.includes('chat')) {
            commentButton = button;
            if (window.autoCommenterStatus) {
              window.autoCommenterStatus.log('INFO', 'Found potential comment button by content analysis');
            }
            break;
          }
        }
      }
      
      // If still no comment button found, let's try to find buttons by position in the social action bar
      if (!commentButton) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('INFO', 'Trying to find comment button by position in social action bar');
        }
        
        // Find the social action bar that typically contains like, comment, share buttons
        const socialActionBars = postElement.querySelectorAll('.feed-shared-social-actions, .social-actions, .social-action-bar');
        if (socialActionBars.length > 0) {
          // Usually, the comment button is the second button in the action bar
          const actionButtons = socialActionBars[0].querySelectorAll('button');
          if (actionButtons.length >= 2) {
            commentButton = actionButtons[1]; // Second button is often the comment button
            if (window.autoCommenterStatus) {
              window.autoCommenterStatus.log('INFO', 'Using second button in social action bar as comment button');
            }
          }
        }
      }
      
      // If we couldn't find the comment button, report failure
      if (!commentButton) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', 'Comment button not found, cannot proceed');
        }
        return false;
      }
      
      // STEP 2: Click the comment button to reveal the input field
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', 'Clicking comment button...');
      }
      
      // Click the found comment button
      commentButton.click();
      
      // Wait for the comment form to appear - increase timeout to ensure UI updates
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('INFO', 'Waiting for comment form to appear...');
      }
      await new Promise(resolve => setTimeout(resolve, 2500)); // Increased wait time
      
      // Try to find any hidden comment forms and make them visible
      const hiddenCommentForms = Array.from(document.querySelectorAll('.comments-comment-box--is-collapsed, [aria-hidden="true"][class*="comment"]'))
        .filter(el => el.classList.contains('comments-comment-box') || 
                      el.querySelector('[contenteditable="true"]') !== null);
      
      if (hiddenCommentForms.length > 0) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('INFO', `Found ${hiddenCommentForms.length} hidden comment forms, attempting to reveal`);
        }
        
        hiddenCommentForms.forEach(form => {
          form.classList.remove('comments-comment-box--is-collapsed');
          form.setAttribute('aria-hidden', 'false');
          form.style.display = 'block';
        });
        
        // Give time for the UI to update
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // STEP 3: Find the comment input field (which should now be visible)
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('INFO', 'Looking for comment input field...');
      }
      
      // Try multiple selectors for the comment input field
      const commentInputSelectors = [
        '.ql-editor[data-placeholder="Add a comment…"]',
        '.comments-comment-box__form-container .editor-content',
        '.ql-editor[contenteditable="true"]',
        '[role="textbox"][contenteditable="true"]',
        '.comments-comment-texteditor__content [contenteditable="true"]',
        '.editor-container [contenteditable="true"]',
        '[aria-label*="comment" i][contenteditable="true"]',
        '[data-test-id*="comment-box"] [contenteditable="true"]',
        '.ql-container .ql-editor',
        '.comments-comment-box__form-container [contenteditable]',
        // Generic fallback to any contenteditable that appeared after click
        '[contenteditable="true"]'
      ];
      
      // Try all selectors to find the comment input field
      let commentInput = null;
      for (const selector of commentInputSelectors) {
        const inputs = document.querySelectorAll(selector);
        if (inputs.length > 0) {
          // Pick the most visible one
          for (const input of inputs) {
            if (input.offsetParent !== null) { // Check if element is visible
              commentInput = input;
              if (window.autoCommenterStatus) {
                window.autoCommenterStatus.log('INFO', `Found comment input field using selector: ${selector}`);
              }
              break;
            }
          }
          
          if (commentInput) break;
        }
      }
      
      // If still can't find the input, try looking for any visible contenteditable elements
      if (!commentInput) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('WARNING', 'Comment input field not found using direct selectors');
          window.autoCommenterStatus.log('INFO', 'Looking for newly appeared contenteditable elements...');
        }
        
        // Get any content-editable elements with non-zero dimensions (visible)
        const visibleContentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
          .filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);
        
        if (visibleContentEditables.length > 0) {
          commentInput = visibleContentEditables[0];
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('INFO', 'Found visible contenteditable element that might be the comment field');
          }
        }
      }
      
      // If we still don't have a comment input field, try clicking the comment button again
      if (!commentInput) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('WARNING', 'Comment input field not found, trying to click comment button again');
        }
        
        // Click the comment button again
        commentButton.click();
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Try again to find a comment input field
        for (const selector of commentInputSelectors) {
          const inputs = document.querySelectorAll(selector);
          if (inputs.length > 0) {
            for (const input of inputs) {
              if (input.offsetParent !== null) { // Check if element is visible
                commentInput = input;
                if (window.autoCommenterStatus) {
                  window.autoCommenterStatus.log('INFO', `Found comment input field after second click using selector: ${selector}`);
                }
                break;
              }
            }
            if (commentInput) break;
          }
        }
        
        // If still no input field, try any visible contenteditable
        if (!commentInput) {
          const visibleContentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
            .filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);
          
          if (visibleContentEditables.length > 0) {
            commentInput = visibleContentEditables[0];
            if (window.autoCommenterStatus) {
              window.autoCommenterStatus.log('INFO', 'Found visible contenteditable element after second click');
            }
          }
        }
      }
      
      // Final check - if we still don't have a comment input field, report failure
      if (!commentInput) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', 'Could not find any comment input field even after clicking the comment button');
        }
        return false;
      }
      
      // STEP 4: Add the comment text to the input field
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', 'Adding comment text...');
      }
      
      // Focus and set comment text
      commentInput.focus();
      commentInput.innerHTML = comment.replace(/\n/g, '<br>');
      
      // Dispatch multiple events to ensure the UI recognizes the input
      commentInput.dispatchEvent(new Event('input', { bubbles: true }));
      commentInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Wait to ensure the input was registered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dispatch blur and focus events to trigger any validation
      commentInput.dispatchEvent(new Event('blur', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));
      commentInput.dispatchEvent(new Event('focus', { bubbles: true }));
      
      // STEP 5: Find the post/submit button (which should now be visible)
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('INFO', 'Looking for post button...');
      }
      
      // Try multiple selectors for the post button
      const postButtonSelectors = [
        'button.comments-comment-box__submit-button',
        'button[type="submit"]',
        'button.comments-comment-texteditor__submitButton',
        '.comments-comment-box__submit-button',
        'button.artdeco-button--primary',
        '.editor-toolbar .submit-button',
        'form button[type="submit"]',
        '.comments-comment-box__submit-container button',
        // More generic selectors as fallbacks
        'button:not([disabled]):not([aria-disabled="true"]).artdeco-button--primary',
        'button:not([disabled]):not([aria-disabled="true"]):not(.cancel-button)',
        'button.artdeco-button:not([disabled]):not([aria-disabled="true"])'
      ];
      
      // Try all selectors to find the post button
      let postButton = null;
      for (const selector of postButtonSelectors) {
        const buttons = document.querySelectorAll(selector);
        
        if (buttons.length > 0) {
          // First try to find buttons with submit/post text
          for (const button of buttons) {
            const text = button.textContent.toLowerCase().trim();
            const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
            
            if (text === 'post' || text === 'submit' || text === 'comment' || 
                ariaLabel.includes('post') || ariaLabel.includes('submit') || 
                ariaLabel.includes('comment')) {
              postButton = button;
              if (window.autoCommenterStatus) {
                window.autoCommenterStatus.log('INFO', `Found post button with text "${text}" using selector: ${selector}`);
              }
              break;
            }
          }
          
          // If no explicit post/submit button found, try to use the first enabled button
          if (!postButton) {
            for (const button of buttons) {
              if (!button.disabled && button.getAttribute('aria-disabled') !== 'true') {
                postButton = button;
                if (window.autoCommenterStatus) {
                  window.autoCommenterStatus.log('INFO', `Found potential post button using selector: ${selector}`);
                }
                break;
              }
            }
          }
          
          if (postButton) break;
        }
      }
      
      // If we still can't find the post button using selectors, look for any buttons near the comment field
      if (!postButton) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('WARNING', 'No post button found using selectors, looking for buttons near comment field...');
        }
        
        // Get all buttons that are visible and enabled
        const allButtons = Array.from(document.querySelectorAll('button:not([disabled]):not([aria-disabled="true"])'))
          .filter(button => button.offsetParent !== null); // Only visible buttons
        
        // Sort by proximity to the comment field (using distance between elements)
        if (commentInput && allButtons.length > 0) {
          const commentRect = commentInput.getBoundingClientRect();
          allButtons.sort((a, b) => {
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            const aDistance = Math.sqrt(
              Math.pow(aRect.left - commentRect.left, 2) + 
              Math.pow(aRect.top - commentRect.top, 2)
            );
            const bDistance = Math.sqrt(
              Math.pow(bRect.left - commentRect.left, 2) + 
              Math.pow(bRect.top - commentRect.top, 2)
            );
            
            return aDistance - bDistance;
          });
          
          // Filter for buttons that appear to be submit buttons (by text or position)
          const potentialSubmitButtons = allButtons.filter(button => {
            const text = button.textContent.toLowerCase().trim();
            const rect = button.getBoundingClientRect();
            const isRightOfInput = rect.left > commentRect.left;
            const isCloseToInputVertically = Math.abs(rect.top - commentRect.bottom) < 50;
            return (text !== 'cancel' && !text.includes('cancel') && 
                   (isRightOfInput && isCloseToInputVertically || 
                    text.includes('post') || text.includes('submit') || text.includes('send')));
          });
          
          if (potentialSubmitButtons.length > 0) {
            postButton = potentialSubmitButtons[0];
            if (window.autoCommenterStatus) {
              window.autoCommenterStatus.log('INFO', `Using button with text "${postButton.textContent.trim()}" based on proximity to comment field`);
            }
          } else if (allButtons.length > 0) {
            // Just use the closest non-cancel button as a last resort
            for (const button of allButtons) {
              const text = button.textContent.toLowerCase().trim();
              if (text !== 'cancel' && !text.includes('cancel')) {
                postButton = button;
                if (window.autoCommenterStatus) {
                  window.autoCommenterStatus.log('INFO', `Using closest button to comment field as post button: "${text}"`);
                }
                break;
              }
            }
          }
        }
      }
      
      // Try using Enter key as a last resort fallback if no button found
      if (!postButton) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('WARNING', 'Post button not found, trying Enter key fallback');
        }
        
        // Focus the input again
        commentInput.focus();
        
        // Send Enter key event (some LinkedIn interfaces allow posting with Enter)
        const enterKeyEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true
        });
        
        commentInput.dispatchEvent(enterKeyEvent);
        
        // Wait to see if the comment posted
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if the comment field cleared or disappeared (indicating success)
        if (commentInput.innerHTML === '' || commentInput.offsetParent === null) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.setOperation('SUCCESS', 'Comment posted successfully using Enter key!');
          }
          return true;
        }
        
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', 'Enter key fallback failed to post comment');
          window.autoCommenterStatus.log('ERROR', 'Post button not found, cannot submit comment');
        }
        return false;
      }
      
      // STEP 6: Click the post button to submit the comment
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', 'Submitting comment...');
      }
      
      // Click the post button and wait longer for the submission to complete
      postButton.click();
      
      // Wait for the submission to complete
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Verify if the comment was actually posted (input field cleared or form closed)
      const commentInputAfterSubmit = document.querySelector(commentInputSelectors[0]);
      const commentFormClosed = !commentInputAfterSubmit || 
                               commentInputAfterSubmit.offsetParent === null || 
                               commentInputAfterSubmit.innerHTML === '';
      
      if (commentFormClosed) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('SUCCESS', 'Comment posted successfully!').autoHide();
        }
        return true;
      } else {
        // Try clicking the button again if the form is still open
        if (postButton && postButton.offsetParent !== null) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('WARNING', 'Comment form still open after clicking post button, trying again');
          }
          postButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Final check if comment was posted
        const finalInputCheck = document.querySelector(commentInputSelectors[0]);
        if (!finalInputCheck || finalInputCheck.offsetParent === null || finalInputCheck.innerHTML === '') {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.setOperation('SUCCESS', 'Comment posted successfully after retry!').autoHide();
          }
          return true;
        } else {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('ERROR', 'Failed to post comment after multiple attempts');
          }
          return false;
        }
      }
    } catch (error) {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('ERROR', `Error posting comment: ${error.message}`);
      }
      console.error('Error posting comment:', error);
      return false;
    }
  }
  
  // Helper function to evaluate post quality and determine if it's worth commenting on
  function evaluatePostWorth(post) {
    try {
      // Get post metrics (if available)
      let score = 50; // Base score
      let reason = '';
      let postType = 'update'; // Default post type
      let connectionLevel = 'other'; // Default connection level
      
      // 1. Check engagement level (reactions, comments)
      const engagementElements = post.querySelectorAll('.social-details-social-counts__reactions-count, .social-details-social-counts__comments');
      let hasHighEngagement = false;
      let engagementCount = 0;
      
      engagementElements.forEach(element => {
        const text = element.textContent.trim();
        const match = text.match(/(\d+)/);
        if (match) {
          const count = parseInt(match[1], 10);
          engagementCount += count;
          
          if (count > 10) {
            hasHighEngagement = true;
          }
        }
      });
      
      if (hasHighEngagement) {
        score += 20;
        reason += 'High engagement post. ';
      }
      
      // 2. Check connection level (1st, 2nd, 3rd connections)
      const connectionIndicator = post.querySelector('.feed-shared-actor__sub-description, .update-components-actor__description');
      if (connectionIndicator) {
        const connectionText = connectionIndicator.textContent.toLowerCase();
        
        if (connectionText.includes('1st') || connectionText.includes('following')) {
          score += 15;
          reason += '1st connection or following. ';
          connectionLevel = 'first';
        } else if (connectionText.includes('2nd')) {
          score += 10;
          reason += '2nd connection. ';
          connectionLevel = 'second';
        } else if (connectionText.includes('3rd')) {
          connectionLevel = 'third';
        }
      }
      
      // 3. Check post age
      const timestampElement = post.querySelector('time.feed-shared-actor__sub-description-timestamp, .update-components-actor__sub-description-timestamp');
      if (timestampElement) {
        const timestamp = timestampElement.textContent.toLowerCase().trim();
        
        if (timestamp.includes('minute') || timestamp.includes('hour') || timestamp.includes('now')) {
          score += 15;
          reason += 'Recent post. ';
        } else if (timestamp.includes('yesterday') || timestamp.includes('1 day')) {
          score += 5;
          reason += 'Posted yesterday. ';
        } else if (timestamp.includes('day') && parseInt(timestamp, 10) < 7) {
          score += 3;
          reason += 'Posted this week. ';
        }
      }
      
      // 4. Check content type and length
      const postText = extractPostCaption(post);
      
      // Prioritize posts with questions
      if (postText && postText.includes('?')) {
        score += 15;
        reason += 'Contains question. ';
        postType = 'question';
      }
      
      // Check for hashtags (posts with hashtags may be good for visibility)
      const hashtagCount = (postText.match(/#\w+/g) || []).length;
      if (hashtagCount > 0) {
        score += 5;
        reason += `Contains ${hashtagCount} hashtags. `;
      }
      
      // Check if it's a celebration or life event
      if (postText && /new job|anniversary|birthday|joined|promoted|congratulations|congrats/i.test(postText)) {
        score += 15;
        reason += 'Celebration/life event. ';
        postType = 'celebration';
      }
      
      // Check for shared articles
      if (post.querySelector('.feed-shared-article') !== null) {
        score += 5;
        reason += 'Shared article. ';
        postType = 'article';
      }
      
      // Check for polls
      if (post.querySelector('.feed-shared-poll, .poll-component') !== null) {
        score += 10;
        reason += 'Poll content. ';
        postType = 'poll';
      }

      // 5. Check for visual content (images/videos)
      if (window.contentAnalyzer) {
        if (window.contentAnalyzer.isVisualContentPost(post)) {
          const images = window.contentAnalyzer.extractImagesFromPost(post);
          const videoInfo = window.contentAnalyzer.extractVideoFromPost(post);
          
          if (images.length > 0) {
            score += 10;
            reason += `Contains ${images.length} image${images.length > 1 ? 's' : ''}. `;
            postType = postType === 'update' ? 'image' : postType;
          }
          
          if (videoInfo && videoInfo.hasVideo) {
            score += 15;
            reason += 'Contains video content. ';
            postType = 'video';
          }
        }
      }
      
      // 6. Check for keywords of interest
      const keywordsOfInterest = config.keywordsOfInterest ? config.keywordsOfInterest.split(',').map(k => k.trim().toLowerCase()) : [];
      
      if (keywordsOfInterest.length > 0 && postText) {
        const postTextLower = postText.toLowerCase();
        
        for (const keyword of keywordsOfInterest) {
          if (keyword && postTextLower.includes(keyword)) {
            score += 10;
            reason += `Contains keyword "${keyword}". `;
            break; // Only count once even if multiple keywords match
          }
        }
      }
      
      // Minimum worthiness threshold (configurable)
      const threshold = config.worthinessThreshold || 60;
      const isWorthCommenting = score >= threshold;
      
      if (config.debugMode) {
        console.log(`Post evaluation: Score=${score}, Worthy=${isWorthCommenting}, Type=${postType}, Connection=${connectionLevel}, Reason: ${reason}`);
      }
      
      return {
        score: score,
        worthy: isWorthCommenting,
        reason: reason.trim(),
        postType: postType,
        connectionLevel: connectionLevel
      };
    } catch (error) {
      console.error('Error evaluating post worth:', error);
      return { score: 0, worthy: false, reason: 'Error evaluating post' };
    }
  }
  
  // Process posts on the page
  async function processPosts() {
    if (!config.enabled || !config.apiKey) {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('INFO', 'Auto-commenter is disabled or API key is not set');
      }
      return;
    }
    
    // Find all posts that haven't been processed yet
    const posts = Array.from(document.querySelectorAll('.feed-shared-update-v2:not([data-auto-commented="true"]), .occludable-update:not([data-auto-commented="true"])'));
    
    if (window.autoCommenterStatus) {
      if (posts.length > 0) {
        window.autoCommenterStatus.setOperation('INFO', `Scanning ${posts.length} new posts`);
      } else {
        window.autoCommenterStatus.setOperation('INFO', 'Searching for new posts to comment on...').autoHide();
      }
    }
    
    if (config.debugMode) {
      console.log(`Found ${posts.length} unprocessed posts`);
    }
    
    // Auto-scroll to find more posts if none are found
    if (posts.length === 0) {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', 'Auto-scrolling to find more posts...');
      }
      
      // Scroll down to load more content
      window.scrollBy(0, 800);
      
      // Wait a bit for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try again
      setTimeout(processPosts, 500);
      return;
    }
    
    for (const post of posts) {
      try {
        // Mark the post as processed to avoid duplicates
        post.setAttribute('data-auto-commented', 'true');
        
        // Get author info for status updates
        const authorInfo = extractAuthorInfo(post);
        const authorDisplayName = authorInfo.name || 'Unknown author';
        
        // First, evaluate if the post is worth commenting on
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('PROCESSING', `Evaluating post by ${authorDisplayName}`);
        }
        
        let evaluation = evaluatePostWorth(post);
        
        // Apply learnings from previous engagement data
        evaluation = await applyEngagementLearnings(evaluation);
        
        if (!evaluation.worthy) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('INFO', `Skipped post by ${authorDisplayName}: Score ${evaluation.score} below threshold (${config.worthinessThreshold})`);
          }
          
          if (config.debugMode) {
            console.log(`Skipping post - evaluation score ${evaluation.score} below threshold. Reason: ${evaluation.reason}`);
          }
          continue;
        }
        
        // Apply frequency filter - only comment on a percentage of posts
        const commentFrequency = parseInt(config.commentFrequency) || 50;
        const shouldComment = Math.random() * 100 <= commentFrequency;
        
        if (!shouldComment) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('INFO', `Skipped post by ${authorDisplayName}: Frequency filter (${commentFrequency}%)`);
          }
          
          if (config.debugMode) {
            console.log('Skipping post due to frequency settings');
          }
          continue;
        }
        
        const postCaption = extractPostCaption(post);
        
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('PROCESSING', `Analyzing post content by ${authorDisplayName}`);
        }
        
        if (config.debugMode) {
          console.log('Processing post by:', authorInfo.name, authorInfo.title);
          console.log('Post caption:', postCaption.substring(0, 100) + '...');
        }
        
        if (postCaption === 'No caption found' || postCaption.length < 20) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('WARNING', `Skipped post by ${authorDisplayName}: Insufficient content`);
          }
          
          if (config.debugMode) console.log('Skipping post with insufficient content');
          continue;
        }
        
        // Generate comment with ChatGPT
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('PROCESSING', `Generating AI comment for ${authorDisplayName}'s post`);
        }
        
        const commentObj = await generateCommentWithAI(authorInfo, postCaption, post);
        
        if (!commentObj) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('ERROR', `Failed to generate comment for ${authorDisplayName}'s post`);
          }
          
          console.error('Failed to generate comment');
          continue;
        }
        
        const commentText = commentObj.text;
        const tokenUsage = commentObj.tokenUsage;
        
        if (config.debugMode) {
          console.log('Generated comment:', commentText);
          console.log('Token usage:', tokenUsage);
        }
        
        // Post the comment
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('PROCESSING', `Posting comment on ${authorDisplayName}'s post`);
        }
        
        const success = await postComment(post, commentText);
        
        if (success) {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('SUCCESS', `Comment posted on ${authorDisplayName}'s post`);
          }
          
          console.log('Successfully commented on post by', authorInfo.name);
          
          // Record successful comment in statistics
          chrome.runtime.sendMessage({
            type: 'RECORD_COMMENT',
            postInfo: {
              author: authorInfo.name,
              title: authorInfo.title
            },
            comment: commentText,
            tokenCount: tokenUsage
          });
        } else {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('ERROR', `Failed to post comment on ${authorDisplayName}'s post`);
          }
          
          console.error('Failed to post comment');
          
          // Record failed comment
          chrome.runtime.sendMessage({
            type: 'RECORD_FAILURE'
          });
        }
        
        // Wait between processing posts to avoid rate limiting
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('INFO', `Waiting ${config.processingDelay/1000}s before next post...`).autoHide();
        }
        
        await new Promise(resolve => setTimeout(resolve, config.processingDelay));
      } catch (error) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', `Error processing post: ${error.message}`);
        }
        
        console.error('Error processing post:', error);
      }
    }
    
    // After processing all posts, check if we need to scroll for more
    if (posts.length > 0 && config.enabled) {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('INFO', 'Auto-scrolling to find more posts...').autoHide();
      }
      
      // Scroll down to load more content
      window.scrollBy(0, 800);
      
      // Wait a bit for content to load
      setTimeout(processPosts, 3000);
    }
  }
  
  // Observe DOM changes to detect new posts
  function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      const hasNewPosts = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          return node.nodeType === 1 && 
                 (node.classList?.contains('feed-shared-update-v2') || 
                  node.classList?.contains('occludable-update') ||
                  node.querySelector?.('.feed-shared-update-v2, .occludable-update'));
        });
      });
      
      if (hasNewPosts && config.enabled) {
        setTimeout(processPosts, 1000);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Track engagement patterns to optimize targeting
  function trackEngagementPatterns() {
    try {
      // Get posts we've commented on that have 'data-auto-commented="true"'
      const commentedPosts = Array.from(document.querySelectorAll('[data-auto-commented="true"]'));
      
      if (commentedPosts.length === 0) return;
      
      // Initialize engagement data structure if not exists
      chrome.storage.local.get(['engagementPatterns'], (result) => {
        let patterns = result.engagementPatterns || {
          postTypes: {
            question: { count: 0, avgEngagement: 0 },
            celebration: { count: 0, avgEngagement: 0 },
            article: { count: 0, avgEngagement: 0 },
            poll: { count: 0, avgEngagement: 0 },
            update: { count: 0, avgEngagement: 0 }
          },
          connectionLevels: {
            first: { count: 0, avgEngagement: 0 },
            second: { count: 0, avgEngagement: 0 },
            third: { count: 0, avgEngagement: 0 },
            other: { count: 0, avgEngagement: 0 }
          },
          totalPostsAnalyzed: 0
        };
        
        // For each post we've commented on, check current engagement
        commentedPosts.forEach(post => {
          // Extract engagement metrics
          const reactions = post.querySelector('.social-details-social-counts__reactions-count');
          const comments = post.querySelector('.social-details-social-counts__comments');
          
          let engagementScore = 0;
          
          if (reactions) {
            const reactionsText = reactions.textContent.trim();
            const reactionsMatch = reactionsText.match(/(\d+)/);
            if (reactionsMatch) {
              engagementScore += parseInt(reactionsMatch[1], 10);
            }
          }
          
          if (comments) {
            const commentsText = comments.textContent.trim();
            const commentsMatch = commentsText.match(/(\d+)/);
            if (commentsMatch) {
              engagementScore += parseInt(commentsMatch[1], 10) * 2; // Comments worth more
            }
          }
          
          // Determine post type
          let postType = 'update'; // Default
          const postText = extractPostCaption(post) || '';
          
          if (postText.includes('?')) {
            postType = 'question';
          } else if (/new job|anniversary|birthday|joined|promoted|congratulations|congrats/i.test(postText)) {
            postType = 'celebration';
          } else if (post.querySelector('.feed-shared-article') !== null) {
            postType = 'article';
          } else if (post.querySelector('.feed-shared-poll, .poll-component') !== null) {
            postType = 'poll';
          }
          
          // Determine connection level
          let connectionLevel = 'other'; // Default
          const connectionIndicator = post.querySelector('.feed-shared-actor__sub-description, .update-components-actor__description');
          
          if (connectionIndicator) {
            const connectionText = connectionIndicator.textContent.toLowerCase();
            if (connectionText.includes('1st') || connectionText.includes('following')) {
              connectionLevel = 'first';
            } else if (connectionText.includes('2nd')) {
              connectionLevel = 'second';
            } else if (connectionText.includes('3rd')) {
              connectionLevel = 'third';
            }
          }
          
          // Update patterns based on engagement
          if (patterns.postTypes[postType]) {
            const currentData = patterns.postTypes[postType];
            patterns.postTypes[postType] = {
              count: currentData.count + 1,
              avgEngagement: (currentData.avgEngagement * currentData.count + engagementScore) / (currentData.count + 1)
            };
          }
          
          if (patterns.connectionLevels[connectionLevel]) {
            const currentData = patterns.connectionLevels[connectionLevel];
            patterns.connectionLevels[connectionLevel] = {
              count: currentData.count + 1,
              avgEngagement: (currentData.avgEngagement * currentData.count + engagementScore) / (currentData.count + 1)
            };
          }
          
          patterns.totalPostsAnalyzed++;
        });
        
        // Save updated patterns
        chrome.storage.local.set({ engagementPatterns: patterns }, () => {
          if (config.debugMode) {
            console.log('Engagement patterns updated:', patterns);
          }
        });
      });
    } catch (error) {
      console.error('Error tracking engagement patterns:', error);
    }
  }
  
  // Apply learnings from engagement patterns to improve targeting
  async function applyEngagementLearnings(postEvaluation) {
    try {
      let adjustedScore = postEvaluation.score;
      let adjustmentReason = '';
      
      // Get stored engagement patterns
      return new Promise(resolve => {
        chrome.storage.local.get(['engagementPatterns'], (result) => {
          if (!result.engagementPatterns || result.engagementPatterns.totalPostsAnalyzed < 5) {
            // Not enough data to make informed adjustments
            resolve({
              score: adjustedScore,
              reason: postEvaluation.reason
            });
            return;
          }
          
          const patterns = result.engagementPatterns;
          
          // Find post type with highest engagement
          let bestPostType = 'update';
          let highestEngagement = 0;
          
          Object.keys(patterns.postTypes).forEach(type => {
            if (patterns.postTypes[type].count > 2 && patterns.postTypes[type].avgEngagement > highestEngagement) {
              highestEngagement = patterns.postTypes[type].avgEngagement;
              bestPostType = type;
            }
          });
          
          // Find connection level with highest engagement
          let bestConnectionLevel = 'first';
          highestEngagement = 0;
          
          Object.keys(patterns.connectionLevels).forEach(level => {
            if (patterns.connectionLevels[level].count > 2 && patterns.connectionLevels[level].avgEngagement > highestEngagement) {
              highestEngagement = patterns.connectionLevels[level].avgEngagement;
              bestConnectionLevel = level;
            }
          });
          
          // Adjust score based on learned patterns
          if (postEvaluation.postType === bestPostType) {
            adjustedScore += 15;
            adjustmentReason += `Post type (${bestPostType}) has shown high engagement. `;
          }
          
          if (postEvaluation.connectionLevel === bestConnectionLevel) {
            adjustedScore += 10;
            adjustmentReason += `Connection level (${bestConnectionLevel}) has shown high engagement. `;
          }
          
          if (adjustmentReason) {
            resolve({
              score: adjustedScore,
              reason: postEvaluation.reason + ' ' + adjustmentReason
            });
          } else {
            resolve(postEvaluation);
          }
        });
      });
    } catch (error) {
      console.error('Error applying engagement learnings:', error);
      return postEvaluation;
    }
  }
  
  // Test function to comment on a single post
  async function testSinglePost(skipPreview = false) {
    // Validate API key
    if (!config.apiKey) {
      alert('Please set your OpenAI API key in the extension settings first.');
      return;
    }
    
    // Check API key format
    if (!isValidOpenAIApiKey(config.apiKey)) {
      alert('Your API key appears to be invalid. OpenAI API keys should start with "sk-" followed by a series of characters. Please check your API key in the extension settings.');
      return;
    }
    
    // Show status display if available
    if (window.autoCommenterStatus) {
      window.autoCommenterStatus.show();
      window.autoCommenterStatus.setOperation('INFO', 'Starting single post test...');
    } else {
      console.log('Starting single post test...');
    }
    
    try {
      // Find the first visible post that hasn't been commented on yet
      const post = document.querySelector('.feed-shared-update-v2:not([data-auto-commented="true"]), .occludable-update:not([data-auto-commented="true"])');
      
      if (!post) {
        if (window.autoCommenterStatus) {
         
          window.autoCommenterStatus.log('ERROR', 'No new posts found. Try scrolling down to load more posts.');
        } else {
          alert('No new posts found. Try scrolling down to load more posts.');
        }
        return;
      }
      
      // Get post author info
      const authorInfo = extractAuthorInfo(post);
      const authorDisplayName = authorInfo.name || 'Unknown author';
      
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('INFO', `Testing with post by ${authorDisplayName}`);
        window.autoCommenterStatus.log('INFO', `Selected post by ${authorDisplayName} for testing`);
      } else {
        console.log(`Testing with post by ${authorDisplayName}`);
      }
      
      // Extract post content
      const postCaption = extractPostCaption(post);
      
      if (postCaption === 'No caption found' || postCaption.length < 20) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('WARNING', `Post by ${authorDisplayName} has insufficient content`);
        } else {
          alert(`Post by ${authorDisplayName} has insufficient content. Please select a different post.`);
        }
        return;
      }
      
      // Mark the post for visual identification
      post.style.border = '2px solid #0077b5';
      post.style.boxShadow = '0 0 10px rgba(0, 119, 181, 0.5)';
      post.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Generate comment
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', `Generating AI comment for ${authorDisplayName}'s post`);
      } else {
        console.log(`Generating AI comment for ${authorDisplayName}'s post...`);
      }
      
      const commentObj = await generateCommentWithAI(authorInfo, postCaption, post);
      
      if (!commentObj) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', `Failed to generate comment for ${authorDisplayName}'s post`);
        } else {
          alert(`Failed to generate comment for ${authorDisplayName}'s post. Check console for errors.`);
        }
        return;
      }
      
      const commentText = commentObj.text;
      const tokenUsage = commentObj.tokenUsage;
      
      // Show preview if not skipping
      if (!skipPreview) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.setOperation('SUCCESS', `Comment generated - awaiting review`);
          window.autoCommenterStatus.log('INFO', `Preview comment for ${authorDisplayName}'s post`);
        }
        
        // Create preview dialog
        const previewDialog = document.createElement('div');
        previewDialog.style = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          width: 500px;
          max-width: 80vw;
          max-height: 80vh;
          z-index: 10000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
        `;
        
        previewDialog.innerHTML = `
          <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; color: #0077b5; font-size: 18px;">Comment Preview</h2>
            <button id="close-preview" style="background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Post by:</strong> ${authorDisplayName}
          </div>
          <div style="border: 1px solid #e0e0e0; background-color: #f7f9fa; padding: 15px; margin-bottom: 15px; border-radius: 4px; overflow-y: auto; max-height: 200px;">
            ${commentText.replace(/\n/g, '<br>')}
          </div>
          <div id="token-usage" style="margin-bottom: 15px; font-size: 14px; color: #666;">
            Token usage: ${tokenUsage} (Approximate cost: $${(tokenUsage * 0.000002).toFixed(5)})
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="test-selectors" style="padding: 8px 15px; background-color: #f5f5f5; border: 1px solid #666; color: #666; border-radius: 4px; cursor: pointer;">Test Selectors</button>
            <button id="edit-comment" style="padding: 8px 15px; background-color: #f3f6f8; border: 1px solid #0077b5; color: #0077b5; border-radius: 4px; cursor: pointer;">Edit</button>
            <button id="post-comment" style="padding: 8px 15px; background-color: #0077b5; color: white; border: none; border-radius: 4px; cursor: pointer;">Post Comment</button>
          </div>
        `;
        
        document.body.appendChild(previewDialog);
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.style = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 9999;
        `;
        document.body.appendChild(backdrop);
        
        // Return a promise that resolves when the user makes a decision
        return new Promise((resolve) => {
          // Handle close button
          document.getElementById('close-preview').addEventListener('click', () => {
            previewDialog.remove();
            backdrop.remove();
            if (window.autoCommenterStatus) {
              window.autoCommenterStatus.log('INFO', `Test cancelled by user`);
              window.autoCommenterStatus.setOperation('INFO', 'Test cancelled');
            }
            resolve(false);
          });
          
          // Handle test selectors button
          document.getElementById('test-selectors').addEventListener('click', () => {
            if (window.selectorUtils) {
              window.autoCommenterStatus.log('INFO', 'Testing all selectors on current page...');
              window.selectorUtils.testAllSelectors();
              
              // Test specific element finding methods
              const commentButton = window.selectorUtils.findCommentButton(post);
              if (commentButton) {
                window.autoCommenterStatus.log('SUCCESS', 'Found comment button using utility function');
                commentButton.style.border = '2px solid green';
                setTimeout(() => {
                  commentButton.style.border = '';
                }, 3000);
              } else {
                window.autoCommenterStatus.log('ERROR', 'Could not find comment button using utility function');
              }
              
              window.autoCommenterStatus.log('INFO', 'Selector test completed. See console for detailed results.');
            } else {
              window.autoCommenterStatus.log('ERROR', 'Selector utilities not available');
            }
          });
          
          // Handle edit button
          document.getElementById('edit-comment').addEventListener('click', () => {
            const editDialog = document.createElement('div');
            editDialog.style = previewDialog.style.cssText;
            
            editDialog.innerHTML = `
              <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; color: #0077b5; font-size: 18px;">Edit Comment</h2>
                <button id="close-edit" style="background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
              </div>
              <div style="margin-bottom: 15px;">
                <strong>Post by:</strong> ${authorDisplayName}
              </div>
              <textarea id="edited-comment" style="width: 100%; height: 150px; padding: 10px; margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 4px;">${commentText}</textarea>
              <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-edit" style="padding: 8px 15px; background-color: #f3f6f8; border: 1px solid #0077b5; color: #0077b5; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="save-edit" style="padding: 8px 15px; background-color: #0077b5; color: white; border: none; border-radius: 4px; cursor: pointer;">Save & Post</button>
              </div>
            `;
            
            previewDialog.remove();
            document.body.appendChild(editDialog);
            
            // Focus the textarea and place cursor at the end
            const textarea = document.getElementById('edited-comment');
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            
            // Handle close and cancel
            const closeEdit = () => {
              editDialog.remove();
              backdrop.remove();
              if (window.autoCommenterStatus) {
                window.autoCommenterStatus.log('INFO', `Edit cancelled by user`);
                window.autoCommenterStatus.setOperation('INFO', 'Test cancelled');
              }
              resolve(false);
            };
            
            document.getElementById('close-edit').addEventListener('click', closeEdit);
            document.getElementById('cancel-edit').addEventListener('click', closeEdit);
            
            // Handle save & post
            document.getElementById('save-edit').addEventListener('click', async () => {
              const editedComment = document.getElementById('edited-comment').value;
              editDialog.remove();
              backdrop.remove();
              
              if (window.autoCommenterStatus) {
                window.autoCommenterStatus.setOperation('PROCESSING', `Posting edited comment on ${authorDisplayName}'s post`);
              }
              
              try {
                const success = await postComment(post, editedComment);
                
                if (success) {
                  post.setAttribute('data-auto-commented', 'true');
                  
                  if (window.autoCommenterStatus) {
                    window.autoCommenterStatus.log('SUCCESS', `Edited comment posted on ${authorDisplayName}'s post`);
                    window.autoCommenterStatus.setOperation('SUCCESS', 'Test completed successfully!');
                  }
                  
                  // Record successful comment in statistics
                  chrome.runtime.sendMessage({
                    type: 'RECORD_COMMENT',
                    postInfo: {
                      author: authorInfo.name,
                      title: authorInfo.title
                    },
                    comment: editedComment,
                    tokenCount: tokenUsage
                  });
                } else {
                  if (window.autoCommenterStatus) {
                    window.autoCommenterStatus.log('ERROR', `Failed to post edited comment`);
                    window.autoCommenterStatus.log('INFO', 'Running diagnostics to identify problem...');
                    
                    // Run diagnostics when posting fails
                    debugCommentFeature(post);
                  }
                }
              } catch (error) {
                if (window.autoCommenterStatus) {
                  window.autoCommenterStatus.log('ERROR', `Error posting edited comment: ${error.message}`);
                  window.autoCommenterStatus.log('INFO', 'Running diagnostics to identify problem...');
                  debugCommentFeature(post);
                }
              }
              
              resolve(success);
            });
          });
          
          // Handle post button
          document.getElementById('post-comment').addEventListener('click', async () => {
            previewDialog.remove();
            backdrop.remove();
            
            if (window.autoCommenterStatus) {
              window.autoCommenterStatus.setOperation('PROCESSING', `Posting test comment on ${authorDisplayName}'s post`);
            }
            
            try {
              const success = await postComment(post, commentText);
              
              if (success) {
                post.setAttribute('data-auto-commented', 'true');
                
                if (window.autoCommenterStatus) {
                  window.autoCommenterStatus.log('SUCCESS', `Test comment posted on ${authorDisplayName}'s post`);
                  window.autoCommenterStatus.setOperation('SUCCESS', 'Test completed successfully!');
                }
                
                // Record successful comment in statistics
                chrome.runtime.sendMessage({
                  type: 'RECORD_COMMENT',
                  postInfo: {
                    author: authorInfo.name,
                    title: authorInfo.title
                  },
                  comment: commentText,
                  tokenCount: tokenUsage
                });
              } else {
                if (window.autoCommenterStatus) {
                  window.autoCommenterStatus.log('ERROR', `Failed to post test comment`);
                  window.autoCommenterStatus.log('INFO', 'Running diagnostics to identify problem...');
                  
                  // Run diagnostics when posting fails
                  debugCommentFeature(post);
                }
              }
            } catch (error) {
              if (window.autoCommenterStatus) {
                window.autoCommenterStatus.log('ERROR', `Error posting comment: ${error.message}`);
                window.autoCommenterStatus.log('INFO', 'Running diagnostics to identify problem...');
                debugCommentFeature(post);
              }
            }
            
            resolve(success);
          });
        });
      }
      
      // Direct posting without preview (if skipPreview=true)
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.setOperation('PROCESSING', `Posting test comment on ${authorDisplayName}'s post`);
      } else {
        console.log(`Posting test comment on ${authorDisplayName}'s post...`);
      }
      
      try {
        const success = await postComment(post, commentText);
        
        if (success) {
          post.setAttribute('data-auto-commented', 'true');
          
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('SUCCESS', `Test comment posted successfully on ${authorDisplayName}'s post`);
            window.autoCommenterStatus.setOperation('SUCCESS', 'Test completed successfully!');
          } else {
            alert(`Success! Comment posted on ${authorDisplayName}'s post.`);
          }
          
          // Record successful comment in statistics
          chrome.runtime.sendMessage({
            type: 'RECORD_COMMENT',
            postInfo: {
              author: authorInfo.name,
              title: authorInfo.title
            },
            comment: commentText,
            tokenCount: tokenUsage
          });
        } else {
          if (window.autoCommenterStatus) {
            window.autoCommenterStatus.log('ERROR', `Failed to post test comment on ${authorDisplayName}'s post`);
            window.autoCommenterStatus.log('INFO', 'Running diagnostics to identify problem...');
            
            // Run diagnostics when posting fails
            debugCommentFeature(post);
          } else {
            alert(`Failed to post comment on ${authorDisplayName}'s post. Check console for errors.`);
          }
        }
      } catch (error) {
        if (window.autoCommenterStatus) {
          window.autoCommenterStatus.log('ERROR', `Test error: ${error.message}`);
          window.autoCommenterStatus.log('INFO', 'Running diagnostics to identify problem...');
          debugCommentFeature(post);
        } else {
          alert(`Error during test: ${error.message}`);
        }
        console.error('Test error:', error);
      }
    } catch (error) {
      if (window.autoCommenterStatus) {
        window.autoCommenterStatus.log('ERROR', `Test error: ${error.message}`);
      } else {
        alert(`Error during test: ${error.message}`);
      }
      console.error('Test error:', error);
    }
    
    // Remove highlight after 5 seconds
    setTimeout(() => {
      const highlightedPost = document.querySelector('.feed-shared-update-v2[style*="border"], .occludable-update[style*="border"]');
      if (highlightedPost) {
        highlightedPost.style.border = '';
        highlightedPost.style.boxShadow = '';
      }
    }, 5000);
  }
  
  // Validate OpenAI API key format
  function isValidOpenAIApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // Check for common password patterns that are definitely not API keys
    const commonPasswordPatterns = [
      /^password/i,
      /^pass/i,
      /^\d{1,8}$/,  // Short numeric passwords
      /^[a-z0-9]{1,10}[@#$%^&*]/i,  // Common pattern like "mypass@123"
      /^admin/i,
      /^test/i
    ];
    
    for (const pattern of commonPasswordPatterns) {
      if (pattern.test(apiKey)) {
        return false;
      }
    }
    
    // OpenAI API keys typically start with "sk-" followed by alphanumeric characters
    // Current pattern as of 2025: "sk-" followed by approximately 48-50 characters
    const openAIPattern = /^sk-[a-zA-Z0-9]{48,}$/;
    return openAIPattern.test(apiKey);
  }
  
  // Function to diagnose comment button issues
  function debugCommentFeature(postElement) {
    if (!window.autoCommenterStatus) {
      console.log("Status display not available to show diagnostic information");
      return;
    }
    
    window.autoCommenterStatus.show();
    window.autoCommenterStatus.log('INFO', '🔍 Starting comment feature diagnostics...');
    
    // Highlight the selected post
    if (postElement) {
      postElement.style.border = '3px dashed #e04343';
      postElement.style.padding = '10px';
      window.autoCommenterStatus.log('INFO', 'Target post highlighted in red');
    }
    
    // Check for comment buttons with various selectors
    const commentButtonSelectors = [
      'button[aria-label="Comment on this post"]',
      'button[aria-label*="comment" i]',
      'button[data-control-name="comment"]',
      '.comment-button',
      '.social-actions-button[aria-label*="comment" i]',
      '.feed-shared-social-action-bar__action-button',
      // Add new selectors that LinkedIn might have switched to
      'button.artdeco-button[aria-label*="comment" i]',
      'button.social-actions__button[aria-label*="comment" i]',
      'button.feed-shared-social-actions__button[aria-label*="comment" i]',
      '[data-test-id*="comment-button"]',
      'button:not([disabled])[aria-pressed="false"]',
      '[role="button"][aria-label*="comment" i]'
    ];
    
    window.autoCommenterStatus.log('INFO', 'Searching for comment buttons...');
    
    let foundButtons = [];
    commentButtonSelectors.forEach(selector => {
      const elements = postElement ? postElement.querySelectorAll(selector) : document.querySelectorAll(selector);
      if (elements.length > 0) {
        window.autoCommenterStatus.log('SUCCESS', `Selector "${selector}": Found ${elements.length} elements`);
        foundButtons.push(...Array.from(elements));
      } else {
        window.autoCommenterStatus.log('INFO', `Selector "${selector}": No elements found`);
      }
    });
    
    // Generic check for any buttons in the post
    if (postElement) {
      const allButtons = postElement.querySelectorAll('button');
      window.autoCommenterStatus.log('INFO', `Post contains ${allButtons.length} total buttons`);
      
      // Log button details
      if (allButtons.length > 0) {
        window.autoCommenterStatus.log('INFO', 'Button details (first 3):');
        Array.from(allButtons).slice(0, 3).forEach((button, i) => {
          const text = button.textContent.trim();
          const ariaLabel = button.getAttribute('aria-label') || 'none';
          const className = button.className;
          window.autoCommenterStatus.log('INFO', `Button ${i+1}: Text="${text}", aria-label="${ariaLabel}", class="${className}"`);
        });
      }
    }
    
    // Check for comment input fields
    const commentInputSelectors = [
      '.ql-editor[data-placeholder="Add a comment…"]',
      '.comments-comment-box__form-container .editor-content',
      '.ql-editor[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]',
      // Add new selectors
      '.comments-comment-texteditor__content [contenteditable="true"]',
      '.editor-container [contenteditable="true"]',
      '[aria-label*="comment" i][contenteditable="true"]',
      '[data-test-id*="comment-box"] [contenteditable="true"]',
      '.ql-container .ql-editor',
      '.comments-comment-box__form-container [contenteditable]',
      // Generic fallback to any contenteditable that appeared after click
      '[contenteditable="true"]'
    ];
    
    window.autoCommenterStatus.log('INFO', 'Searching for comment input fields...');
    
    let foundInputs = [];
    commentInputSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        window.autoCommenterStatus.log('SUCCESS', `Input selector "${selector}": Found ${elements.length} elements`);
        foundInputs.push(...Array.from(elements));
      } else {
        window.autoCommenterStatus.log('INFO', `Input selector "${selector}": No elements found`);
      }
    });
    
    // Check for post buttons
    const postButtonSelectors = [
      'button.comments-comment-box__submit-button',
      'button[type="submit"]',
      'button.comments-comment-texteditor__submitButton',
      // Add new selectors
      '.editor-toolbar button[type="submit"]',
      'button.artdeco-button--primary',
      'button.comments-comment-box__submit-button',
      'button[aria-label*="post" i]',
      'button[aria-label*="submit" i]',
      'button.ql-submit',
      '.comments-comment-box__submit-container button',
      'form button[type="submit"]'
    ];
    
    window.autoCommenterStatus.log('INFO', 'Searching for post/submit buttons...');
    
    let foundSubmitButtons = [];
    postButtonSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        window.autoCommenterStatus.log('SUCCESS', `Submit button selector "${selector}": Found ${elements.length} elements`);
        foundSubmitButtons.push(...Array.from(elements));
      } else {
        window.autoCommenterStatus.log('INFO', `Submit button selector "${selector}": No elements found`);
      }
    });
    
    // Look for all contenteditable elements
    const allContentEditables = document.querySelectorAll('[contenteditable="true"]');
    window.autoCommenterStatus.log('INFO', `Found ${allContentEditables.length} contenteditable elements in total`);
    
    // Add interactive testing options
    if (postElement && foundButtons.length > 0) {
      window.autoCommenterStatus.log('INFO', '📝 Starting interactive test - trying to click comment button...');
      
      // Create interactive test button
      const testButton = document.createElement('div');
      testButton.style = `
        position: fixed;
        top: 80px;
        right: 20px;
        background-color: #0077b5;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        z-index: 10000;
        font-weight: bold;
      `;
      testButton.textContent = 'Try Comment Button';
      testButton.onclick = async () => {
        try {
          const commentButton = foundButtons[0]; // Use the first found button
          window.autoCommenterStatus.log('INFO', 'Clicking comment button...');
          commentButton.click();
          
          // Wait for comment form to appear
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if any input field appeared
          const visibleInputs = Array.from(document.querySelectorAll('[contenteditable="true"]'))
            .filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);
          
          if (visibleInputs.length > 0) {
            window.autoCommenterStatus.log('SUCCESS', 'Comment form opened, found ${visibleInputs.length} input fields');
            
            // Create submit test button
            const submitTestButton = document.createElement('div');
            submitTestButton.style = `
              position: fixed;
              top: 130px;
              right: 20px;
              background-color: #4caf50;
              color: white;
              padding: 10px 15px;
              border-radius: 4px;
              cursor: pointer;
              z-index: 10000;
              font-weight: bold;
            `;
            submitTestButton.textContent = 'Try Adding Test Text';
            submitTestButton.onclick = async () => {
              try {
                const inputField = visibleInputs[0];
                window.autoCommenterStatus.log('INFO', 'Adding test text to comment field...');
                
                // Focus and set comment text
                inputField.focus();
                inputField.innerHTML = "This is a test comment. Please ignore.";
                
                // Dispatch input event
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                window.autoCommenterStatus.log('SUCCESS', 'Test text added to comment field');
                
                // Now look for submit buttons that might have appeared
                const activeSubmitButtons = Array.from(document.querySelectorAll('button:not([disabled])'))
                  .filter(btn => {
                    const text = (btn.textContent || '').toLowerCase();
                    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                    return text.includes('post') || text.includes('submit') || 
                           text.includes('comment') || ariaLabel.includes('post') || 
                           ariaLabel.includes('submit');
                  });
                
                if (activeSubmitButtons.length > 0) {
                  window.autoCommenterStatus.log('SUCCESS', `Found ${activeSubmitButtons.length} possible submit buttons`);
                  
                  // Create test post button
                  const postTestButton = document.createElement('div');
                  postTestButton.style = `
                    position: fixed;
                    top: 180px;
                    right: 20px;
                    background-color: #f44336;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    z-index: 10000;
                    font-weight: bold;
                  `;
                  postTestButton.textContent = 'Try Submit Button';
                  postTestButton.onclick = () => {
                    if (confirm('This will attempt to post the test comment. Continue?')) {
                      window.autoCommenterStatus.log('INFO', 'Clicking submit button...');
                      activeSubmitButtons[0].click();
                      
                      // Remove all test buttons
                      setTimeout(() => {
                        postTestButton.remove();
                        submitTestButton.remove();
                        testButton.remove();
                        window.autoCommenterStatus.log('SUCCESS', 'Test sequence completed');
                      }, 2000);
                    }
                  };
                  document.body.appendChild(postTestButton);
                } else {
                  window.autoCommenterStatus.log('ERROR', 'No submit buttons found');
                }
              } catch (error) {
                window.autoCommenterStatus.log('ERROR', `Error during input test: ${error.message}`);
              }
            };
            document.body.appendChild(submitTestButton);
          } else {
            window.autoCommenterStatus.log('ERROR', 'Comment form did not open or no input field found');
          }
        } catch (error) {
          window.autoCommenterStatus.log('ERROR', `Error during comment button test: ${error.message}`);
        }
      };
      document.body.appendChild(testButton);
    }
    
    window.autoCommenterStatus.log('INFO', '🔍 Diagnostics completed. Check the console for more details.');
    
    // Also log to console with more details
    console.log('LinkedIn Auto Commenter Diagnostics:', {
      commentButtonsFound: commentButtonSelectors.map(selector => ({ 
        selector, 
        count: document.querySelectorAll(selector).length,
        elements: Array.from(document.querySelectorAll(selector)).map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          ariaLabel: el.getAttribute('aria-label'),
          text: el.textContent.trim()
        }))
      })),
      inputFieldsFound: commentInputSelectors.map(selector => ({ 
        selector, 
        count: document.querySelectorAll(selector).length,
        visible: Array.from(document.querySelectorAll(selector))
          .filter(el => el.offsetHeight > 0 && el.offsetWidth > 0).length
      })),
      submitButtonsFound: postButtonSelectors.map(selector => ({ 
        selector, 
        count: document.querySelectorAll(selector).length 
      })),
      postElementDetails: postElement ? {
        buttons: postElement.querySelectorAll('button').length,
        inputs: postElement.querySelectorAll('input').length,
        contentEditables: postElement.querySelectorAll('[contenteditable]').length
      } : 'No post element provided'
    });
    
    return {
      foundButtons,
      foundInputs,
      foundSubmitButtons,
      allContentEditables: Array.from(allContentEditables)
    };
  }
  
  // Initial setup
  loadConfig();
  initUI();
  observeDOMChanges();
  createTestButton(); // Create test button for single post testing
  
  // Initialize status display with welcome message
  setTimeout(() => {
    if (window.autoCommenterStatus) {
      window.autoCommenterStatus.setOperation('INFO', `Auto-commenter ${config.enabled ? 'enabled' : 'disabled'}`);
      window.autoCommenterStatus.log('INFO', 'Auto-commenter initialized and ready');
      
      if (config.enabled) {
        window.autoCommenterStatus.log('INFO', 'Scanning for posts to comment on...');
      } else {
        window.autoCommenterStatus.log('WARNING', 'Auto-commenter is currently disabled');
      }
    }
  }, 1500);
  
  // Periodically process posts and track engagement patterns
  setInterval(() => {
    if (config.enabled) {
      processPosts();
      trackEngagementPatterns();
    }
  }, config.processingDelay);
})();
