/**
 * ★★★ 腾讯地图 JavaScript API GL (v1.exp) 类型定义 ★★★
 *
 * 命名空间: TMap
 * 坐标系: GCJ-02 (纬度, 经度)
 */

declare global {
  interface Window {
    TMap: typeof TMap;
  }

  /** 腾讯地图 GL API 主命名空间 */
  namespace TMap {
    /** 经纬度类 */
    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
      setLat(lat: number): void;
      setLng(lng: number): void;
    }

    /** 经纬度边界类 */
    class LatLngBounds {
      constructor();
      extend(latlng: LatLng): void;
      getCenter(): LatLng;
      isEmpty(): boolean;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
    }

    /** 地图实例 */
    class Map {
      constructor(container: HTMLElement, options?: MapOptions);
      setCenter(center: LatLng): void;
      getCenter(): LatLng;
      setZoom(zoom: number): void;
      getZoom(): number;
      setPitch(pitch: number): void;
      setRotation(rotation: number): void;
      setMapStyleId(styleId: string): void;
      fitBounds(bounds: LatLngBounds, options?: FitBoundsOptions): void;
      getBounds(): LatLngBounds;
      destroy(): void;
      on(event: string, handler: (evt: any) => void): void;
      off(event: string, handler: (evt: any) => void): void;
    }

    interface MapOptions {
      center: LatLng;
      zoom: number;
      pitch?: number;
      rotation?: number;
      mapStyleId?: string;
      baseMap?: BaseMap;
      draggable?: boolean;
      scrollwheel?: boolean;
      doubleClickZoom?: boolean;
      control?: MapControl;
    }

    interface BaseMap {
      type: 'vector' | 'satellite';
      features?: string[];
    }

    interface MapControl {
      zoom?: boolean;
      scale?: boolean;
      mapType?: boolean;
      rotate?: boolean;
    }

    interface FitBoundsOptions {
      padding?: number;
    }

    /** 标注样式 */
    class MarkerStyle {
      constructor(options: MarkerStyleOptions);
    }

    interface MarkerStyleOptions {
      width: number;
      height: number;
      anchor?: { x: number; y: number };
      src: string;
    }

    /** 多点标注 */
    class MultiMarker {
      constructor(options: MultiMarkerOptions);
      setMap(map: Map | null): void;
      setGeometries(geometries: MarkerGeometry[]): void;
      getGeometries(): MarkerGeometry[];
      on(event: string, handler: (evt: any) => void): void;
      off(event: string, handler: (evt: any) => void): void;
    }

    interface MultiMarkerOptions {
      map: Map;
      styles: Record<string, MarkerStyle>;
      geometries: MarkerGeometry[];
    }

    interface MarkerGeometry {
      id: string;
      styleId: string;
      position: LatLng;
      properties?: Record<string, any>;
    }

    /** 折线样式 */
    class PolylineStyle {
      constructor(options: PolylineStyleOptions);
    }

    interface PolylineStyleOptions {
      color: string;
      width: number;
      borderWidth?: number;
      lineCap?: 'butt' | 'round' | 'square';
      lineJoin?: 'miter' | 'round' | 'bevel';
    }

    /** 多段线 */
    class MultiPolyline {
      constructor(options: MultiPolylineOptions);
      setMap(map: Map | null): void;
      setGeometries(geometries: PolylineGeometry[]): void;
      getGeometries(): PolylineGeometry[];
    }

    interface MultiPolylineOptions {
      map: Map;
      styles: Record<string, PolylineStyle>;
      geometries: PolylineGeometry[];
    }

    interface PolylineGeometry {
      id: string;
      styleId: string;
      paths: LatLng[];
    }

    /** 信息窗口 */
    class InfoWindow {
      constructor(options: InfoWindowOptions);
      open(): void;
      close(): void;
      destroy(): void;
      setContent(content: string): void;
      setPosition(position: LatLng): void;
    }

    interface InfoWindowOptions {
      map: Map;
      position: LatLng;
      content: string;
      offset?: { x: number; y: number };
    }
  }
}

export {};
