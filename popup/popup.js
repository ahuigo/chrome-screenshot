document.getElementById('captureBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const useCaptureTab = document.getElementById('useCaptureTab').checked;
  const scrollSpeed = parseFloat(document.getElementById('scrollSpeed').value);

  // 显示进度条
  const progressDiv = document.getElementById('progress');
  const progressFill = progressDiv.querySelector('.progress-fill');
  const progressText = progressDiv.querySelector('.progress-text');
  progressDiv.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '正在截图: 0%';

  try {
    let response;
    if (useCaptureTab) {
      // 使用captureTab
      response = await chrome.runtime.sendMessage({ action: 'captureTab' });
    } else {
      // 使用原有的滚动截图方式
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'captureFullPage',
        scrollSpeed: scrollSpeed
      });
    }

    if (response?.success || response?.dataUrl) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;

      // await chrome.downloads.download({
      //   url: response.dataUrl,
      //   filename: filename,
      //   saveAs: true
      // });
      chrome.tabs.create({ url: response.dataUrl });
    } else {
      showError(response.error);
      console.error('Screenshot failed:', response.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('截图失败:' + (error?.message || error));
  } finally {
    // 隐藏进度条
    progressDiv.style.display = 'none';
  }
});

// 监听下载事件
chrome.downloads.onChanged.addListener(function (downloadDelta) {
  console.log('下载状态变化:', downloadDelta);
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

// 监听复选框变化，控制速度输入框的显示/隐藏
document.getElementById('useCaptureTab').addEventListener('change', (e) => {
  const speedControl = document.getElementById('speedControl');
  speedControl.style.display = e.target.checked ? 'none' : 'flex';
});

