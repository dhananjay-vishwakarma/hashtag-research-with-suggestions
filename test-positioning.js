// Test script to verify positioning of status display toggle and auto-commenter toggle buttons
(function() {
  // This function logs the positions of both toggle buttons to verify they don't overlap
  function checkButtonPositioning() {
    console.log("Running positioning check...");
    
    // Check auto-commenter toggle button
    const autoCommenterBtn = document.getElementById('toggle-auto-commenter');
    if (autoCommenterBtn) {
      const acRect = autoCommenterBtn.getBoundingClientRect();
      console.log("Auto-Commenter Button Position:", {
        top: acRect.top,
        right: window.innerWidth - acRect.right,
        bottom: window.innerHeight - acRect.bottom,
        left: acRect.left,
        width: acRect.width,
        height: acRect.height
      });
    } else {
      console.log("Auto-Commenter Button not found in DOM");
    }
    
    // Check status display toggle button
    const statusToggleBtn = document.getElementById('auto-commenter-status-toggle');
    if (statusToggleBtn) {
      const stRect = statusToggleBtn.getBoundingClientRect();
      console.log("Status Display Toggle Position:", {
        top: stRect.top,
        right: window.innerWidth - stRect.right,
        bottom: window.innerHeight - stRect.bottom,
        left: stRect.left,
        width: stRect.width,
        height: stRect.height
      });
      
      // Check for overlap
      if (autoCommenterBtn) {
        const acRect = autoCommenterBtn.getBoundingClientRect();
        const overlapping = !(
          stRect.right < acRect.left || 
          stRect.left > acRect.right || 
          stRect.bottom < acRect.top || 
          stRect.top > acRect.bottom
        );
        
        console.log("Buttons overlapping:", overlapping);
        
        // Calculate distance between centers
        const acCenterX = acRect.left + (acRect.width / 2);
        const acCenterY = acRect.top + (acRect.height / 2);
        const stCenterX = stRect.left + (stRect.width / 2);
        const stCenterY = stRect.top + (stRect.height / 2);
        
        const distance = Math.sqrt(
          Math.pow(acCenterX - stCenterX, 2) + 
          Math.pow(acCenterY - stCenterY, 2)
        );
        
        console.log("Distance between button centers:", distance, "pixels");
        return {
          overlapping,
          distance,
          autoCommenterPosition: {
            bottom: window.innerHeight - acRect.bottom,
            right: window.innerWidth - acRect.right
          },
          statusTogglePosition: {
            bottom: window.innerHeight - stRect.bottom,
            right: window.innerWidth - stRect.right
          }
        };
      }
    } else {
      console.log("Status Display Toggle Button not found in DOM");
    }
    
    return null;
  }
  
  // Add a function to visualize positions
  function visualizePositions() {
    const result = checkButtonPositioning();
    if (!result) return;
    
    console.log("Auto-Commenter position:", result.autoCommenterPosition);
    console.log("Status Toggle position:", result.statusTogglePosition);
    
    alert(
      `Button Positions Check:\n` +
      `--------------------\n` +
      `Auto-Commenter: bottom=${result.autoCommenterPosition.bottom}px, right=${result.autoCommenterPosition.right}px\n` +
      `Status Toggle: bottom=${result.statusTogglePosition.bottom}px, right=${result.statusTogglePosition.right}px\n` +
      `Distance between centers: ${Math.round(result.distance)}px\n` +
      `Overlapping: ${result.overlapping ? 'YES - PROBLEM!' : 'No - Good!'}`
    );
  }
  
  // Export functions to global scope so they can be called from console
  window.testPositioning = {
    check: checkButtonPositioning,
    visualize: visualizePositions
  };
  
  // Run check after a short delay to ensure both buttons are rendered
  setTimeout(visualizePositions, 3000);
  
  console.log("Positioning test script loaded. Use testPositioning.check() or testPositioning.visualize() to run tests.");
})();
