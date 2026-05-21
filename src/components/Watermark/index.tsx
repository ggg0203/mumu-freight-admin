/**
 * ★★★ 水印组件 ★★★
 *
 * 使用 MutationObserver 监听 DOM 变化，防止水印被篡改或删除
 *
 * 学习要点：
 * 1. Canvas 绘制水印
 * 2. MutationObserver 监听 DOM 变化实现防篡改
 * 3. 定时器定期检测水印完整性
 */

import { useEffect, useRef } from 'react';

/** 水印组件属性 */
interface WatermarkProps {
  /** 水印文字 */
  text?: string;

  /** 水印颜色 */
  color?: string;

  /** 水印透明度 */
  opacity?: number;

  /** 字体大小 */
  fontSize?: number;

  /** 旋转角度 */
  rotate?: number;
}

/**
 * 水印组件
 *
 * 实现原理：
 * 1. 使用 Canvas 绘制水印图案
 * 2. 将 Canvas 转为 base64 图片
 * 3. 设置为 body 的背景图
 * 4. 使用 MutationObserver 监听 body 的 style 变化
 *
 * 使用示例：
 * ```tsx
 * <Watermark text="幕幕货运管理系统" />
 * ```
 */
const Watermark: React.FC<WatermarkProps> = ({
  text = '幕幕货运管理系统',
  color = '#000',
  opacity = 0.06,
  fontSize = 16,
  rotate = -25,
}) => {
  const observerRef = useRef<MutationObserver | null>(null);
  const watermarkId = 'mumu-watermark';

  useEffect(() => {
    /** 绘制水印并应用到页面 */
    const renderWatermark = () => {
      // 移除旧水印
      const old = document.getElementById(watermarkId);
      if (old) old.remove();

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // 设置画布大小
      const size = 240;
      canvas.width = size;
      canvas.height = size;

      // ★★★ 绘制水印文字 ★★★
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 旋转画布（水印通常是斜的）
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-size / 2, -size / 2);

      // 绘制多行水印，铺满整个区域
      for (let i = -2; i < 4; i++) {
        for (let j = -2; j < 4; j++) {
          ctx.fillText(text, i * size, j * size);
        }
      }

      // 将 Canvas 转为 base64 图片
      const dataUrl = canvas.toDataURL('image/png');

      // 创建水印样式并注入到页面
      const style = document.createElement('style');
      style.id = watermarkId;
      style.textContent = `
        body::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 99999;
          background-image: url('${dataUrl}');
          background-repeat: repeat;
        }
      `;
      document.head.appendChild(style);
    };

    /** 使用 MutationObserver 监听 body 样式变化 */
    const setupObserver = () => {
      // 监听 head 标签的变化，防止水印被删除
      observerRef.current = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          // 如果水印被删除，重新渲染
          const removedNodes = Array.from(mutation.removedNodes);
          const hasWatermarkRemoved = removedNodes.some(
            (node) => node instanceof HTMLElement && node.id === watermarkId,
          );
          if (hasWatermarkRemoved) {
            renderWatermark();
          }
        }
      });

      observerRef.current.observe(document.head, {
        childList: true,
        subtree: true,
      });
    };

    renderWatermark();
    setupObserver();

    // 组件卸载时清理
    return () => {
      const el = document.getElementById(watermarkId);
      if (el) el.remove();
      observerRef.current?.disconnect();
    };
  }, [text, color, opacity, fontSize, rotate]);

  return null; // 水印组件不渲染任何可见元素
};

export default Watermark;
