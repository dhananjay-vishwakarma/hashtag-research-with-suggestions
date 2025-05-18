// LinkedIn Auto Commenter Status Display
// Provides real-time feedback about the commenting process
(function() {
  // Configuration
  const config = {
    displayDuration: 5000, // How long messages stay visible (ms)
    maxLogEntries: 10,     // Maximum number of log entries to show
    position: 'bottom-right', // Position on screen
    debug: false,          // Debug mode
    buttonOffset: 80,      // Offset from bottom for the toggle button to avoid overlapping with chat button
    containerOffset: 140   // Offset from bottom for the status container
  };
  
  // Debug logger to help with positioning issues
  function debugLog(message, obj) {
    if (config.debug) {
      console.log(`[Status Display] ${message}`, obj || '');
    }
  }
  
  // Log the configuration for debugging
  debugLog('Initialized with configuration', config);
  
  // Status display state
  let state = {
    visible: false,
    minimized: false,
    activeOperation: null,
    logEntries: []
  };
  
  // Status codes and messages
  const statusTypes = {
    INFO: { icon: 'ℹ️', color: '#0077b5' },
    SUCCESS: { icon: '✅', color: '#4caf50' },
    WARNING: { icon: '⚠️', color: '#ff9800' },
    ERROR: { icon: '❌', color: '#f44336' },
    PROCESSING: { icon: '⏳', color: '#9c27b0' }
  };
  
  // Create UI elements
  function createStatusDisplay() {
    // Remove existing display if any
    const existingDisplay = document.getElementById('auto-commenter-status');
    if (existingDisplay) existingDisplay.remove();
    
    // Create main container
    const container = document.createElement('div');
    container.id = 'auto-commenter-status';
    container.style = `
      position: fixed;
      ${config.position.includes('bottom') ? `bottom: ${config.containerOffset}px;` : 'top: 20px;'}
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      width: 320px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      transition: all 0.3s ease;
      display: none;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #f3f6f8;
      border-radius: 8px 8px 0 0;
    `;
    
    const title = document.createElement('div');
    title.textContent = 'Auto Commenter Status';
    title.style = 'font-weight: bold; color: #0077b5;';
    
    const controls = document.createElement('div');
    controls.style = 'display: flex; gap: 8px;';
    
    // Minimize button
    const minimizeBtn = document.createElement('span');
    minimizeBtn.innerHTML = '&#8212;';
    minimizeBtn.style = 'cursor: pointer; font-size: 16px; width: 20px; text-align: center;';
    minimizeBtn.title = 'Minimize';
    minimizeBtn.onclick = toggleMinimize;
    
    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style = 'cursor: pointer; font-size: 18px; width: 20px; text-align: center;';
    closeBtn.title = 'Close';
    closeBtn.onclick = hideStatusDisplay;
    
    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);
    
    header.appendChild(title);
    header.appendChild(controls);
    
    // Create content area
    const content = document.createElement('div');
    content.id = 'auto-commenter-status-content';
    content.style = `
      padding: 12px;
      max-height: 300px;
      overflow-y: auto;
    `;
    
    // Current operation status
    const currentOperation = document.createElement('div');
    currentOperation.id = 'auto-commenter-current-operation';
    currentOperation.style = 'margin-bottom: 10px; font-weight: bold;';
    currentOperation.textContent = 'Waiting for activity...';
    
    // Log entries
    const logContainer = document.createElement('div');
    logContainer.id = 'auto-commenter-log';
    
    content.appendChild(currentOperation);
    content.appendChild(logContainer);
    
    // Assemble the display
    container.appendChild(header);
    container.appendChild(content);
    
    // Add to page
    document.body.appendChild(container);
    
    // Create the toggle button
    createToggleButton();
    
    return container;
  }
  
  // Create a toggle button that's always visible
  function createToggleButton() {
    const existingBtn = document.getElementById('auto-commenter-status-toggle');
    if (existingBtn) existingBtn.remove();
    
    const toggleBtn = document.createElement('div');
    toggleBtn.id = 'auto-commenter-status-toggle';
    toggleBtn.style = `
      position: fixed;
      ${config.position.includes('bottom') ? `bottom: ${config.buttonOffset}px;` : 'top: 20px;'}
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #0077b5;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      z-index: 9998;
      font-size: 20px;
    `;
    toggleBtn.innerHTML = '📊';
    toggleBtn.title = 'Toggle Auto Commenter Status';
    
    toggleBtn.onclick = toggleStatusDisplay;
    
    document.body.appendChild(toggleBtn);
    return toggleBtn;
  }
  
  // Show the status display
  function showStatusDisplay() {
    const display = document.getElementById('auto-commenter-status') || createStatusDisplay();
    display.style.display = 'block';
    state.visible = true;
    state.minimized = false;
    
    // Update the content
    updateDisplayContent();
  }
  
  // Hide the status display
  function hideStatusDisplay() {
    const display = document.getElementById('auto-commenter-status');
    if (display) display.style.display = 'none';
    state.visible = false;
  }
  
  // Toggle the status display
  function toggleStatusDisplay() {
    if (state.visible) {
      hideStatusDisplay();
    } else {
      showStatusDisplay();
    }
  }
  
  // Toggle minimized state
  function toggleMinimize() {
    const content = document.getElementById('auto-commenter-status-content');
    if (!content) return;
    
    state.minimized = !state.minimized;
    content.style.display = state.minimized ? 'none' : 'block';
    
    // Update the minimize button
    const minimizeBtn = document.querySelector('#auto-commenter-status span[title="Minimize"]');
    if (minimizeBtn) {
      minimizeBtn.innerHTML = state.minimized ? '&#9650;' : '&#8212;';
      minimizeBtn.title = state.minimized ? 'Expand' : 'Minimize';
    }
  }
  
  // Update the display content
  function updateDisplayContent() {
    if (!state.visible) return;
    
    // Update current operation
    const currentOperationElement = document.getElementById('auto-commenter-current-operation');
    if (currentOperationElement) {
      if (state.activeOperation) {
        const { type, message } = state.activeOperation;
        const status = statusTypes[type] || statusTypes.INFO;
        currentOperationElement.innerHTML = `${status.icon} ${message}`;
        currentOperationElement.style.color = status.color;
      } else {
        currentOperationElement.textContent = 'Idle - waiting for activity...';
        currentOperationElement.style.color = '#666';
      }
    }
    
    // Update log entries
    const logContainer = document.getElementById('auto-commenter-log');
    if (logContainer) {
      logContainer.innerHTML = '';
      
      if (state.logEntries.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.style = 'color: #999; font-style: italic; text-align: center; padding: 10px;';
        emptyMessage.textContent = 'No activity to display yet';
        logContainer.appendChild(emptyMessage);
      } else {
        state.logEntries.forEach(entry => {
          const { type, message, timestamp } = entry;
          const status = statusTypes[type] || statusTypes.INFO;
          
          const logEntry = document.createElement('div');
          logEntry.style = `
            margin-bottom: 8px;
            padding: 8px;
            border-radius: 4px;
            background-color: #f9f9f9;
            border-left: 3px solid ${status.color};
          `;
          
          // Format the timestamp
          const time = new Date(timestamp).toLocaleTimeString();
          
          logEntry.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
              <span>${status.icon} ${message}</span>
              <small style="color: #999;">${time}</small>
            </div>
          `;
          
          logContainer.appendChild(logEntry);
        });
      }
    }
  }
  
  // Set the current operation status
  function setCurrentOperation(type, message) {
    state.activeOperation = { type, message, timestamp: new Date() };
    updateDisplayContent();
    
    // Show the display if not already visible
    if (!state.visible) showStatusDisplay();
  }
  
  // Clear the current operation
  function clearCurrentOperation() {
    state.activeOperation = null;
    updateDisplayContent();
  }
  
  // Add a log entry
  function addLogEntry(type, message) {
    const entry = { type, message, timestamp: new Date() };
    
    // Add to the beginning of the array
    state.logEntries.unshift(entry);
    
    // Limit the number of entries
    if (state.logEntries.length > config.maxLogEntries) {
      state.logEntries = state.logEntries.slice(0, config.maxLogEntries);
    }
    
    // Update the display
    updateDisplayContent();
    
    // Show the display if not already visible
    if (!state.visible && type !== 'INFO') showStatusDisplay();
  }
  
  // Auto-hide the current operation after a delay
  function autoHideCurrentOperation() {
    setTimeout(() => {
      clearCurrentOperation();
    }, config.displayDuration);
  }
  
  // Initialize the status display
  function init() {
    // Create the toggle button
    const toggleBtn = createToggleButton();
    
    // Log position information for debugging
    debugLog("Status toggle button created with position", { 
      bottom: config.buttonOffset, 
      right: 20, 
      width: 40, 
      height: 40 
    });
    
    // Check for possible overlap with auto-commenter button
    function checkForOverlap() {
      const autoCommenterBtn = document.getElementById('toggle-auto-commenter');
      const toggleBtn = document.getElementById('auto-commenter-status-toggle');
      
      if (autoCommenterBtn && toggleBtn) {
        const acRect = autoCommenterBtn.getBoundingClientRect();
        const toggleRect = toggleBtn.getBoundingClientRect();
        
        debugLog("Auto-commenter button position", {
          top: acRect.top,
          left: acRect.left,
          right: acRect.right,
          bottom: acRect.bottom
        });
        
        debugLog("Status toggle button position", {
          top: toggleRect.top,
          left: toggleRect.left,
          right: toggleRect.right,
          bottom: toggleRect.bottom
        });
        
        const overlapping = !(
          toggleRect.right < acRect.left || 
          toggleRect.left > acRect.right || 
          toggleRect.bottom < acRect.top || 
          toggleRect.top > acRect.bottom
        );
        
        debugLog("Buttons overlapping:", overlapping);
        
        if (overlapping) {
          console.warn("[Status Display] Warning: Status toggle button overlaps with auto-commenter button!");
        } else {
          debugLog("Positioning is correct, no overlap detected");
        }
      }
    }
    
    // Check initially and also when window is resized
    setTimeout(checkForOverlap, 2000);
    
    // Add window resize listener to maintain proper positioning
    window.addEventListener('resize', function() {
      debugLog("Window resized, rechecking button positions");
      checkForOverlap();
    });
  }
  
  // External API
  window.autoCommenterStatus = {
    show: showStatusDisplay,
    hide: hideStatusDisplay,
    toggle: toggleStatusDisplay,
    setOperation: (type, message) => {
      setCurrentOperation(type, message);
      return { clear: clearCurrentOperation, autoHide: autoHideCurrentOperation };
    },
    log: addLogEntry,
    clearOperation: clearCurrentOperation,
    debug: (enable) => {
      config.debug = enable;
      debugLog(`Debug mode ${enable ? 'enabled' : 'disabled'}`);
    }
  };
  
  // Initialize
  init();
})();