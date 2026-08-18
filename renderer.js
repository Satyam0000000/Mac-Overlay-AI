const chat = document.querySelector('#chat');
const message = document.querySelector('#message');
const imageInput = document.querySelector('#image');
const imageName = document.querySelector('#imageName');
const settings = document.querySelector('#settings');
const history = [];
let selectedImage = null;

function addMessage(role, text) {
  const node = document.createElement('div');
  node.className = `message ${role}`;
  node.textContent = text;
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
  if (!text && !selectedImage) return;

  const sendButton = document.querySelector('#send');
  message.disabled = true;
  sendButton.disabled = true;
  sendButton.textContent = "Sending...";

  addMessage('user', text || '[Image attached]');

  // Create loading indicator for the AI
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai-loading';
  loadingDiv.id = 'current-loading-indicator';
  loadingDiv.innerHTML = `<span class="loading-dots">AI is thinking...</span>`;
  chat.appendChild(loadingDiv);
  chat.scrollTop = chat.scrollHeight;

  try {
    const reply = await window.overlay.sendChat({ text, imageDataUrl: selectedImage, history });
    
    const activeLoading = document.getElementById('current-loading-indicator');
    if (activeLoading) activeLoading.remove();

    history.push({ role: 'user', text: text || 'Please analyze the attached image.' }, { role: 'assistant', text: reply });
    addMessage('assistant', reply);
    
    message.value = ''; 
    selectedImage = null; 
    imageInput.value = ''; 
    imageName.textContent = 'No image';
    imageName.style.color = "#9da3b4";
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
imageInput.addEventListener('change', async () => { try { selectedImage = await fileToDataUrl(imageInput.files[0]); imageName.textContent = imageInput.files[0]?.name || 'No image'; imageName.style.color = "#9da3b4"; } catch (error) { imageName.textContent = error.message; } });
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
    // Check if the pasted item is an image file (Screenshot)
    if (item.type.indexOf('image') === 0) {
      const blob = item.getAsFile();
      
      // Convert the clipboard image blob into a standard File Object array
      const file = new File([blob], "pasted-screenshot.png", { type: blob.type });
      
      // Reference your existing hidden file input element (id="image")
      const fileInput = document.getElementById('image');
      
      if (fileInput) {
        // Programmatically attach the pasted file straight into the file container
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        // Trigger the visual UI updates you already have coded for your file selector
        const eventChange = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(eventChange);
        
        // Visual indicator update matching your index.html layout rules
        const imageNameSpan = document.getElementById('imageName');
        if (imageNameSpan) {
          imageNameSpan.textContent = "Screenshot Pasted ✅";
          imageNameSpan.style.color = "#4ade80"; // Turn it green for success feedback
        }
      }
      
      // Stop the browser engine from trying to print blank text spaces into your input
      event.preventDefault();
      break;
    }
  }
});