document.getElementById('captureBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const scrollSpeed = parseFloat(document.getElementById('scrollSpeed').value);

  // 显示进度条
  const progressDiv = document.getElementById('progress');
  const progressFill = progressDiv.querySelector('.progress-fill');
  const progressText = progressDiv.querySelector('.progress-text');
  progressDiv.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '正在截图: 0%';

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'captureFullPage',
      scrollSpeed: scrollSpeed
    });

    if (response.success) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;

      await chrome.downloads.download({
        url: response.dataUrl,
        filename: filename,
        saveAs: true
      });
    } else {
      console.error('Screenshot failed:', response.error);
      showError(response.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('截图失败:' + (error?.message || error));
  } finally {
    // 隐藏进度条
    progressDiv.style.display = 'none';
  }
});

// 监听来自content script的进度更新
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'progress') {
    const progressDiv = document.getElementById('progress');
    const progressFill = progressDiv.querySelector('.progress-fill');
    const progressText = progressDiv.querySelector('.progress-text');

    const percentage = Math.round(message.progress * 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `正在截图: ${percentage}%`;
  }
}); 

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

