// LinkedIn Selector Utils
// Helper functions for finding elements in LinkedIn's frequently changing UI
(function() {
  // List of selectors for comment buttons
  const commentButtonSelectors = [
    'button[aria-label="Comment on this post"]',
    'button[aria-label*="comment" i]',
    'button[data-control-name="comment"]',
    '.comment-button',
    '.social-actions-button[aria-label*="comment" i]',
    '.feed-shared-social-action-bar__action-button',
    'button.artdeco-button[aria-label*="comment" i]',
    'button.social-actions__button[aria-label*="comment" i]',
    'button.feed-shared-social-actions__button[aria-label*="comment" i]',
    '[data-test-id*="comment-button"]',
    '[role="button"][aria-label*="comment" i]'
  ];
  
  // List of selectors for comment input fields
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
  
  // List of selectors for post/submit buttons
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

  // Find comment button in a post element
  function findCommentButton(postElement) {
    // Try all selectors to find the comment button
    for (const selector of commentButtonSelectors) {
      const buttons = postElement.querySelectorAll(selector);
      if (buttons.length > 0) {
        // For semantic selectors, we can use the first match
        if (selector.includes('comment')) {
          return buttons[0];
        }
        
        // For positional selectors, verify if it looks like a comment button
        for (const button of buttons) {
          const textContent = button.textContent.toLowerCase();
          const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
          const innerHtml = button.innerHTML.toLowerCase();
          if (textContent.includes('comment') || ariaLabel.includes('comment') || 
              innerHtml.includes('comment') || innerHtml.includes('speech-bubble')) {
            return button;
          }
        }
      }
    }
    
    // Try to identify any buttons that might be the comment button
    const allButtons = postElement.querySelectorAll('button');
    for (const button of allButtons) {
      const textContent = button.textContent.toLowerCase();
      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
      const innerHTML = button.innerHTML.toLowerCase();
      
      // Check if this button is likely the comment button
      if (textContent.includes('comment') || ariaLabel.includes('comment') || 
          innerHTML.includes('comment') || innerHTML.includes('speech-bubble') ||
          innerHTML.includes('msg') || innerHTML.includes('chat')) {
        return button;
      }
    }
    
    // Try to find buttons by position in the social action bar
    const socialActionBars = postElement.querySelectorAll('.feed-shared-social-actions, .social-actions, .social-action-bar');
    if (socialActionBars.length > 0) {
      // Usually, the comment button is the second button in the action bar
      const actionButtons = socialActionBars[0].querySelectorAll('button');
      if (actionButtons.length >= 2) {
        return actionButtons[1]; // Second button is often the comment button
      }
    }
    
    return null;
  }
  
  // Find comment input field
  function findCommentInput() {
    // Try all selectors to find the comment input field
    for (const selector of commentInputSelectors) {
      const inputs = document.querySelectorAll(selector);
      if (inputs.length > 0) {
        // Filter for visible inputs
        for (const input of inputs) {
          if (input.offsetParent !== null) { // Check if element is visible
            return input;
          }
        }
      }
    }
    
    // Get any content-editable elements with non-zero dimensions (visible)
    const visibleContentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
      .filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);
    
    if (visibleContentEditables.length > 0) {
      return visibleContentEditables[0];
    }
    
    return null;
  }
  
  // Find post/submit button
  function findPostButton(commentInput = null) {
    // Try all selectors to find the post button
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
            return button;
          }
        }
        
        // If no explicit post/submit button found, use the first enabled button
        for (const button of buttons) {
          if (!button.disabled && button.getAttribute('aria-disabled') !== 'true') {
            return button;
          }
        }
      }
    }
    
    // If we have a comment input field, try to find buttons near it
    if (commentInput) {
      // Get all buttons that are visible and enabled
      const allButtons = Array.from(document.querySelectorAll('button:not([disabled]):not([aria-disabled="true"])'))
        .filter(button => button.offsetParent !== null); // Only visible buttons
      
      // Sort by proximity to the comment field
      if (allButtons.length > 0) {
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
        
        // Filter for buttons that appear to be submit buttons
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
          return potentialSubmitButtons[0];
        } else if (allButtons.length > 0) {
          // Just use the closest non-cancel button as a last resort
          for (const button of allButtons) {
            const text = button.textContent.toLowerCase().trim();
            if (text !== 'cancel' && !text.includes('cancel')) {
              return button;
            }
          }
        }
      }
    }
    
    return null;
  }
  
  // Try to reveal hidden comment forms
  function revealHiddenCommentForms() {
    let revealed = false;
    
    const hiddenCommentForms = Array.from(document.querySelectorAll('.comments-comment-box--is-collapsed, [aria-hidden="true"][class*="comment"]'))
      .filter(el => el.classList.contains('comments-comment-box') || 
                    el.querySelector('[contenteditable="true"]') !== null);
    
    if (hiddenCommentForms.length > 0) {
      hiddenCommentForms.forEach(form => {
        form.classList.remove('comments-comment-box--is-collapsed');
        form.setAttribute('aria-hidden', 'false');
        form.style.display = 'block';
        revealed = true;
      });
    }
    
    return revealed;
  }
  
  // Set comment text in an input field
  async function setCommentText(inputElement, commentText) {
    // Focus and set comment text
    inputElement.focus();
    inputElement.innerHTML = commentText.replace(/\n/g, '<br>');
    
    // Dispatch multiple events to ensure UI recognizes the input
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Wait to ensure the input was registered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Dispatch blur and focus events to trigger any validation
    inputElement.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));
    inputElement.dispatchEvent(new Event('focus', { bubbles: true }));
    
    return true;
  }
  
  // Try to post comment using Enter key
  async function submitWithEnterKey(inputElement) {
    // Focus the input
    inputElement.focus();
    
    // Send Enter key event
    const enterKeyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true
    });
    
    inputElement.dispatchEvent(enterKeyEvent);
    
    // Wait to see if the comment posted
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the comment field cleared or disappeared (indicating success)
    return (inputElement.innerHTML === '' || inputElement.offsetParent === null);
  }
  
  // Test all selectors on a page and log results
  function testAllSelectors() {
    console.log('🔍 Testing LinkedIn selectors');
    
    // Test comment button selectors
    console.log('--- Comment Button Selectors ---');
    commentButtonSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`${selector}: ${elements.length} elements found`);
      
      if (elements.length > 0) {
        console.log('  Sample element:', {
          text: elements[0].textContent.trim(),
          ariaLabel: elements[0].getAttribute('aria-label'),
          className: elements[0].className
        });
      }
    });
    
    // Test comment input selectors
    console.log('--- Comment Input Selectors ---');
    commentInputSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`${selector}: ${elements.length} elements found`);
      
      if (elements.length > 0) {
        const visibleCount = Array.from(elements).filter(el => el.offsetParent !== null).length;
        console.log(`  Visible elements: ${visibleCount}`);
      }
    });
    
    // Test post button selectors
    console.log('--- Post Button Selectors ---');
    postButtonSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`${selector}: ${elements.length} elements found`);
      
      if (elements.length > 0) {
        console.log('  Sample element:', {
          text: elements[0].textContent.trim(),
          ariaLabel: elements[0].getAttribute('aria-label'),
          className: elements[0].className
        });
      }
    });
    
    console.log('🔍 Selector testing completed');
  }
  
  // Export utility functions
  window.selectorUtils = {
    commentButtonSelectors,
    commentInputSelectors,
    postButtonSelectors,
    findCommentButton,
    findCommentInput,
    findPostButton,
    revealHiddenCommentForms,
    setCommentText,
    submitWithEnterKey,
    testAllSelectors
  };
})();
