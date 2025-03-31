// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureVisibleTab') {
    // 捕获当前可见的标签页
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
      sendResponse({ dataUrl: dataUrl });
    });
    return true; // 保持消息通道开放
  }
});
