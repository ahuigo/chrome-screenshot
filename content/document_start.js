// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    captureFullPage(request.scrollSpeed).then(sendResponse);
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
      width: pageWidth,
      height: pageHeight,
      scrollY: 0,
      windowWidth: pageWidth,
      windowHeight: pageHeight,
      useCORS: true,
      logging: false,
      onclone: async (clonedDoc) => {
        // 在克隆的文档中实现滚动
        const clonedWindow = clonedDoc.defaultView;
        const viewportHeight = clonedWindow.innerHeight;
        let currentScroll = 0;
        const totalPages = Math.ceil(pageHeight / viewportHeight);

        while (currentScroll < pageHeight) {
          // 更新进度
          const progress = currentScroll / pageHeight;
          updateProgress(progress);

          // 等待指定的时间
          await new Promise(resolve => setTimeout(resolve, scrollSpeed * 1000));

          // 滚动一页
          currentScroll += viewportHeight;
          clonedWindow.scrollTo(0, currentScroll);

          // 等待内容加载
          await new Promise(resolve => setTimeout(resolve, 500));
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