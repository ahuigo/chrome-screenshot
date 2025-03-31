// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    fullPageScreenshot(request.scrollSpeed).then(sendResponse);
    return true; // 保持消息通道开放
  }
});

// 发送进度更新
function updateProgress(progress) {
  chrome.runtime.sendMessage({
    type: 'progress',
    progress: progress
  });
}

async function fullPageScreenshot(scrollSpeed = 0.2) {
  // 获取页面总高度
  const pageHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const viewportHeight = window.innerHeight;
  const totalScrolls = Math.ceil(pageHeight / viewportHeight);

  const screenshots = [];

  // 保存原始滚动位置以便之后恢复
  const originalScrollPosition = window.scrollY;

  for (let i = 0; i < totalScrolls; i++) {
    // 更新进度
    updateProgress((i / totalScrolls) * 100);

    // 滚动到指定位置
    window.scrollTo(0, i * viewportHeight);

    // 等待内容加载和渲染 (关键步骤)
    await new Promise(resolve => setTimeout(resolve, 1000 * scrollSpeed));

    // 请求background脚本捕获当前可见区域
    const dataUrl = await new Promise(resolve => {
      chrome.runtime.sendMessage(
        { action: 'captureVisibleTab' },
        response => resolve(response.dataUrl)
      );
    });

    // 创建图像对象
    const img = await createImageFromDataUrl(dataUrl);

    // 创建画布并绘制捕获的内容
    const canvas = document.createElement('canvas');
    canvas.width = document.documentElement.offsetWidth;
    canvas.height = Math.min(viewportHeight, pageHeight - i * viewportHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    screenshots.push(canvas);
  }

  // 恢复原始滚动位置
  window.scrollTo(0, originalScrollPosition);

  // 创建一个完整的画布来拼接所有截图
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = document.documentElement.offsetWidth;
  fullCanvas.height = pageHeight;
  const ctx = fullCanvas.getContext('2d');

  // 拼接所有截图
  for (let i = 0; i < screenshots.length; i++) {
    ctx.drawImage(screenshots[i], 0, i * viewportHeight);
  }

  const dataUrl = fullCanvas.toDataURL('image/png');
  return { success: true, dataUrl: dataUrl };
}

// 助手函数：从dataUrl创建Image对象
function createImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
