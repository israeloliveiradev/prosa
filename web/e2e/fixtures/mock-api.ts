import type { Page, Route, Request } from "@playwright/test";
import { matchRoute, mockUsers } from "../mocks/routes.mjs";

export interface MockApiOptions {
  persona?: "learner" | "pro" | "admin" | "new";
  dataset?: string;
  latencyMs?: number;
  logUnmocked?: boolean;
}

export interface ApiCallRecord {
  method: string;
  url: string;
  pathname: string;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
}

export class MockApiAdapter {
  private calls: ApiCallRecord[] = [];
  private overrides: Map<string, (route: Route, req: Request) => Promise<boolean>> = new Map();
  private unmockedCalls: string[] = [];
  public persona: "learner" | "pro" | "admin" | "new";
  public dataset: string;
  public latencyMs: number;
  public logUnmocked: boolean;

  constructor(private page: Page, options: MockApiOptions = {}) {
    this.persona = options.persona || "learner";
    this.dataset = options.dataset || "demo";
    this.latencyMs = options.latencyMs || 0;
    this.logUnmocked = options.logUnmocked || process.env.E2E_UNMOCKED === "log";
  }

  async install() {
    await this.page.route("**/api/v1/**", (route, req) => this.handleRoute(route, req));
    await this.page.route("**/health", (route, req) => this.handleRoute(route, req));
  }

  getCalls(method?: string, pathPrefix?: string): ApiCallRecord[] {
    return this.calls.filter((c) => {
      if (method && c.method.toUpperCase() !== method.toUpperCase()) return false;
      if (pathPrefix && !c.pathname.startsWith(pathPrefix)) return false;
      return true;
    });
  }

  getUnmocked(): string[] {
    return [...this.unmockedCalls];
  }

  override(method: string, pathPattern: string, handler: (route: Route, req: Request) => Promise<void>) {
    const key = `${method.toUpperCase()} ${pathPattern}`;
    this.overrides.set(key, async (route, req) => {
      await handler(route, req);
      return true;
    });
  }

  fail(method: string, pathPattern: string, status: number, error: string) {
    this.override(method, pathPattern, async (route) => {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error }),
      });
    });
  }

  private async handleRoute(route: Route, req: Request) {
    const url = new URL(req.url());
    const method = req.method().toUpperCase();
    const pathname = url.pathname;

    let body: any = null;
    const postData = req.postData();
    if (postData) {
      try {
        body = JSON.parse(postData);
      } catch {
        body = postData;
      }
    }

    this.calls.push({
      method,
      url: req.url(),
      pathname,
      body,
      headers: req.headers(),
      timestamp: Date.now(),
    });

    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs));
    }

    // Check overrides
    for (const [key, handler] of this.overrides.entries()) {
      const [oMethod, oPath] = key.split(" ");
      if (oMethod === method && (oPath === pathname || oPath === "*")) {
        const handled = await handler(route, req);
        if (handled) return;
      }
    }

    // Check routes.mjs
    const matched = matchRoute(method, pathname);
    if (matched) {
      try {
        const result = await matched.route.handler(
          {
            method,
            path: pathname,
            params: matched.params,
            query: url.searchParams,
            body,
            headers: req.headers() as any,
          },
          { persona: this.persona, dataset: this.dataset }
        );

        await route.fulfill({
          status: result.status || 200,
          contentType: "application/json",
          headers: result.headers as any,
          body: JSON.stringify(result.body ?? {}),
        });
        return;
      } catch (err: any) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: err.message || String(err) }),
        });
        return;
      }
    }

    // Unmocked route
    const unmockedKey = `${method} ${pathname}`;
    this.unmockedCalls.push(unmockedKey);

    if (this.logUnmocked) {
      console.warn(`[MockApi] UNMOCKED ROUTE: ${unmockedKey}`);
      // Return a permissive empty JSON or abort
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ unmocked: true, path: pathname }),
      });
    } else {
      await route.abort("failed");
    }
  }
}
