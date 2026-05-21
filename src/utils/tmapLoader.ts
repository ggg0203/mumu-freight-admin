/**
 * ★★★ 腾讯地图 SDK 加载器 ★★★
 *
 * 共享给 MapContainer 和其他需要地图的组件使用
 */

const TENCENT_MAP_KEY = '7SZBZ-2FXK7-GXEX4-POKDI-CCD7F-CJFCX';
const SDK_TIMEOUT = 15000;

let sdkLoadPromise: Promise<void> | null = null;

/**
 * 加载腾讯地图 GL JS SDK
 * @param libraries 附加库（如 service）
 */
export const loadTencentMapSDK = (libraries = ''): Promise<void> => {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.TMap) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      sdkLoadPromise = null;
      reject(new Error(`腾讯地图 SDK 加载超时（${SDK_TIMEOUT / 1000}秒）`));
    }, SDK_TIMEOUT);

    const script = document.createElement('script');
    const libParam = libraries ? `&libraries=${libraries}` : '';
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}${libParam}`;
    script.async = true;
    script.onload = () => {
      let retries = 30;
      const waitForReady = () => {
        if (window.TMap) {
          clearTimeout(timeoutId);
          resolve();
        } else if (retries > 0) {
          retries--;
          setTimeout(waitForReady, 200);
        } else {
          sdkLoadPromise = null;
          clearTimeout(timeoutId);
          reject(new Error('腾讯地图 SDK 加载完成但初始化失败'));
        }
      };
      waitForReady();
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      sdkLoadPromise = null;
      reject(new Error('腾讯地图 SDK 加载失败，请检查网络'));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
};

/** 重置加载状态（用于重试） */
export const resetSDKLoad = () => {
  sdkLoadPromise = null;
};
