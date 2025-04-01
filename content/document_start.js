// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    fullPageScreenshot(request.scrollSpeed).then(sendResponse)
      .catch(e => {
        console.error(e);
        console.error(e?.message);
        sendResponse({ success: false, error: e.message });
      });
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
  // This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.
  if (scrollSpeed < 0.5) {
    scrollSpeed = 0.5;
  }
  // 获取页面总高度
  const pageHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const viewportHeight = window.innerHeight;
  // const totalScrolls = Math.ceil(pageHeight / viewportHeight);
  const scrollStep = Math.ceil(viewportHeight * 0.9) || 1;

  const screenshots = [];

  // 保存原始滚动位置以便之后恢复
  const originalScrollPosition = window.scrollY;
  let currentScrollPosition = 0;

  let i = 0;
  while (currentScrollPosition < pageHeight) {
    // 更新进度
    console.log(currentScrollPosition, pageHeight);
    updateProgress((currentScrollPosition / pageHeight));

    // 滚动到指定位置
    window.scrollTo(0, currentScrollPosition);

    // 等待内容加载和渲染 (关键步骤)
    await new Promise(resolve => setTimeout(resolve, 1000 * scrollSpeed));

    console.log(currentScrollPosition);//ahui123
    // 请求background脚本捕获当前可见区域
    const dataUrl = await new Promise(resolve => {
      chrome.runtime.sendMessage(
        { action: 'captureVisibleTab' },
        response => resolve(response.dataUrl)
      );
    });
    console.log(currentScrollPosition);//ahui123

    // 创建图像对象
    const img = await createImageFromDataUrl(dataUrl);

    // 创建画布并绘制捕获的内容
    console.log(currentScrollPosition);//ahui123
    const canvas = document.createElement('canvas');
    canvas.width = document.documentElement.offsetWidth;
    canvas.height = Math.min(viewportHeight, pageHeight - i * scrollStep);
    const ctx = canvas.getContext('2d');
    console.log(currentScrollPosition);//ahui123
    ctx.drawImage(img, 0, 0);
    console.log(currentScrollPosition);//ahui123

    screenshots.push(canvas);
    i++;
    currentScrollPosition += scrollStep;
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
    ctx.drawImage(screenshots[i], 0, i * scrollStep);
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
