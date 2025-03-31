// 监听扩展图标点击事件
// Waning: default_popup in manifest.json disables chrome.browserAction.onClicked
chrome.action.onClicked.addListener(async (tab) => {
  console.log('onClicked', tab);
  try {
    // 向content script发送消息
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'captureFullPage' });

    if (response.success) {
      // 创建下载
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;

      await chrome.downloads.download({
        url: response.dataUrl,
        filename: filename,
        saveAs: true
      });
    } else {
      console.error('Screenshot failed:', response.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}); 