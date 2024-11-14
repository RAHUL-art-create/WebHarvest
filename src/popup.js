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

// Preview button handler
document.getElementById('preview').addEventListener('click', () => {
  if (!extractedData) {
    showNotification('Extract content first!', 'error');
    return;
  }

  const activeTab = document.querySelector('.tab.active');
  const content = document.getElementById('results').textContent;
  
  const blob = new Blob([content], { type: 'text/html' });
  const previewUrl = URL.createObjectURL(blob);
  
  chrome.tabs.create({ url: previewUrl }, (tab) => {
    URL.revokeObjectURL(previewUrl);
  });
});
