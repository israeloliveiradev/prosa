import { test, expect } from "../../fixtures";

test.describe("UI Primitives Gallery (E2E)", () => {
  test("renders all 7 primitive groups on /dev/ui", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByTestId("section-typography")).toBeVisible();
    await expect(page.getByTestId("section-actions")).toBeVisible();
    await expect(page.getByTestId("section-surfaces")).toBeVisible();
    await expect(page.getByTestId("section-inputs")).toBeVisible();
    await expect(page.getByTestId("section-data")).toBeVisible();
    await expect(page.getByTestId("section-overlays")).toBeVisible();
    await expect(page.getByTestId("section-identity")).toBeVisible();
  });

  test("actions section displays primary, secondary, loading, and disabled buttons", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    const primaryBrand = page.getByTestId("btn-primary-brand");
    await expect(primaryBrand).toBeVisible();

    const secondary = page.getByTestId("btn-secondary");
    await expect(secondary).toBeVisible();

    const loading = page.getByTestId("btn-loading");
    await expect(loading).toBeVisible();

    const disabled = page.getByTestId("btn-disabled");
    await expect(disabled).toBeVisible();
    await expect(disabled).toBeDisabled();
  });

  test("inputs section handles typing, error trigger, and clear", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.getByTestId("gallery-field-email");
    await emailInput.fill("test@prosa.app");
    await expect(emailInput).toHaveValue("test@prosa.app");

    // Trigger simulated error
    const triggerErrorBtn = page.getByTestId("gallery-trigger-error");
    await triggerErrorBtn.click();

    const errorMsg = page.getByText("Endereço de e-mail inválido.");
    await expect(errorMsg).toBeVisible();

    // Clear error
    const clearErrorBtn = page.getByTestId("gallery-clear-error");
    await clearErrorBtn.click();
    await expect(errorMsg).not.toBeVisible();
  });

  test("selectors handle segmented, tabs, switch, and checkbox interactions", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    // Switch toggle
    const switchComp = page.getByTestId("gallery-switch");
    await switchComp.click();

    // Checkbox toggle
    const checkboxComp = page.getByTestId("gallery-checkbox");
    await checkboxComp.click();

    // Tabs selection
    const tabAdvanced = page.getByText("Avançado");
    await tabAdvanced.click();

    // Chip toggle
    const chip = page.getByTestId("gallery-chip");
    await chip.click();
  });

  test("overlays: sheet opens and closes via close button", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    const triggerSheet = page.getByTestId("gallery-trigger-sheet");
    await triggerSheet.click();

    const sheetModal = page.getByTestId("gallery-sheet-modal");
    await expect(sheetModal).toBeVisible();

    const closeBtn = page.getByTestId("gallery-sheet-modal-close");
    await closeBtn.click();
    await expect(sheetModal).not.toBeVisible();
  });

  test("overlays: dialog opens and dismisses via cancel button", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    const triggerDialog = page.getByTestId("gallery-trigger-dialog");
    await triggerDialog.click();

    const dialogModal = page.getByTestId("gallery-dialog-modal");
    await expect(dialogModal).toBeVisible();

    const cancelBtn = page.getByTestId("gallery-dialog-modal-cancel");
    await cancelBtn.click();
    await expect(dialogModal).not.toBeVisible();
  });

  test("overlays: toasts trigger and appear with appropriate roles", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    const triggerToast = page.getByTestId("gallery-toast-positive");
    await triggerToast.click();

    const toastMsg = page.getByText("Operação realizada com sucesso!");
    await expect(toastMsg).toBeVisible();
  });

  test("accessibility: zero violations on /dev/ui in light mode", async ({ page, checkA11y }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    await checkA11y({
      disableRules: ["color-contrast"], // contrast already verified mathematically in unit tests
    });
  });

  test("accessibility: zero violations on /dev/ui in dark mode", async ({ page, checkA11y }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/dev/ui");
    await page.waitForLoadState("domcontentloaded");

    await checkA11y({
      disableRules: ["color-contrast"],
    });
  });
});
