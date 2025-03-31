// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    // captureFullPage(request.scrollSpeed).then(sendResponse);
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
    // 滚动到指定位置
    window.scrollTo(0, i * viewportHeight);

    // 等待内容加载和渲染 (关键步骤)
    await new Promise(resolve => setTimeout(resolve, 1000 * scrollSpeed));

    // 使用html2canvas截取当前可见区域
    const canvas = await html2canvas(document.documentElement, {
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: viewportHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: i * viewportHeight,
      width: document.documentElement.offsetWidth,
      height: Math.min(viewportHeight, pageHeight - i * viewportHeight)
    });

    screenshots.push(canvas);
  }

  // 恢复原始滚动位置
  // window.scrollTo(0, originalScrollPosition);

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
  // return { success: false, error: error.message };
}

async function captureFullPage(scrollSpeed = 0.2) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // 获取页面尺寸
  const pageWidth = Math.max(
    document.documentElement.clientWidth,
    document.body.scrollWidth
  );
  const pageHeight = Math.max(
    document.documentElement.clientHeight,
    document.body.scrollHeight
  );

  // 设置canvas尺寸
  canvas.width = pageWidth;
  canvas.height = pageHeight;

  // 保存原始滚动位置
  const originalScrollPos = window.scrollY;

  try {
    // 滚动到顶部开始截图
    window.scrollTo(0, 0);

    // 等待一帧以确保滚动完成
    await new Promise(resolve => requestAnimationFrame(resolve));

    // 创建截图
    const dataUrl = await html2canvas(document.documentElement, {
      allowTaint: true, // show images?
      width: pageWidth,
      height: pageHeight,
      scrollY: 0,
      windowWidth: pageWidth,
      windowHeight: pageHeight,
      useCORS: true,
      logging: false,
      onclone: async (clonedDoc1) => {
        const clonedDoc = window.document;
        // 在克隆的文档中实现滚动
        const clonedWindow = clonedDoc.defaultView;
        const viewportHeight = clonedWindow.innerHeight;
        let currentScroll = 0;
        const totalPages = Math.ceil(pageHeight / viewportHeight);

        while (currentScroll < pageHeight) {
          // 更新进度
          const progress = currentScroll / pageHeight;
          updateProgress(progress);

          // 滚动一页
          currentScroll += viewportHeight;
          clonedWindow.scrollTo(0, currentScroll);

          // 等待指定的时间(让异步内容加载)
          await new Promise(resolve => setTimeout(resolve, 1000 * scrollSpeed));
          await waitForImages(clonedDoc);
        }

        // 确保进度显示100%
        updateProgress(1);
      }
    }).then(canvas => canvas.toDataURL('image/png'));

    return { success: true, dataUrl };
  } catch (error) {
    console.error('Screenshot failed:', error);
    return { success: false, error: error.message };
  } finally {
    // 恢复原始滚动位置
    window.scrollTo(0, originalScrollPos);
  }
} 

// 等待图片加载完成
async function waitForImages(doc) {
  const images = Array.from(doc.getElementsByTagName('img'));
  const imagePromises = images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
  });
  return Promise.all(imagePromises);
}