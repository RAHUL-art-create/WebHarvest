function detectFrameworks() {
  const frameworks = [];

  // Enhanced React Detection
  if (
    document.querySelector('[data-reactroot], [data-reactid], [data-react-checksum]') || 
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
    Array.from(document.scripts).some(script => 
      script.src.includes('react') || 
      script.textContent.includes('React') ||
      script.textContent.includes('ReactDOM')) ||
    document.querySelector('[class*="react-"]')
  ) {
    frameworks.push({
      name: 'React',
      version: window.React ? window.React.version : 'Unknown',
      features: {
        hooks: !!document.querySelector('[data-reactroot]'),
        redux: !!window.__REDUX_DEVTOOLS_EXTENSION__,
        router: !!document.querySelector('[data-reactrouter]')
      }
    });
  }

  // Enhanced Vue Detection
  if (
    document.querySelector('[data-v-], [v-cloak], [v-show], [v-if]') ||
    window.__VUE__ ||
    Array.from(document.scripts).some(script => 
      script.src.includes('vue') || 
      script.textContent.includes('Vue') ||
      script.textContent.includes('createApp')) ||
    document.querySelector('.v-enter, .v-leave')
  ) {
    const vuexDetected = window.__VUEX__ || document.querySelector('[vuex]');
    frameworks.push({
      name: 'Vue',
      version: window.Vue ? window.Vue.version : 'Unknown',
      features: {
        vuex: !!vuexDetected,
        router: !!document.querySelector('[data-router-view]'),
        composition: !!document.querySelector('[data-v-app]')
      }
    });
  }

  // Enhanced Angular Detection
  if (
    document.querySelector('[ng-version], [ng-app], [ng-controller], [ng-model]') ||
    window.angular ||
    Array.from(document.scripts).some(script => 
      script.src.includes('angular') ||
      script.textContent.includes('NgModule')) ||
    document.querySelector('.ng-animate')
  ) {
    frameworks.push({
      name: 'Angular',
      version: document.querySelector('[ng-version]')?.getAttribute('ng-version') || 'Unknown',
      features: {
        animations: !!document.querySelector('.ng-animate'),
        material: !!document.querySelector('[mat-], [mdInput]'),
        forms: !!document.querySelector('[formGroup]')
      }
    });
  }

  // Enhanced Animation Libraries Detection
  const animationLibraries = detectAnimationLibraries();
  frameworks.push(...animationLibraries);

  // Enhanced CSS Framework Detection
  const cssFrameworks = detectCSSFrameworks();
  frameworks.push(...cssFrameworks);

  return frameworks;
}

function detectAnimationLibraries() {
  const libraries = [];

  // GSAP Detection
  if (
    window.gsap || 
    window.TweenMax || 
    window.TimelineMax ||
    document.querySelector('[data-gsap]') ||
    Array.from(document.scripts).some(script => 
      script.src.includes('gsap') || 
      script.textContent.includes('gsap'))
  ) {
    libraries.push({
      name: 'GSAP',
      version: window.gsap?.version || 'Unknown',
      features: {
        scrollTrigger: !!window.ScrollTrigger,
        morphSVG: !!window.MorphSVGPlugin,
        motionPath: !!window.MotionPathPlugin
      }
    });
  }

  // Anime.js Detection
  if (
    window.anime ||
    document.querySelector('[data-anime]') ||
    Array.from(document.scripts).some(script => 
      script.src.includes('anime') || 
      script.textContent.includes('anime'))
  ) {
    libraries.push({
      name: 'Anime.js',
      version: 'Detected'
    });
  }

  // Lottie Detection
  if (
    window.lottie ||
    document.querySelector('lottie-player, [data-lottie]') ||
    Array.from(document.scripts).some(script => 
      script.src.includes('lottie') || 
      script.textContent.includes('lottie'))
  ) {
    libraries.push({
      name: 'Lottie',
      version: 'Detected',
      features: {
        webPlayer: !!document.querySelector('lottie-player'),
        bodymovin: !!window.bodymovin
      }
    });
  }

  // Three.js Detection
  if (
    window.THREE ||
    document.querySelector('canvas:not([data-engine])') ||
    Array.from(document.scripts).some(script => 
      script.src.includes('three') || 
      script.textContent.includes('THREE'))
  ) {
    libraries.push({
      name: 'Three.js',
      version: window.THREE?.REVISION || 'Unknown'
    });
  }

  return libraries;
}

function detectCSSFrameworks() {
  const frameworks = [];

  // Enhanced Bootstrap Detection
  if (
    document.querySelector('[class*="bootstrap"], .btn, .container-fluid') ||
    Array.from(document.styleSheets).some(sheet => 
      sheet.href?.includes('bootstrap')) ||
    document.querySelector('.carousel, .modal, .navbar-toggler')
  ) {
    frameworks.push({
      name: 'Bootstrap',
      version: document.querySelector('link[href*="bootstrap"]')?.href.match(/\d+\.\d+\.\d+/) || 'Detected',
      features: {
        grid: !!document.querySelector('.row'),
        components: !!document.querySelector('.navbar'),
        utilities: !!document.querySelector('[class*="bg-"], [class*="text-"]')
      }
    });
  }

  // Enhanced Tailwind Detection
  if (
    document.querySelector('[class*="tw-"], [class*="space-y-"]') ||
    Array.from(document.styleSheets).some(sheet => 
      sheet.href?.includes('tailwind')) ||
    document.querySelector('[class*="grid-cols-"], [class*="flex-"]')
  ) {
    frameworks.push({
      name: 'Tailwind',
      version: 'Detected',
      features: {
        jit: !!document.querySelector('[class*="arbitrary-"]'),
        plugins: detectTailwindPlugins()
      }
    });
  }

  return frameworks;
}

function detectTailwindPlugins() {
  return {
    forms: !!document.querySelector('[type="checkbox"].form-checkbox'),
    typography: !!document.querySelector('.prose'),
    aspectRatio: !!document.querySelector('[class*="aspect-"]'),
    lineClamp: !!document.querySelector('[class*="line-clamp-"]')
  };
}

// Enhance the extractJavaScript function to capture animation-related code
async function extractJavaScript() {
  const scripts = [];
  
  // Extract inline scripts with animation detection
  document.querySelectorAll('script').forEach(script => {
    if (!script.src) {
      const content = script.textContent;
      const animationRelated = {
        hasAnimations: content.includes('animation') || 
                      content.includes('transition') ||
                      content.includes('keyframe') ||
                      content.includes('transform'),
        hasGSAP: content.includes('gsap') || content.includes('TweenMax'),
        hasAnime: content.includes('anime'),
        hasLottie: content.includes('lottie') || content.includes('bodymovin'),
        hasThreeJS: content.includes('THREE')
      };

      scripts.push({
        type: 'inline',
        content: content,
        animationRelated,
        attributes: Array.from(script.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      });
    }
  });

  // Extract external scripts
  const externalScripts = Array.from(document.querySelectorAll('script[src]'));
  for (const script of externalScripts) {
    try {
      const response = await fetch(script.src);
      const content = await response.text();
      const animationRelated = {
        hasAnimations: content.includes('animation') || 
                      content.includes('transition') ||
                      content.includes('keyframe') ||
                      content.includes('transform'),
        hasGSAP: content.includes('gsap') || content.includes('TweenMax'),
        hasAnime: content.includes('anime'),
        hasLottie: content.includes('lottie') || content.includes('bodymovin'),
        hasThreeJS: content.includes('THREE')
      };

      scripts.push({
        type: 'external',
        src: script.src,
        content: content,
        animationRelated,
        attributes: Array.from(script.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      });
    } catch (e) {
      scripts.push({
        type: 'external',
        src: script.src,
        error: e.message,
        attributes: Array.from(script.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      });
    }
  }

  return scripts;
}

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

    // Detect frameworks
    const frameworks = detectFrameworks();

    // Extract JavaScript
    const scripts = await extractJavaScript();

    // Send the complete data
    chrome.runtime.sendMessage({
      doctype,
      html: htmlElement.outerHTML,
      styles,
      scripts,
      frameworks,
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
