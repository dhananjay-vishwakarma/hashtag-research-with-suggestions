// LinkedIn Content Analyzer
// Handles image and video content recognition for better commenting
(function() {
  // Configuration 
  const config = {
    enabled: true,
    analyzeImages: true,
    analyzeVideos: false, // Video analysis is more complex and may be implemented later
    debugMode: false
  };

  // Function to extract images from a post
  function extractImagesFromPost(postElement) {
    try {
      const images = [];
      
      // Find all image elements in the post
      const imageElements = postElement.querySelectorAll('.feed-shared-image__container img, .feed-shared-update-v2__content img');
      
      imageElements.forEach(imgElement => {
        if (imgElement && imgElement.src) {
          // Skip small icons and profile pictures
          const width = imgElement.width || imgElement.clientWidth;
          const height = imgElement.height || imgElement.clientHeight;
          
          if (width > 100 && height > 100) {
            images.push({
              src: imgElement.src,
              alt: imgElement.alt || 'Image in LinkedIn post',
              width: width,
              height: height
            });
          }
        }
      });
      
      return images;
    } catch (error) {
      console.error('Error extracting images from post:', error);
      return [];
    }
  }
  
  // Function to extract video information from post
  function extractVideoFromPost(postElement) {
    try {
      // Look for video elements or containers
      const videoElement = postElement.querySelector('.feed-shared-update-v2__content video, .feed-shared-video');
      
      if (!videoElement) return null;
      
      // Extract video information if available
      return {
        hasVideo: true,
        videoType: videoElement.classList.contains('feed-shared-linkedin-video') ? 'linkedin' : 'external'
      };
    } catch (error) {
      console.error('Error extracting video from post:', error);
      return null;
    }
  }
  
  // Determine if post is primarily visual content
  function isVisualContentPost(postElement) {
    // Check if post has substantial images
    const images = extractImagesFromPost(postElement);
    if (images.length > 0) return true;
    
    // Check if post has video
    const videoInfo = extractVideoFromPost(postElement);
    if (videoInfo && videoInfo.hasVideo) return true;
    
    return false;
  }
  
  // Get visual content description for AI context
  async function getVisualContentDescription(postElement) {
    try {
      let contentDescription = '';
      
      // Check for images
      const images = extractImagesFromPost(postElement);
      if (images.length > 0) {
        contentDescription += `This post contains ${images.length} image${images.length > 1 ? 's' : ''}.`;
        
        // Try to get alt text or other descriptive content
        images.forEach((img, index) => {
          if (img.alt && img.alt !== 'Image in LinkedIn post') {
            contentDescription += ` Image ${index + 1} description: "${img.alt}".`;
          }
        });
      }
      
      // Check for videos
      const videoInfo = extractVideoFromPost(postElement);
      if (videoInfo && videoInfo.hasVideo) {
        contentDescription += ` This post contains a ${videoInfo.videoType} video.`;
      }
      
      // Try to get any image captions from the post
      const captionElements = postElement.querySelectorAll('.feed-shared-inline-show-more-text, .feed-shared-update-v2__description-wrapper');
      captionElements.forEach(element => {
        if (element && element.textContent.trim()) {
          contentDescription += ` Caption text: "${element.textContent.trim()}".`;
        }
      });
      
      return contentDescription || 'This post contains visual content with no additional description available.';
    } catch (error) {
      console.error('Error analyzing visual content:', error);
      return 'This post appears to contain visual content.';
    }
  }
  
  // Export functions for use in other modules
  window.contentAnalyzer = {
    extractImagesFromPost,
    extractVideoFromPost,
    isVisualContentPost,
    getVisualContentDescription
  };
})();
