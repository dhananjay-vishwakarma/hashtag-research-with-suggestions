(function(global){
  const cfg = () => global.autoCommenterConfig;
  const saveCfg = () => global.saveConfig && global.saveConfig();

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
  function updateApiKeyStatus(){
    const input = document.getElementById('api-key-input');
    if(!input) return;
    const status = document.getElementById('api-key-status') || document.createElement('div');
    status.id = 'api-key-status';
    status.style.marginTop = '5px';
    status.style.fontSize = '12px';
    input.parentElement.appendChild(status);
    if(input.value && global.AutoCommenterAPI && global.AutoCommenterAPI.isValidOpenAIApiKey(input.value)){
      status.textContent = 'API key looks valid';
      status.style.color = '#4caf50';
    }else{
      status.textContent = 'API key missing or invalid';
      status.style.color = '#f44336';
    }
  }

  global.AutoCommenterUI = { initUI, createTestButton, highlightNewPosts, updateApiKeyStatus };
})(window);
