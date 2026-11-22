import { test, expect } from "@playwright/test";
import { resolveRoute } from "@/navigation/resolve-route";

test.describe("Route Guard Resolution (Unit - Table 9.2)", () => {
  test("returns null when stores are not ready (ready = false)", () => {
    expect(
      resolveRoute({
        ready: false,
        signedIn: false,
        journeyDone: false,
        group: "app",
        pathname: "/practice",
      })
    ).toBeNull();

    expect(
      resolveRoute({
        ready: false,
        signedIn: true,
        journeyDone: false,
        group: "app",
        pathname: "/practice",
      })
    ).toBeNull();
  });

  test("redirects to /account when not signed in and targeting 'app' group", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: false,
        journeyDone: false,
        group: "app",
        pathname: "/",
      })
    ).toBe("/account");

    expect(
      resolveRoute({
        ready: true,
        signedIn: false,
        journeyDone: false,
        group: "app",
        pathname: "/memory",
      })
    ).toBe("/account");
  });

  test("redirects to /account when not signed in and targeting 'focus' group", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: false,
        journeyDone: false,
        group: "focus",
        pathname: "/daily",
      })
    ).toBe("/account");

    expect(
      resolveRoute({
        ready: true,
        signedIn: false,
        journeyDone: false,
        group: "focus",
        pathname: "/start",
      })
    ).toBe("/account");
  });

  test("returns null when not signed in and in 'public' group", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: false,
        journeyDone: false,
        group: "public",
        pathname: "/account",
      })
    ).toBeNull();

    expect(
      resolveRoute({
        ready: true,
        signedIn: false,
        journeyDone: false,
        group: "public",
        pathname: "/dev/ui",
      })
    ).toBeNull();
  });

  test("redirects to /start when signed in, journey NOT done, and targeting 'app' group (Decision D4)", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: false,
        group: "app",
        pathname: "/",
      })
    ).toBe("/start");

    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: false,
        group: "app",
        pathname: "/settings",
      })
    ).toBe("/start");

    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: false,
        group: "app",
        pathname: "/paywall",
      })
    ).toBe("/start");
  });

  test("returns null when signed in, journey NOT done, and in 'focus' group (/start and /placement accessible)", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: false,
        group: "focus",
        pathname: "/start",
      })
    ).toBeNull();

    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: false,
        group: "focus",
        pathname: "/placement",
      })
    ).toBeNull();
  });

  test("redirects to / when signed in, journey done, and accessing /account", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: true,
        group: "public",
        pathname: "/account",
      })
    ).toBe("/");
  });

  test("redirects to /start when signed in, journey NOT done, and accessing /account", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: false,
        group: "public",
        pathname: "/account",
      })
    ).toBe("/start");
  });

  test("returns null when signed in, journey done, and navigating app screens", () => {
    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: true,
        group: "app",
        pathname: "/",
      })
    ).toBeNull();

    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: true,
        group: "app",
        pathname: "/memory",
      })
    ).toBeNull();

    expect(
      resolveRoute({
        ready: true,
        signedIn: true,
        journeyDone: true,
        group: "focus",
        pathname: "/daily",
      })
    ).toBeNull();
  });

  test("a página pública /dossier/<token> abre com e sem sessão (como /cert)", () => {
    for (const path of ["/dossier/abc123", "/cert/abc123"]) {
      for (const signedIn of [false, true]) {
        expect(
          resolveRoute({ ready: true, signedIn, journeyDone: signedIn, group: "public", pathname: path }),
          path + " signedIn=" + signedIn,
        ).toBeNull();
      }
    }
  });
});
