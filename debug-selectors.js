// Debug script to find alternative selectors for LinkedIn UI elements
(function() {
  console.log("🔍 Starting LinkedIn selector diagnostics");
  
  // Create debug UI
  function createDebugUI() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'linkedin-selector-debug';
    debugDiv.style = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: white;
      border: 1px solid #0077b5;
      border-radius: 8px;
      padding: 15px;
      width: 350px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    debugDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; color: #0077b5;">LinkedIn Selector Debug</h3>
        <button id="close-debug-panel" style="background: none; border: none; cursor: pointer; font-size: 16px;">✕</button>
      </div>
      
      <div style="margin-bottom: 15px;">
        <button id="test-comment-buttons" style="background-color: #0077b5; color: white; border: none; padding: 8px 12px; margin-right: 5px; cursor: pointer; border-radius: 4px;">Test Comment Buttons</button>
        <button id="test-input-fields" style="background-color: #0077b5; color: white; border: none; padding: 8px 12px; margin-right: 5px; cursor: pointer; border-radius: 4px;">Test Input Fields</button>
        <button id="test-post-buttons" style="background-color: #0077b5; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;">Test Post Buttons</button>
      </div>
      
      <div id="debug-results" style="border: 1px solid #eee; padding: 10px; background-color: #f9f9f9; max-height: 400px; overflow-y: auto; font-size: 14px;">
        Click a test button to start diagnosis.
      </div>
      
      <div style="margin-top: 15px;">
        <button id="test-click-sequence" style="background-color: #2e7d32; color: white; border: none; padding: 8px 15px; width: 100%; cursor: pointer; border-radius: 4px;">Test Full Comment Sequence</button>
      </div>
    `;
    
    document.body.appendChild(debugDiv);
    
    // Add event listeners
    document.getElementById('close-debug-panel').addEventListener('click', () => {
      debugDiv.remove();
    });
    
    document.getElementById('test-comment-buttons').addEventListener('click', () => {
      testCommentButtons();
    });
    
    document.getElementById('test-input-fields').addEventListener('click', () => {
      testInputFields();
    });
    
    document.getElementById('test-post-buttons').addEventListener('click', () => {
      testPostButtons();
    });
    
    document.getElementById('test-click-sequence').addEventListener('click', () => {
      testFullCommentSequence();
    });
  }
  
  // Try various selectors for comment buttons
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
    '[role="button"][aria-label*="comment" i]'
  ];
  
  // Try various selectors for comment input fields
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
    '.comments-comment-box__form-container [contenteditable]'
  ];
  
  // Try various selectors for post buttons
  const postButtonSelectors = [
    'button.comments-comment-box__submit-button',
    'button[type="submit"]',
    'button.comments-comment-texteditor__submitButton',
    '.comments-comment-box__submit-button',
    'button.artdeco-button--primary',
    '.editor-toolbar .submit-button',
    'form button[type="submit"]',
    '.comments-comment-box__submit-container button'
  ];
  
  // Test comment button selectors
  function testCommentButtons() {
    const resultsDiv = document.getElementById('debug-results');
    resultsDiv.innerHTML = '<h4>Testing comment buttons...</h4>';
    
    let output = '<ul style="list-style: none; padding-left: 5px;">';
    let totalFound = 0;
    
    commentButtonSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      const count = elements.length;
      totalFound += count;
      
      if (count > 0) {
        output += `<li style="margin-bottom: 8px; padding-left: 5px; border-left: 3px solid #4caf50;"><strong>${selector}</strong>: Found ${count} elements ✅</li>`;
        
        // Add highlight to first found element
        if (elements[0]) {
          const originalBorder = elements[0].style.border;
          elements[0].style.border = '2px dashed #4caf50';
          
          setTimeout(() => {
            elements[0].style.border = originalBorder;
          }, 3000);
        }
      } else {
        output += `<li style="margin-bottom: 8px; color: #666;"><strong>${selector}</strong>: No elements found</li>`;
      }
    });
    
    output += '</ul>';
    
    if (totalFound > 0) {
      resultsDiv.innerHTML += `<div style="color: green; font-weight: bold;">Found ${totalFound} total comment buttons across all selectors</div>`;
    } else {
      resultsDiv.innerHTML += `<div style="color: red; font-weight: bold;">No comment buttons found with any selector!</div>`;
    }
    
    resultsDiv.innerHTML += output;
    
    // Add information about all buttons for debugging
    resultsDiv.innerHTML += '<h4>Analyzing all buttons on page...</h4>';
    
    const allButtons = document.querySelectorAll('button');
    const commentButtons = Array.from(allButtons).filter(button => {
      const text = button.textContent && button.textContent.toLowerCase();
      const ariaLabel = button.getAttribute('aria-label') && button.getAttribute('aria-label').toLowerCase();
      const className = button.className && button.className.toLowerCase();
      const innerHTML = button.innerHTML && button.innerHTML.toLowerCase();
      
      return (
        (text && text.includes('comment')) ||
        (ariaLabel && ariaLabel.includes('comment')) ||
        (className && className.includes('comment')) ||
        (innerHTML && innerHTML.includes('comment'))
      );
    });
    
    if (commentButtons.length > 0) {
      resultsDiv.innerHTML += `<div>Found ${commentButtons.length} buttons with comment-related attributes</div>`;
      
      let buttonsInfo = '<ul style="list-style: none; padding-left: 5px;">';
      commentButtons.slice(0, 3).forEach((button, i) => {
        buttonsInfo += `
          <li style="margin-bottom: 8px; padding: 5px; background-color: #f5f5f5; border-radius: 4px;">
            <div><strong>Button ${i+1}:</strong> ${button.textContent.trim() || '[no text]'}</div>
            <div>aria-label: ${button.getAttribute('aria-label') || '[none]'}</div>
            <div>class: ${button.className || '[none]'}</div>
          </li>
        `;
        
        // Highlight this button too
        const originalBorder = button.style.border;
        button.style.border = '2px dashed #ff9800';
        
        setTimeout(() => {
          button.style.border = originalBorder;
        }, 3000);
      });
      buttonsInfo += '</ul>';
      
      resultsDiv.innerHTML += buttonsInfo;
    } else {
      resultsDiv.innerHTML += '<div>No buttons with comment-related attributes found</div>';
    }
  }
  
  // Test comment input field selectors
  function testInputFields() {
    const resultsDiv = document.getElementById('debug-results');
    resultsDiv.innerHTML = '<h4>Testing comment input fields...</h4>';
    
    let output = '<ul style="list-style: none; padding-left: 5px;">';
    let totalFound = 0;
    
    commentInputSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      const visibleElements = Array.from(elements).filter(el => el.offsetParent !== null);
      
      const count = elements.length;
      const visibleCount = visibleElements.length;
      totalFound += visibleCount;
      
      if (count > 0) {
        output += `<li style="margin-bottom: 8px; padding-left: 5px; border-left: ${visibleCount > 0 ? '3px solid #4caf50' : '3px solid #ff9800'};">
          <strong>${selector}</strong>: Found ${count} elements (${visibleCount} visible) ${visibleCount > 0 ? '✅' : '⚠️'}
        </li>`;
        
        // Add highlight to first visible element
        if (visibleElements[0]) {
          const originalBorder = visibleElements[0].style.border;
          visibleElements[0].style.border = '2px dashed #4caf50';
          
          setTimeout(() => {
            visibleElements[0].style.border = originalBorder;
          }, 3000);
        }
      } else {
        output += `<li style="margin-bottom: 8px; color: #666;"><strong>${selector}</strong>: No elements found</li>`;
      }
    });
    
    output += '</ul>';
    
    if (totalFound > 0) {
      resultsDiv.innerHTML += `<div style="color: green; font-weight: bold;">Found ${totalFound} total visible input fields</div>`;
    } else {
      resultsDiv.innerHTML += `<div style="color: ${document.querySelectorAll('[contenteditable="true"]').length > 0 ? 'orange' : 'red'}; font-weight: bold;">
        No visible comment input fields found with specific selectors! 
        ${document.querySelectorAll('[contenteditable="true"]').length > 0 ? `(But found ${document.querySelectorAll('[contenteditable="true"]').length} generic contenteditable elements)` : ''}
      </div>`;
    }
    
    resultsDiv.innerHTML += output;
    
    // Check for all contenteditable elements
    const allContentEditables = document.querySelectorAll('[contenteditable="true"]');
    const visibleContentEditables = Array.from(allContentEditables).filter(el => el.offsetParent !== null);
    
    resultsDiv.innerHTML += `<h4>All contenteditable elements</h4>
      <div>Found ${allContentEditables.length} total contenteditable elements (${visibleContentEditables.length} visible)</div>`;
    
    if (visibleContentEditables.length > 0) {
      let editables = '<ul style="list-style: none; padding-left: 5px;">';
      visibleContentEditables.slice(0, 3).forEach((el, i) => {
        editables += `
          <li style="margin-bottom: 8px; padding: 5px; background-color: #f5f5f5; border-radius: 4px;">
            <div><strong>Element ${i+1}</strong></div>
            <div>Content: ${el.textContent.trim().substring(0, 30) || '[empty]'}</div>
            <div>class: ${el.className || '[none]'}</div>
            <div>parent: ${el.parentElement.tagName}${el.parentElement.className ? '.' + el.parentElement.className.replace(/\\s+/g, '.') : ''}</div>
          </li>
        `;
        
        // Highlight this element
        const originalBorder = el.style.border;
        el.style.border = '2px dashed #ff9800';
        
        setTimeout(() => {
          el.style.border = originalBorder;
        }, 3000);
      });
      editables += '</ul>';
      
      resultsDiv.innerHTML += editables;
    }
  }
  
  // Test post button selectors
  function testPostButtons() {
    const resultsDiv = document.getElementById('debug-results');
    resultsDiv.innerHTML = '<h4>Testing post/submit buttons...</h4>';
    
    let output = '<ul style="list-style: none; padding-left: 5px;">';
    let totalFound = 0;
    
    postButtonSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      const count = elements.length;
      totalFound += count;
      
      if (count > 0) {
        output += `<li style="margin-bottom: 8px; padding-left: 5px; border-left: 3px solid #4caf50;"><strong>${selector}</strong>: Found ${count} elements ✅</li>`;
        
        // Add highlight to first found element
        if (elements[0]) {
          const originalBorder = elements[0].style.border;
          elements[0].style.border = '2px dashed #4caf50';
          
          setTimeout(() => {
            elements[0].style.border = originalBorder;
          }, 3000);
        }
      } else {
        output += `<li style="margin-bottom: 8px; color: #666;"><strong>${selector}</strong>: No elements found</li>`;
      }
    });
    
    output += '</ul>';
    
    if (totalFound > 0) {
      resultsDiv.innerHTML += `<div style="color: green; font-weight: bold;">Found ${totalFound} total post/submit buttons across all selectors</div>`;
    } else {
      resultsDiv.innerHTML += '<div style="color: red; font-weight: bold;">No post buttons found with any selector!</div>';
    }
    
    resultsDiv.innerHTML += output;
    
    // Look for buttons that might be post/submit buttons
    const potentialSubmitButtons = Array.from(document.querySelectorAll('button:not([disabled])'))
      .filter(button => {
        const text = button.textContent && button.textContent.toLowerCase().trim();
        return text === 'post' || text === 'submit' || text === 'comment' || text === 'send';
      });
    
    if (potentialSubmitButtons.length > 0) {
      resultsDiv.innerHTML += `<div>Found ${potentialSubmitButtons.length} potential submit buttons by text content</div>`;
      
      let buttonsInfo = '<ul style="list-style: none; padding-left: 5px;">';
      potentialSubmitButtons.slice(0, 3).forEach((button, i) => {
        buttonsInfo += `
          <li style="margin-bottom: 8px; padding: 5px; background-color: #f5f5f5; border-radius: 4px;">
            <div><strong>Button ${i+1}:</strong> ${button.textContent.trim() || '[no text]'}</div>
            <div>aria-label: ${button.getAttribute('aria-label') || '[none]'}</div>
            <div>class: ${button.className || '[none]'}</div>
            <div>type: ${button.getAttribute('type') || '[none]'}</div>
          </li>
        `;
        
        // Highlight this button
        const originalBorder = button.style.border;
        button.style.border = '2px dashed #ff9800';
        
        setTimeout(() => {
          button.style.border = originalBorder;
        }, 3000);
      });
      buttonsInfo += '</ul>';
      
      resultsDiv.innerHTML += buttonsInfo;
    } else {
      resultsDiv.innerHTML += '<div>No buttons with post/submit text content found</div>';
    }
  }
  
  // Test the full comment sequence
  async function testFullCommentSequence() {
    const resultsDiv = document.getElementById('debug-results');
    resultsDiv.innerHTML = '<h4>Testing full comment sequence...</h4>';
    
    // Find the first post
    const post = document.querySelector('.feed-shared-update-v2, .occludable-update');
    if (!post) {
      resultsDiv.innerHTML += '<div style="color: red; font-weight: bold;">No posts found! Please scroll down to load posts.</div>';
      return;
    }
    
    // Step 1: Highlight the post
    post.style.border = '2px solid #0077b5';
    post.style.boxShadow = '0 0 10px rgba(0, 119, 181, 0.5)';
    post.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    resultsDiv.innerHTML += '<div style="color: blue; font-weight: bold;">Step 1: Post selected and highlighted</div>';
    
    // Step 2: Find comment button
    resultsDiv.innerHTML += '<div>Step 2: Looking for comment button...</div>';
    
    let commentButton = null;
    for (const selector of commentButtonSelectors) {
      const buttons = post.querySelectorAll(selector);
      if (buttons.length > 0) {
        // Use first match for semantic selectors
        commentButton = buttons[0];
        resultsDiv.innerHTML += `<div style="color: green;">Found comment button using selector: ${selector}</div>`;
        break;
      }
    }
    
    // Try fallback methods if needed
    if (!commentButton) {
      const allButtons = post.querySelectorAll('button');
      
      // Check for buttons with comment-related content
      for (const button of allButtons) {
        const textContent = button.textContent.toLowerCase();
        const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
        const innerHTML = button.innerHTML.toLowerCase();
        
        if (textContent.includes('comment') || ariaLabel.includes('comment') || 
            innerHTML.includes('comment') || innerHTML.includes('speech-bubble')) {
          commentButton = button;
          resultsDiv.innerHTML += '<div style="color: green;">Found comment button through content analysis</div>';
          break;
        }
      }
      
      // If still not found, try social action bar
      if (!commentButton) {
        const socialActionBars = post.querySelectorAll('.feed-shared-social-actions, .social-actions, .social-action-bar');
        if (socialActionBars.length > 0) {
          const actionButtons = socialActionBars[0].querySelectorAll('button');
          if (actionButtons.length >= 2) {
            commentButton = actionButtons[1]; // Second button is often the comment button
            resultsDiv.innerHTML += '<div style="color: orange;">Using second button in social action bar as comment button</div>';
          }
        }
      }
    }
    
    if (!commentButton) {
      resultsDiv.innerHTML += '<div style="color: red; font-weight: bold;">No comment button found! Sequence failed.</div>';
      return;
    }
    
    // Highlight the comment button
    const originalButtonStyle = commentButton.style.cssText;
    commentButton.style.border = '2px dashed #4caf50';
    
    // Step 3: Click the comment button
    resultsDiv.innerHTML += '<div>Step 3: Clicking comment button...</div>';
    commentButton.click();
    
    // Wait for comment form to appear
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Look for comment input field
    resultsDiv.innerHTML += '<div>Step 4: Looking for comment input field...</div>';
    
    let commentInput = null;
    for (const selector of commentInputSelectors) {
      const inputs = document.querySelectorAll(selector);
      if (inputs.length > 0) {
        // Pick the first visible one
        for (const input of inputs) {
          if (input.offsetParent !== null) { // Check if element is visible
            commentInput = input;
            resultsDiv.innerHTML += `<div style="color: green;">Found comment input using selector: ${selector}</div>`;
            break;
          }
        }
        
        if (commentInput) break;
      }
    }
    
    // Fallback to any contenteditable element
    if (!commentInput) {
      const visibleContentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
        .filter(el => el.offsetParent !== null);
      
      if (visibleContentEditables.length > 0) {
        commentInput = visibleContentEditables[0];
        resultsDiv.innerHTML += '<div style="color: orange;">Found contenteditable element as fallback input</div>';
      }
    }
    
    if (!commentInput) {
      // Try to reveal hidden forms
      const hiddenCommentForms = Array.from(document.querySelectorAll('.comments-comment-box--is-collapsed, [aria-hidden="true"][class*="comment"]'))
        .filter(el => el.classList.contains('comments-comment-box') || 
                      el.querySelector('[contenteditable="true"]') !== null);
      
      if (hiddenCommentForms.length > 0) {
        resultsDiv.innerHTML += `<div style="color: orange;">Found ${hiddenCommentForms.length} hidden comment forms, attempting to reveal</div>`;
        
        hiddenCommentForms.forEach(form => {
          form.classList.remove('comments-comment-box--is-collapsed');
          form.setAttribute('aria-hidden', 'false');
          form.style.display = 'block';
        });
        
        // Check again after revealing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newVisibleContentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
          .filter(el => el.offsetParent !== null);
        
        if (newVisibleContentEditables.length > 0) {
          commentInput = newVisibleContentEditables[0];
          resultsDiv.innerHTML += '<div style="color: green;">Found comment input after revealing hidden form</div>';
        }
      }
    }
    
    if (!commentInput) {
      resultsDiv.innerHTML += '<div style="color: red; font-weight: bold;">No comment input field found! Sequence failed.</div>';
      commentButton.style.cssText = originalButtonStyle;
      return;
    }
    
    // Highlight the comment input
    const originalInputStyle = commentInput.style.cssText;
    commentInput.style.border = '2px dashed #4caf50';
    
    // Step 5: Add test text
    resultsDiv.innerHTML += '<div>Step 5: Adding test text to comment field...</div>';
    
    // Focus and set comment text
    commentInput.focus();
    commentInput.innerHTML = "This is a test comment from LinkedIn Auto Commenter diagnostics. This will not be submitted.";
    
    // Dispatch input event
    commentInput.dispatchEvent(new Event('input', { bubbles: true }));
    commentInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    resultsDiv.innerHTML += '<div style="color: green;">Test text added successfully</div>';
    
    // Step 6: Look for submit button (but don't click it)
    resultsDiv.innerHTML += '<div>Step 6: Looking for submit button (will not click)...</div>';
    
    let postButton = null;
    for (const selector of postButtonSelectors) {
      const buttons = document.querySelectorAll(selector);
      
      if (buttons.length > 0) {
        // Look for text indicating a submit button
        for (const button of buttons) {
          const text = button.textContent.toLowerCase().trim();
          if (text === 'post' || text === 'submit' || text === 'comment') {
            postButton = button;
            resultsDiv.innerHTML += `<div style="color: green;">Found submit button with text "${text}" using selector: ${selector}</div>`;
            break;
          }
        }
        
        if (!postButton) {
          // Use first enabled button
          for (const button of buttons) {
            if (!button.disabled && button.getAttribute('aria-disabled') !== 'true') {
              postButton = button;
              resultsDiv.innerHTML += `<div style="color: green;">Found potential submit button using selector: ${selector}</div>`;
              break;
            }
          }
        }
        
        if (postButton) break;
      }
    }
    
    // Try proximity-based approach as fallback
    if (!postButton) {
      const allButtons = Array.from(document.querySelectorAll('button:not([disabled]):not([aria-disabled="true"])'))
        .filter(button => button.offsetParent !== null);
      
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
        
        const closestButton = allButtons[0];
        const text = closestButton.textContent.toLowerCase().trim();
        if (text !== 'cancel' && !text.includes('cancel')) {
          postButton = closestButton;
          resultsDiv.innerHTML += `<div style="color: orange;">Found closest button "${text}" to comment field</div>`;
        }
      }
    }
    
    if (postButton) {
      // Highlight the post button
      const originalPostButtonStyle = postButton.style.cssText;
      postButton.style.border = '2px dashed #4caf50';
      
      resultsDiv.innerHTML += '<div style="color: green; font-weight: bold;">✅ Full sequence test successful! All elements found.</div>';
      
      // Clean up after a delay
      setTimeout(() => {
        commentButton.style.cssText = originalButtonStyle;
        commentInput.style.cssText = originalInputStyle;
        postButton.style.cssText = originalPostButtonStyle;
        post.style.border = '';
        post.style.boxShadow = '';
      }, 5000);
    } else {
      resultsDiv.innerHTML += '<div style="color: orange; font-weight: bold;">⚠️ Partial success: Comment button and input field found, but submit button not found!</div>';
      
      // Clean up after a delay
      setTimeout(() => {
        commentButton.style.cssText = originalButtonStyle;
        commentInput.style.cssText = originalInputStyle;
        post.style.border = '';
        post.style.boxShadow = '';
      }, 5000);
    }
  }
  
  // Run the diagnostic UI or standalone diagnostics
  function runDiagnostics() {
    // Check if we should create UI or just run tests
    const urlParams = new URLSearchParams(window.location.search);
    const autoRun = urlParams.get('autoRun') === 'true';
    
    if (autoRun) {
      console.log("🔍 Running automated LinkedIn selector diagnostics");
      
      // Test comment button selectors
      commentButtonSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Comment button selector "${selector}": Found ${elements.length} elements`);
      });
      
      // Test comment input selectors
      commentInputSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        const visibleElements = Array.from(elements).filter(el => el.offsetParent !== null);
        console.log(`Comment input selector "${selector}": Found ${elements.length} elements (${visibleElements.length} visible)`);
      });
      
      // Test post button selectors
      postButtonSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Post button selector "${selector}": Found ${elements.length} elements`);
      });
      
      console.log("🔍 Selector diagnostics completed");
    } else {
      createDebugUI();
    }
  }
  
  // Run diagnostics
  runDiagnostics();
})();
