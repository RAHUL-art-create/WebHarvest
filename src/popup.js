let extractedData = null;

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  setTimeout(() => notification.className = 'notification', 3000);
}

function updateButtonStates(enabled) {
  ['copy', 'download', 'preview'].forEach(id => 
    document.getElementById(id).disabled = !enabled
  );
}

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) {
    switch(e.key.toLowerCase()) {
      case 'e':
        e.preventDefault();
        document.getElementById('extract').click();
        break;
      case 'c':
        e.preventDefault();
        document.getElementById('copy').click();
        break;
      case 'd':
        e.preventDefault();
        document.getElementById('download').click();
        break;
      case 'p':
        e.preventDefault();
        document.getElementById('preview').click();
        break;
    }
  }
});

function showLoading(show = true) {
  document.getElementById('loading').classList.toggle('active', show);
}

// Extract button click handler
document.getElementById('extract').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('No active tab found');

    updateButtonStates(false);
    showNotification('Extracting content...');
    showLoading(true);

    // Execute content script directly
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError);
    }

  } catch (error) {
    showNotification(error.message, 'error');
    console.error('Extraction error:', error);
  } finally {
    showLoading(false);
  }
});

// Copy button click handler
document.getElementById('copy').addEventListener('click', async () => {
  try {
    const content = document.getElementById('results').textContent;
    await navigator.clipboard.writeText(content);
    showNotification('Copied to clipboard!');
  } catch (error) {
    showNotification('Failed to copy', 'error');
  }
});

// Download button click handler
document.getElementById('download').addEventListener('click', () => {
  if (!extractedData) return;
  
  const activeTab = document.querySelector('.tab.active');
  const type = activeTab.dataset.type;
  const content = document.getElementById('results').textContent;
  
  const blob = new Blob([content], { 
    type: type === 'css' ? 'text/css' : 'text/html' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `extracted-${type}-${Date.now()}.${type === 'css' ? 'css' : 'html'}`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('File downloaded!');
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (extractedData) {
      displayData(tab.dataset.type);
    }
  });
});

function displayData(type) {
  if (!extractedData) return;
  
  const resultsDiv = document.getElementById('results');
  let content = '';
  
  try {
    switch (type) {
      case 'js':
        content = extractedData.scripts
          .filter(script => {
            const isFrameworkScript = extractedData.frameworks.some(framework =>
              script.src?.toLowerCase().includes(framework.name.toLowerCase()) ||
              script.content?.includes(framework.name)
            );
            return !isFrameworkScript;
          })
          .map(script => {
            if (script.type === 'external') {
              return `/* External script: ${script.src} */\n${script.content || '// Content not available'}`;
            }
            return `/* Inline script */\n${script.content}`;
          }).join('\n\n');
        break;

      case 'react':
      case 'vue':
      case 'angular':
      case 'jquery':
      case 'bootstrap':
      case 'tailwind':
        const framework = extractedData.frameworks.find(f => 
          f.name.toLowerCase() === type
        );
        if (framework) {
          content = `/* ${framework.name} v${framework.version} */\n\n`;
          const frameworkScripts = extractedData.scripts
            .filter(script => 
              script.src?.toLowerCase().includes(type) || 
              script.content?.includes(framework.name)
            );
          
          if (frameworkScripts.length > 0) {
            content += frameworkScripts
              .map(script => script.content || `// External: ${script.src}`)
              .join('\n\n');
          } else {
            content += `// No ${framework.name}-specific code found`;
          }
        }
        break;

      case 'html':
        content = extractedData.html;
        break;
      case 'css':
        content = extractedData.styles.map(style => 
          style.type === 'external' ? 
            `/* External stylesheet: ${style.href} */\n@import url('${style.href}');` : 
            style.content
        ).join('\n\n');
        break;
      case 'all':
        content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${extractedData.title || 'Extracted Page'}</title>
    <base href="${extractedData.url}">
    ${extractedData.styles.map(style => 
      style.type === 'external' ? 
        `<link rel="stylesheet" href="${style.href}">` :
        `<style>\n${style.content}\n</style>`
    ).join('\n')}
</head>
<body>
${extractedData.html}
</body>
</html>`;
        break;
    }
    
    resultsDiv.textContent = content;
  } catch (error) {
    resultsDiv.textContent = `Error: ${error.message}`;
    showNotification(error.message, 'error');
  }
}

// Add this function to create framework checkboxes
function createFrameworkCheckboxes(frameworks) {
  const frameworkCheckboxes = document.getElementById('framework-checkboxes');
  frameworkCheckboxes.innerHTML = '';

  frameworks.forEach(framework => {
    const label = document.createElement('label');
    label.className = 'framework-checkbox';
    label.setAttribute('data-tooltip', `Extract ${framework.name} code`);
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `extract-${framework.name.toLowerCase()}`;
    checkbox.checked = true; // Check by default
    
    const text = document.createTextNode(
      `${framework.name} `
    );
    
    const version = document.createElement('span');
    version.className = 'framework-version';
    version.textContent = framework.version;
    
    label.appendChild(checkbox);
    label.appendChild(text);
    label.appendChild(version);
    frameworkCheckboxes.appendChild(label);

    // Add change event listener
    checkbox.addEventListener('change', () => {
      const tab = document.querySelector(
        `.tab[data-type="${framework.name.toLowerCase()}"]`
      );
      if (tab) {
        tab.style.display = checkbox.checked ? '' : 'none';
      }
    });
  });
}

// Add this function to create framework tabs
function createFrameworkTabs(frameworks) {
  const frameworkTabs = document.getElementById('framework-tabs');
  frameworkTabs.innerHTML = '';

  frameworks.forEach(framework => {
    const tab = document.createElement('div');
    tab.className = 'framework-tab';
    tab.dataset.type = framework.name.toLowerCase();
    tab.innerHTML = `${framework.name}<span class="framework-version">${framework.version}</span>`;
    
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab, .framework-tab').forEach(t => 
        t.classList.remove('active')
      );
      tab.classList.add('active');
      displayData(framework.name.toLowerCase());
    });

    frameworkTabs.appendChild(tab);
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.error) {
    showNotification(request.error, 'error');
    return;
  }
  
  extractedData = request;
  
  // Create framework checkboxes and tabs if frameworks were detected
  if (request.frameworks && request.frameworks.length > 0) {
    createFrameworkCheckboxes(request.frameworks);
    createFrameworkTabs(request.frameworks);
  }
  
  const activeTab = document.querySelector('.tab.active');
  displayData(activeTab.dataset.type);
  updateButtonStates(true);
  showNotification('Extraction complete!');
});

// Update the preview button handler
document.getElementById('preview').addEventListener('click', () => {
  if (!extractedData) {
    showNotification('Extract content first!', 'error');
    return;
  }

  const activeTab = document.querySelector('.tab.active, .framework-tab.active');
  const type = activeTab.dataset.type;
  let previewContent = '';

  try {
    switch (type) {
      case 'all':
        // Full page preview with all components
        previewContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${extractedData.title || 'Preview'}</title>
            <base href="${extractedData.url}">
            ${extractedData.styles.map(style => 
              style.type === 'external' ? 
                `<link rel="stylesheet" href="${style.href}">` :
                `<style>${style.content}</style>`
            ).join('\n')}
            ${extractedData.scripts.map(script => 
              script.type === 'external' ? 
                `<script src="${script.src}"></script>` :
                `<script>${script.content}</script>`
            ).join('\n')}
          </head>
          <body>
            ${extractedData.html}
          </body>
          </html>`;
        break;

      case 'html':
        // HTML-only preview with basic styling
        previewContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HTML Preview</title>
            <style>
              body { padding: 20px; font-family: sans-serif; }
            </style>
          </head>
          <body>
            ${extractedData.html}
          </body>
          </html>`;
        break;

      case 'css':
        // CSS preview with sample elements
        previewContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CSS Preview</title>
            ${extractedData.styles.map(style => 
              style.type === 'external' ? 
                `<link rel="stylesheet" href="${style.href}">` :
                `<style>${style.content}</style>`
            ).join('\n')}
          </head>
          <body>
            ${extractedData.html}
          </body>
          </html>`;
        break;

      // Framework-specific previews
      case 'react':
      case 'vue':
      case 'angular':
      case 'jquery':
      case 'bootstrap':
      case 'tailwind':
        const framework = extractedData.frameworks.find(f => 
          f.name.toLowerCase() === type
        );
        
        if (framework) {
          // Include necessary framework dependencies
          const frameworkCDN = getFrameworkCDN(framework.name, framework.version);
          
          previewContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${framework.name} Preview</title>
              ${frameworkCDN.css || ''}
              ${frameworkCDN.js || ''}
              ${extractedData.styles.map(style => 
                style.type === 'external' ? 
                  `<link rel="stylesheet" href="${style.href}">` :
                  `<style>${style.content}</style>`
              ).join('\n')}
            </head>
            <body>
              ${extractedData.html}
              <script>
                ${extractedData.scripts
                  .filter(script => 
                    script.src?.toLowerCase().includes(type) || 
                    script.content?.includes(framework.name)
                  )
                  .map(script => script.content)
                  .join('\n')}
              </script>
            </body>
            </html>`;
        }
        break;

      default:
        previewContent = document.getElementById('results').textContent;
    }

    // Create blob and open preview in new tab
    const blob = new Blob([previewContent], { type: 'text/html' });
    const previewUrl = URL.createObjectURL(blob);
    
    chrome.tabs.create({ url: previewUrl }, (tab) => {
      URL.revokeObjectURL(previewUrl);
    });

  } catch (error) {
    showNotification('Preview generation failed: ' + error.message, 'error');
    console.error('Preview error:', error);
  }
});

// Helper function to get framework CDN links
function getFrameworkCDN(frameworkName, version) {
  const cdnLinks = {
    'React': {
      js: `
        <script crossorigin src="https://unpkg.com/react@${version}/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@${version}/umd/react-dom.development.js"></script>
      `
    },
    'Vue': {
      js: `<script src="https://unpkg.com/vue@${version}"></script>`
    },
    'Angular': {
      js: `
        <script src="https://ajax.googleapis.com/ajax/libs/angularjs/${version}/angular.min.js"></script>
      `
    },
    'jQuery': {
      js: `<script src="https://code.jquery.com/jquery-${version}.min.js"></script>`
    },
    'Bootstrap': {
      css: `<link href="https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.min.css" rel="stylesheet">`,
      js: `<script src="https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/js/bootstrap.bundle.min.js"></script>`
    },
    'Tailwind': {
      css: `<script src="https://cdn.tailwindcss.com"></script>`
    }
  };

  return cdnLinks[frameworkName] || { css: '', js: '' };
}

function createPreviewContent(data) {
  const previewContainer = document.createElement('div');
  previewContainer.className = 'preview-container';

  // Add frameworks and animations section
  if (data.frameworks && data.frameworks.length > 0) {
    const frameworksSection = document.createElement('div');
    frameworksSection.className = 'frameworks-section';
    
    data.frameworks.forEach(framework => {
      if (isAnimationFramework(framework)) {
        const animationPreview = createAnimationPreview(framework, data);
        frameworksSection.appendChild(animationPreview);
      }
    });

    previewContainer.appendChild(frameworksSection);
  }

  // Create animation playground
  const animationPlayground = createAnimationPlayground(data);
  previewContainer.appendChild(animationPlayground);

  return previewContainer;
}

function isAnimationFramework(framework) {
  const animationFrameworks = ['GSAP', 'Anime.js', 'Lottie', 'Three.js'];
  return animationFrameworks.includes(framework.name);
}

function createAnimationPreview(framework, data) {
  const container = document.createElement('div');
  container.className = 'animation-preview-card';

  const header = document.createElement('div');
  header.className = 'preview-header';
  header.innerHTML = `
    <h3>${framework.name}</h3>
    <span class="version">v${framework.version}</span>
  `;

  const previewArea = document.createElement('div');
  previewArea.className = 'preview-area';

  // Create animation controls
  const controls = document.createElement('div');
  controls.className = 'animation-controls';
  controls.innerHTML = `
    <button class="play-btn">Play</button>
    <button class="pause-btn">Pause</button>
    <button class="reset-btn">Reset</button>
  `;

  // Handle different animation types
  switch (framework.name) {
    case 'Lottie':
      createLottiePreview(previewArea, data);
      break;
    case 'GSAP':
      createGSAPPreview(previewArea, data);
      break;
    case 'Anime.js':
      createAnimePreview(previewArea, data);
      break;
    case 'Three.js':
      createThreeJSPreview(previewArea, data);
      break;
  }

  container.appendChild(header);
  container.appendChild(previewArea);
  container.appendChild(controls);

  return container;
}

function createAnimationPlayground(data) {
  const playground = document.createElement('div');
  playground.className = 'animation-playground';

  // Add CSS Animations
  const cssAnimations = extractCSSAnimations(data);
  if (cssAnimations.length > 0) {
    const cssSection = document.createElement('div');
    cssSection.className = 'css-animations-section';
    
    cssAnimations.forEach(animation => {
      const animationPreview = createCSSAnimationPreview(animation);
      cssSection.appendChild(animationPreview);
    });

    playground.appendChild(cssSection);
  }

  // Add interactive timeline
  const timeline = createAnimationTimeline(data);
  playground.appendChild(timeline);

  return playground;
}

function createLottiePreview(container, data) {
  // Find Lottie animations in the extracted data
  const lottieData = extractLottieAnimations(data);
  
  lottieData.forEach(animation => {
    const lottieContainer = document.createElement('div');
    lottieContainer.className = 'lottie-container';
    
    // Create Lottie player
    const player = document.createElement('lottie-player');
    player.src = animation.src;
    player.style.width = '100%';
    player.style.height = '100%';
    player.setAttribute('background', 'transparent');
    player.setAttribute('speed', '1');
    player.setAttribute('loop', '');
    player.setAttribute('autoplay', '');

    lottieContainer.appendChild(player);
    container.appendChild(lottieContainer);
  });
}

function createGSAPPreview(container, data) {
  const gsapAnimations = extractGSAPAnimations(data);
  
  gsapAnimations.forEach(animation => {
    const gsapContainer = document.createElement('div');
    gsapContainer.className = 'gsap-container';
    
    // Recreate GSAP animation
    const element = document.createElement('div');
    element.className = 'gsap-element';
    element.innerHTML = animation.targetHTML || '<div class="gsap-box"></div>';

    // Apply GSAP animation
    const animationCode = animation.code;
    const script = document.createElement('script');
    script.textContent = `
      try {
        ${animationCode}
      } catch (e) {
        console.error('GSAP animation error:', e);
      }
    `;

    gsapContainer.appendChild(element);
    gsapContainer.appendChild(script);
    container.appendChild(gsapContainer);
  });
}

function createAnimePreview(container, data) {
  const animeAnimations = extractAnimeAnimations(data);
  
  animeAnimations.forEach(animation => {
    const animeContainer = document.createElement('div');
    animeContainer.className = 'anime-container';
    
    // Recreate Anime.js animation
    const element = document.createElement('div');
    element.className = 'anime-element';
    element.innerHTML = animation.targetHTML || '<div class="anime-box"></div>';

    // Apply Anime.js animation
    const script = document.createElement('script');
    script.textContent = `
      try {
        ${animation.code}
      } catch (e) {
        console.error('Anime.js animation error:', e);
      }
    `;

    animeContainer.appendChild(element);
    animeContainer.appendChild(script);
    container.appendChild(animeContainer);
  });
}

function createThreeJSPreview(container, data) {
  const threeScenes = extractThreeJSScenes(data);
  
  threeScenes.forEach(scene => {
    const threeContainer = document.createElement('div');
    threeContainer.className = 'threejs-container';
    
    // Create canvas for Three.js
    const canvas = document.createElement('canvas');
    canvas.className = 'threejs-canvas';
    
    // Initialize Three.js scene
    const script = document.createElement('script');
    script.textContent = `
      try {
        ${scene.code}
      } catch (e) {
        console.error('Three.js scene error:', e);
      }
    `;

    threeContainer.appendChild(canvas);
    threeContainer.appendChild(script);
    container.appendChild(threeContainer);
  });
}

function extractCSSAnimations(data) {
  const animations = [];
  
  // Extract keyframe animations
  data.styles.forEach(style => {
    const keyframeRegex = /@keyframes\s+([^\s{]+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = keyframeRegex.exec(style.content)) !== null) {
      animations.push({
        name: match[1],
        keyframes: match[2],
        type: 'keyframe'
      });
    }
  });

  // Extract transition animations
  document.querySelectorAll('[style*="transition"], [style*="animation"]').forEach(element => {
    const styles = window.getComputedStyle(element);
    if (styles.transition !== 'all 0s ease 0s' || styles.animation !== 'none') {
      animations.push({
        element: element.cloneNode(true),
        transition: styles.transition,
        animation: styles.animation,
        type: 'transition'
      });
    }
  });

  return animations;
}

function createAnimationTimeline(data) {
  const timeline = document.createElement('div');
  timeline.className = 'animation-timeline';

  // Create timeline markers
  const markers = document.createElement('div');
  markers.className = 'timeline-markers';
  
  // Add animation events to timeline
  data.scripts.forEach(script => {
    if (script.animationRelated.hasAnimations) {
      const marker = document.createElement('div');
      marker.className = 'timeline-marker';
      marker.setAttribute('data-animation-type', getAnimationType(script));
      markers.appendChild(marker);
    }
  });

  timeline.appendChild(markers);
  return timeline;
}

// Helper functions to extract specific animation data
function extractLottieAnimations(data) {
  const animations = [];
  data.scripts.forEach(script => {
    if (script.animationRelated.hasLottie) {
      // Extract Lottie animation data
      const lottieDataRegex = /lottie\.loadAnimation\({([^}]+)}\)/g;
      let match;
      while ((match = lottieDataRegex.exec(script.content)) !== null) {
        try {
          const animationData = eval(`({${match[1]}})`);
          animations.push(animationData);
        } catch (e) {
          console.error('Error parsing Lottie animation:', e);
        }
      }
    }
  });
  return animations;
}

// Add similar extraction functions for GSAP, Anime.js, and Three.js
// ... (implementation of other extraction functions)

// Add styles for the preview
const style = document.createElement('style');
style.textContent = `
  .preview-container {
    padding: 20px;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .animation-preview-card {
    background: white;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .preview-area {
    min-height: 200px;
    border: 1px solid #eee;
    border-radius: 4px;
    margin-bottom: 10px;
    position: relative;
    overflow: hidden;
  }

  .animation-controls {
    display: flex;
    gap: 10px;
  }

  .animation-controls button {
    padding: 5px 15px;
    border-radius: 4px;
    border: none;
    background: #673AB7;
    color: white;
    cursor: pointer;
  }

  .animation-controls button:hover {
    background: #9C27B0;
  }

  .animation-timeline {
    height: 60px;
    background: #fff;
    border-radius: 4px;
    margin-top: 20px;
    position: relative;
  }

  .timeline-markers {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    height: 2px;
    background: #eee;
  }

  .timeline-marker {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #673AB7;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    cursor: pointer;
  }
`;

document.head.appendChild(style);
