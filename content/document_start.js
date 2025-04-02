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

// 滚动元素到x中心
function scrollElementToXCenter(ele) {
  const maxScrollX = ele.scrollWidth - ele.clientWidth;
  console.log('最大可滚动距离:', maxScrollX);
  if (maxScrollX <= 0) return;
  ele.scrollLeft = maxScrollX / 2;
}

async function fullPageScreenshot(scrollSpeed = 0.2) {
  // This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.
  if (scrollSpeed < 0.5) {
    scrollSpeed = 0.5;
  }
  const scrollEle = getScrollableElementAtCenter();
  scrollElementToXCenter(scrollEle)

  // 获取页面总高度
  const eleScrollHeight = Math.max(
    scrollEle.scrollHeight,
  // document.body.scrollHeight,
  // document.documentElement.scrollHeight
  );
  const viewportHeight = window.innerHeight;
  // const viewportWidth = window.innerWidth;
  // const totalScrolls = Math.ceil(pageHeight / viewportHeight);
  const scrollStep = Math.ceil(viewportHeight * 0.8) || 1;

  const screenshots = [];

  // 保存原始滚动位置以便之后恢复
  const originalScrollPosition = scrollEle.scrollTop;
  const maxScrollPosition = eleScrollHeight - scrollEle.clientHeight;

  let i = 0;
  let endHeight = 0;
  let currentScrollPosition = 0;
  while (true) {
    endHeight += viewportHeight;
    // 更新进度
    console.log(currentScrollPosition, eleScrollHeight);
    updateProgress((currentScrollPosition / eleScrollHeight));

    // 滚动到指定位置
    scrollEle.scrollTo(0, currentScrollPosition);

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
    canvas.height = viewportHeight;
    // canvas.height = Math.min(viewportHeight, eleScrollHeight - i * scrollStep);
    const ctx = canvas.getContext('2d');
    console.log(currentScrollPosition);//ahui123
    ctx.drawImage(img, 0, 0);
    console.log(currentScrollPosition);//ahui123

    // if (i == 1) {
    //   const dataUrl = canvas.toDataURL('image/png');
    //   return { success: true, dataUrl: dataUrl };
    // }
    screenshots.push(canvas);
    i++;
    if (currentScrollPosition >= maxScrollPosition) {
      break;
    } else {
      currentScrollPosition += scrollStep;
    }
  }

  // 恢复原始滚动位置
  window.scrollTo(0, originalScrollPosition);

  // 创建一个完整的画布来拼接所有截图
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = document.documentElement.offsetWidth;
  fullCanvas.height = endHeight; // eleScrollHeight;
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

// 获取屏幕中心点坐标处的可滚动元素
function getScrollableElementAtCenter() {
  // 计算屏幕中心点坐标
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // 获取中心点位置的元素
  let element = document.elementFromPoint(centerX, centerY);

  // 向上遍历DOM树，查找第一个可滚动的元素
  while (element && element !== document.documentElement) {
    // 获取元素的计算样式
    const style = window.getComputedStyle(element);
    const overflowY = style.getPropertyValue('overflow-y');
    const overflowX = style.getPropertyValue('overflow-x');

    // 检查元素是否可滚动
    const isScrollableY = ['auto', 'scroll'].includes(overflowY) &&
      element.scrollHeight > element.clientHeight;
    const isScrollableX = ['auto', 'scroll'].includes(overflowX) &&
      element.scrollWidth > element.clientWidth;

    if (isScrollableY) {
      return element;
    }

    // 向上移动到父元素
    element = element.parentElement;
  }

  // 如果没有找到可滚动元素，返回默认的滚动元素
  return document.scrollingElement || document.documentElement;
}
