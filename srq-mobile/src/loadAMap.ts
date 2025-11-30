/* eslint-disable @typescript-eslint/no-explicit-any */
// src/loadAMap.ts

// 👉 把这里换成你自己的高德 Web JS API key
const AMAP_KEY = "890f86e3886f8a00e418ad5682a1e668";

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
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
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
