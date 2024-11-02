async function extractContent() {
  try {
    // Function to make URLs absolute
    function makeAbsolute(url) {
      try {
        return new URL(url, window.location.href).href;
      } catch (e) {
        return url;
      }
    }

    // Get the complete document structure
    const doctype = document.doctype ? 
      new XMLSerializer().serializeToString(document.doctype) : 
      '<!DOCTYPE html>';

    // Create a deep clone of the document
    const documentClone = document.cloneNode(true);
    const htmlElement = documentClone.documentElement;

    // Function to get the full CSS selector path for an element
    function getFullSelector(element) {
      if (!element || element.nodeType !== 1) return '';
      
      const path = [];
      while (element && element.nodeType === 1) {
        let selector = element.tagName.toLowerCase();
        
        // Add id if exists
        if (element.id) {
          selector += `#${element.id}`;
          path.unshift(selector);
          break; // ID is unique, no need to go further up
        }
        
        // Add classes
        if (element.className && typeof element.className === 'string') {
          selector += `.${element.className.trim().replace(/\s+/g, '.')}`;
        }
        
        // Add position among siblings for better specificity
        const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          if (index > 1) selector += `:nth-child(${index})`;
        }
        
        path.unshift(selector);
        element = element.parentNode;
      }
      
      return path.join(' > ');
    }

    // Process elements and preserve layout structure
    function processElement(element, parentPath = '') {
      if (!element || element.nodeType !== 1) return;

      // Skip script tags
      if (element.tagName === 'SCRIPT') {
        element.remove();
        return;
      }

      const fullSelector = getFullSelector(element);
      const computed = window.getComputedStyle(element);
      const styles = {};

      // Layout properties to preserve
      const layoutProps = [
        // Box model
        'display', 'position', 'box-sizing', 'width', 'height',
        'margin', 'padding', 'border',
        
        // Flexbox
        'flex', 'flex-direction', 'flex-wrap', 'flex-flow',
        'justify-content', 'align-items', 'align-content',
        'gap', 'row-gap', 'column-gap',
        
        // Grid
        'grid-template-columns', 'grid-template-rows',
        'grid-column', 'grid-row', 'grid-area',
        
        // Positioning
        'top', 'right', 'bottom', 'left', 'z-index',
        'transform', 'transform-origin',
        
        // Typography
        'font-family', 'font-size', 'font-weight',
        'line-height', 'text-align', 'white-space',
        'color', 'background-color',
        
        // Visual
        'opacity', 'visibility', 'overflow',
        'box-shadow', 'border-radius',
        
        // Layout specific
        'float', 'clear', 'vertical-align',
        'list-style', 'table-layout'
      ];

      // Get computed styles
      layoutProps.forEach(prop => {
        const value = computed.getPropertyValue(prop);
        if (value && 
            value !== 'initial' && 
            value !== 'none' && 
            value !== 'normal' && 
            value !== 'auto' &&
            value !== '0px') {
          styles[prop] = value;
        }
      });

      // Apply layout styles inline
      if (Object.keys(styles).length > 0) {
        const styleStr = Object.entries(styles)
          .map(([prop, value]) => `${prop}: ${value} !important`)
          .join('; ');
        
        const currentStyle = element.getAttribute('style') || '';
        element.setAttribute('style', 
          `${currentStyle}${currentStyle ? '; ' : ''}${styleStr}`);
      }

      // Convert URLs to absolute
      Array.from(element.attributes || []).forEach(attr => {
        if (attr.name === 'src' || attr.name === 'href') {
          attr.value = makeAbsolute(attr.value);
        }
      });

      // Process children while maintaining hierarchy
      Array.from(element.children).forEach(child => {
        processElement(child, fullSelector);
      });
    }

    // Process the entire document
    processElement(htmlElement);

    // Extract and process styles
    const styles = [];
    
    // Process inline styles
    document.querySelectorAll('style').forEach(style => {
      let cssText = style.textContent
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .trim()
        // Convert relative URLs to absolute in CSS content
        .replace(/url\(['"]?([^'")\s]+)['"]?\)/g, 
          (match, url) => `url('${makeAbsolute(url)}')`);
      
      if (cssText) {
        styles.push({
          type: 'inline',
          content: cssText
        });
      }
    });

    // Process external stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      styles.push({
        type: 'external',
        href: makeAbsolute(link.href)
      });
    });

    // Extract JavaScript
    const scripts = [];
    document.querySelectorAll('script').forEach(script => {
      if (script.src) {
        scripts.push({
          type: 'external',
          src: makeAbsolute(script.src)
        });
      } else {
        scripts.push({
          type: 'inline',
          content: script.textContent
        });
      }
    });

    // Send the complete data
    chrome.runtime.sendMessage({
      doctype,
      html: htmlElement.outerHTML,
      styles,
      scripts,
      url: window.location.href,
      title: document.title
    });

  } catch (error) {
    chrome.runtime.sendMessage({
      error: error.message,
      stack: error.stack
    });
  }
}

// Execute when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractContent);
} else {
  extractContent();
}
