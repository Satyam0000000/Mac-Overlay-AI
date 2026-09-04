const chat = document.querySelector('#chat');
const message = document.querySelector('#message');
const imageInput = document.querySelector('#image');
const imageName = document.querySelector('#imageName');
const settings = document.querySelector('#settings');
const modelSelect = document.querySelector('#modelSelect');
const themeToggle = document.querySelector('#themeToggle');
const imagePreviewContainer = document.querySelector('#imagePreviewContainer');
const history = [];
let selectedImages = [];
let isWhiteText = false;
const captureButton = document.querySelector('#captureButton');

function updateImagePreviews() {
  imagePreviewContainer.innerHTML = '';
  if (selectedImages.length === 0) {
    imagePreviewContainer.style.display = 'none';
    imageName.textContent = 'No image';
    imageName.style.color = '#9da3b4';
    return;
  }
  imagePreviewContainer.style.display = 'flex';
  imageName.textContent = `${selectedImages.length} attached`;
  imageName.style.color = '#9da3b4';
  selectedImages.forEach((imgUrl, index) => {
    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'thumb-wrapper';
    const img = document.createElement('img');
    img.src = imgUrl;
    img.className = 'thumb-preview';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'thumb-delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = () => {
      selectedImages.splice(index, 1);
      updateImagePreviews();
    };
    thumbWrapper.appendChild(img);
    thumbWrapper.appendChild(deleteBtn);
    imagePreviewContainer.appendChild(thumbWrapper);
  });
}

if (captureButton) {
  captureButton.addEventListener('click', async () => {
    const idleLabel = '📸 Snap';
    try {
      captureButton.disabled = true;
      captureButton.textContent = 'Capturing…';
      const dataUrl = await window.overlay.captureScreen();
      if (!dataUrl) throw new Error('No image was returned from screen capture.');
      selectedImages.push(dataUrl);
      updateImagePreviews();
    } catch (error) {
      imageName.textContent = error.message || 'Unable to capture the screen.';
    } finally {
      captureButton.disabled = false;
      captureButton.textContent = idleLabel;
    }
  });
}

themeToggle.addEventListener('click', () => {
  isWhiteText = !isWhiteText;
  document.body.style.color = isWhiteText ? '#ffffff' : '#000000';
  document.querySelectorAll('header, button, input, textarea, select, .message, #imageName, .hint').forEach(el => {
    el.style.color = isWhiteText ? '#ffffff' : '#000000';
  });
});
function addMessage(role, text) {
  const node = document.createElement('div');
  node.className = `message ${role}`;
  node.textContent = text;
  node.style.color = isWhiteText ? '#ffffff' : '#000000';
  chat.append(node);
  chat.scrollTop = chat.scrollHeight;
}

async function fileToDataUrl(file) {
  if (!file) return null;
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
}

async function send() {
  const text = message.value.trim();
  if (!text && selectedImages.length === 0) return;

  const sendButton = document.querySelector('#send');
  message.disabled = true;
  sendButton.disabled = true;
  sendButton.textContent = "Sending...";

  const attachLabel = selectedImages.length > 0 ? `[${selectedImages.length} image(s) attached]` : '';
  addMessage('user', text ? `${text} ${attachLabel}` : attachLabel);

  // Create loading indicator for the AI
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai-loading';
  loadingDiv.id = 'current-loading-indicator';
  loadingDiv.innerHTML = `<span class="loading-dots">AI is thinking...</span>`;
  chat.appendChild(loadingDiv);
  chat.scrollTop = chat.scrollHeight;

  try {
    const model = modelSelect.value;
    const reply = await window.overlay.sendChat({ text, images: selectedImages, history, model });
    
    const activeLoading = document.getElementById('current-loading-indicator');
    if (activeLoading) activeLoading.remove();

    history.push({ role: 'user', text: text || 'Please analyze the attached images.' }, { role: 'assistant', text: reply });
    addMessage('assistant', reply);
    
    message.value = ''; 
    selectedImages = []; 
    updateImagePreviews();
    imageInput.value = ''; 
  } catch (error) {
    const activeLoading = document.getElementById('current-loading-indicator');
    if (activeLoading) activeLoading.remove();
    addMessage('assistant', `Error: ${error.message}`);
  } finally {
    message.disabled = false;
    sendButton.disabled = false;
    sendButton.textContent = "Send";
    message.focus();
    chat.scrollTop = chat.scrollHeight;
  }
}

document.querySelector('#send').addEventListener('click', send);
message.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } });
document.querySelector('#imageButton').addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', async () => {
  try {
    const file = imageInput.files[0];
    if (file) {
      const url = await fileToDataUrl(file);
      if (url) {
        selectedImages.push(url);
        updateImagePreviews();
      }
    }
  } catch (error) {
    imageName.textContent = error.message;
  }
});
document.querySelector('#settingsButton').addEventListener('click', () => {
  const isOpen = settings.classList.toggle('open');
  document.querySelector('#app').classList.toggle('settings-open', isOpen);
  document.querySelector('#settingsButton').textContent = isOpen ? 'Back' : 'Settings';
  if (isOpen) document.querySelector('#apiKey').focus();
});
document.querySelector('#saveKey').addEventListener('click', async () => { const status = document.querySelector('#status'); try { await window.overlay.saveKey(document.querySelector('#apiKey').value); document.querySelector('#apiKey').value = ''; status.textContent = 'Saved in macOS Keychain-encrypted storage.'; } catch (error) { status.textContent = error.message; } });
window.overlay.keyStatus().then(saved => { if (saved) document.querySelector('#status').textContent = 'A key is already saved.'; });

// Robust focus persistence script targeting the input field
window.addEventListener('DOMContentLoaded', () => {
  if (message) {
    // Force target focus when window focus event drops
    window.addEventListener('focus', () => {
      message.focus();
    });

    // Aggressive focus loop fallback to prevent background software from stealing input focus
    setInterval(() => {
      if (document.activeElement !== message) {
        message.focus();
      }
    }, 400); 
  }
});

// Automatically catch clipboard pastes inside the chat environment
document.addEventListener('paste', async (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  
  for (const item of items) {
      if (item.type.indexOf('image') === 0) {
      const blob = item.getAsFile();
      const file = new File([blob], 'pasted-screenshot.png', { type: blob.type });
      const url = await fileToDataUrl(file);
      if (url) {
      selectedImages.push(url);
      updateImagePreviews();
      }
      event.preventDefault();
      break;
    }
  }
});