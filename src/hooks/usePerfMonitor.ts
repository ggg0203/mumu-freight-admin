/**
 * ★★★ usePerfMonitor - 性能采集 Hook ★★★
 *
 * 采集三个关键指标：
 * 1. FPS（requestAnimationFrame 时间戳）
 * 2. 内存占用（performance.memory）
 * 3. API 响应耗时（拦截 fetch）
 * 4. DOM 节点总数
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ApiTiming {
  url: string;
  duration: number;
  status: number;
  time: number;
}

export interface PerfData {
  fps: number;
  memoryMB: number;
  domCount: number;
  apiTimings: ApiTiming[];
}

/** 监控指标默认值 */
const INITIAL_DATA: PerfData = {
  fps: 60,
  memoryMB: 0,
  domCount: 0,
  apiTimings: [],
};

/** 采集间隔（ms） */
const SAMPLE_INTERVAL = 1000;

/**
 * 性能监控 Hook
 *
 * @example
 * ```tsx
 * const perf = usePerfMonitor();
 * // perf.fps, perf.memoryMB, perf.domCount, perf.apiTimings
 * ```
 */
export const usePerfMonitor = () => {
  const [data, setData] = useState<PerfData>(INITIAL_DATA);
  const apiTimingsRef = useRef<ApiTiming[]>([]);
  const frameTimesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number>(0);
  const originalFetchRef = useRef<typeof window.fetch | null>(null);

  // FPS 采集：记录每一帧的时间戳
  useEffect(() => {
    const tick = (timestamp: number) => {
      frameTimesRef.current.push(timestamp);
      // 保留最近 60 帧（约 1 秒）
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current = frameTimesRef.current.slice(-60);
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // 拦截 fetch 采集 API 耗时
  useEffect(() => {
    if (originalFetchRef.current) return; // 只拦截一次
    originalFetchRef.current = window.fetch;

    const patchedFetch: typeof window.fetch = (input, init) => {
      const start = performance.now();
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
      return originalFetchRef.current!.call(window, input, init).then(resp => {
        const duration = Math.round(performance.now() - start);
        apiTimingsRef.current.unshift({
          url: url.length > 50 ? url.slice(0, 50) + '...' : url,
          duration,
          status: resp.status,
          time: Date.now(),
        });
        // 最多保留 20 条
        if (apiTimingsRef.current.length > 20) {
          apiTimingsRef.current = apiTimingsRef.current.slice(0, 20);
        }
        return resp;
      }).catch(err => {
        const duration = Math.round(performance.now() - start);
        apiTimingsRef.current.unshift({
          url: url.length > 50 ? url.slice(0, 50) + '...' : url,
          duration,
          status: 0,
          time: Date.now(),
        });
        throw err;
      });
    };

    window.fetch = patchedFetch;

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, []);

  // 每秒采样一次
  useEffect(() => {
    const sample = () => {
      const times = frameTimesRef.current;
      let fps = 60;
      if (times.length >= 2) {
        const elapsed = times[times.length - 1] - times[0];
        fps = Math.round((times.length - 1) / (elapsed / 1000));
        if (!isFinite(fps) || fps < 0) fps = 60;
        if (fps > 120) fps = 120;
      }

      let memoryMB = 0;
      try {
        const mem = (performance as any).memory;
        if (mem?.usedJSHeapSize) {
          memoryMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
        }
      } catch { /* ignore */ }

      setData({
        fps,
        memoryMB,
        domCount: document.querySelectorAll('*').length,
        apiTimings: [...apiTimingsRef.current],
      });
    };

    const interval = setInterval(sample, SAMPLE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return data;
};

export default usePerfMonitor;
