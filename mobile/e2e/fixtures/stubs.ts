import type { Page } from "@playwright/test";

export async function installBrowserStubs(page: Page) {
  await page.addInitScript(() => {
    // 1. Audio / HTMLMediaElement
    try {
      if (typeof window !== "undefined" && window.HTMLMediaElement) {
        window.HTMLMediaElement.prototype.play = function () {
          const self = this;
          setTimeout(() => {
            self.dispatchEvent(new Event("play"));
            self.dispatchEvent(new Event("playing"));
            setTimeout(() => {
              self.dispatchEvent(new Event("ended"));
            }, 100);
          }, 10);
          return Promise.resolve();
        };
        window.HTMLMediaElement.prototype.pause = function () {
          this.dispatchEvent(new Event("pause"));
        };
        window.HTMLMediaElement.prototype.load = function () {
          this.dispatchEvent(new Event("loadeddata"));
        };
      }
    } catch (e) {
      console.warn("Could not stub HTMLMediaElement", e);
    }

    // 2. getUserMedia
    try {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          return dst.stream;
        };
      }
    } catch (e) {
      console.warn("Could not stub getUserMedia", e);
    }

    // 3. MediaRecorder
    try {
      if (typeof window !== "undefined") {
        (window as any).MediaRecorder = class MockMediaRecorder extends EventTarget {
          state = "inactive";
          start() {
            this.state = "recording";
            this.dispatchEvent(new Event("start"));
          }
          stop() {
            this.state = "inactive";
            const dummyBlob = new Blob(["mock audio data"], { type: "audio/webm" });
            const event: any = new Event("dataavailable");
            event.data = dummyBlob;
            this.dispatchEvent(event);
            this.dispatchEvent(new Event("stop"));
          }
          static isTypeSupported() {
            return true;
          }
        };
      }
    } catch (e) {
      console.warn("Could not stub MediaRecorder", e);
    }

    // 4. Clipboard
    try {
      if (navigator.clipboard) {
        (window as any).__copiedText = "";
        navigator.clipboard.writeText = async (text: string) => {
          (window as any).__copiedText = text;
          return Promise.resolve();
        };
        navigator.clipboard.readText = async () => {
          return (window as any).__copiedText || "";
        };
      }
    } catch (e) {
      console.warn("Could not stub clipboard", e);
    }
  });
}
