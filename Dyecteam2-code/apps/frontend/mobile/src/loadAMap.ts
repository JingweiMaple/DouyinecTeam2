/* eslint-disable @typescript-eslint/no-explicit-any */
// src/loadAMap.ts

// 换成你自己的 “Web端(JS API)” 的 key
const AMAP_KEY = "890f86e3886f8a00e418ad5682a1e668";

// 带上 Driving 插件
const AMAP_URL = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Driving`;

let amapPromise: Promise<any> | null = null;

export function loadAMap(): Promise<any> {
  if (amapPromise) return amapPromise;

  amapPromise = new Promise((resolve, reject) => {
    // 已经有全局 AMap 了，直接用
    if ((window as any).AMap) {
      resolve((window as any).AMap);
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = AMAP_URL;
    script.async = true;

    script.onload = () => {
      if ((window as any).AMap) {
        resolve((window as any).AMap);
      } else {
        reject(new Error("AMap 加载失败：未找到全局 AMap 对象"));
      }
    };

    script.onerror = () => {
      reject(new Error("AMap 脚本加载失败"));
    };

    document.body.appendChild(script);
  });

  return amapPromise;
}
