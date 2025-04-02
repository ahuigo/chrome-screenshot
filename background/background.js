// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureVisibleTab') {
    // 捕获当前可见的标签页
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
      sendResponse({ dataUrl: dataUrl });
    });
    return true; // 保持消息通道开放
  }
  if (request.action === 'captureTab') {// 捕获当前tab全部内容
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      chrome.debugger.attach({ tabId: tab.id }, '1.3', function () {
        chrome.debugger.sendCommand({ tabId: tab.id }, 'Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,  // 这个选项可以截取整个页面，包括不可见区域
          fromSurface: true
        }, function (response) {
          if (chrome.runtime.lastError) {
            console.error('截图失败:', chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError });
            return;
          }

          // 获取完整的截图 dataUrl
          const dataUrl = `data:image/png;base64,${response.data}`;
          sendResponse({ dataUrl: dataUrl });

          // 处理截图数据
          chrome.debugger.detach({ tabId: tab.id });
        });
      });
    });
    return true; // 保持消息通道开放
  }
});
