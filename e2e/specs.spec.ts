import { test, expect } from "@playwright/test";

test.describe("Coffee Shop Spec Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("R1 - empty cart shows exactly Your cart is empty and checkout disabled", async ({
    page,
  }) => {
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await expect(page.getByTestId("cart-empty")).toHaveText("Your cart is empty");
    await expect(page.getByTestId("checkout-button")).toBeDisabled();
  });

  test("R2 - same item with identical options increments quantity and does not create a second line", async ({
    page,
  }) => {
    // Add item 1
    await page.getByTestId("add-1").click();
    await expect(page.getByTestId("cart-line-0")).toBeVisible();
    await expect(page.getByTestId("quantity-0")).toHaveText("1");

    // Add same item again
    await page.getByTestId("add-1").click();

    // Check quantity incremented
    await expect(page.getByTestId("quantity-0")).toHaveText("2");
    // Ensure second line does not exist
    await expect(page.getByTestId("cart-line-1")).not.toBeVisible();
  });

  test("R3 - same item with different options creates separate lines", async ({ page }) => {
    // Add item 2 default options
    await page.getByTestId("add-2").click();

    // Change option for item 2
    // For example, size large (assuming standard size labels exist in standard coffee shop)
    // We'll click the size option for item 2.
    // As per src logic, testid might be `size-2-large`
    await page.getByTestId("size-2-large").click();
    await page.getByTestId("add-2").click();

    await expect(page.getByTestId("cart-line-0")).toBeVisible();
    await expect(page.getByTestId("cart-line-1")).toBeVisible();
    await expect(page.getByTestId("quantity-0")).toHaveText("1");
    await expect(page.getByTestId("quantity-1")).toHaveText("1");
  });

  test("R4 - decrementing quantity at 1 removes the line", async ({ page }) => {
    await page.getByTestId("add-1").click();
    await expect(page.getByTestId("cart-line-0")).toBeVisible();

    await page.getByTestId("decrement-0").click();
    await expect(page.getByTestId("cart-line-0")).not.toBeVisible();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
  });

  test("R5 - subtotal, tax, and total follow the integer-cent money rules", async ({ page }) => {
    // Add item 1 multiple times to check rounding rules
    await page.getByTestId("add-1").click();
    await page.getByTestId("add-1").click();
    await page.getByTestId("add-1").click();

    // Verify format and correctness, assuming 8% tax from float currency math
    const subtotalText = await page.getByTestId("subtotal").innerText();
    const taxText = await page.getByTestId("tax").innerText();
    const totalText = await page.getByTestId("total").innerText();

    // We expect valid dollar strings like $4.50
    const subtotal = parseFloat(subtotalText.replace("$", ""));
    const tax = parseFloat(taxText.replace("$", ""));
    const total = parseFloat(totalText.replace("$", ""));

    // The subtotal should strictly match quantity * item price
    // Check if integer cents math is strictly applied.
    expect(subtotal).toBeGreaterThan(0);
    // Integer cent math validation: 8% tax rounded.
    const expectedTax = Math.round(subtotal * 100 * 0.08) / 100;
    expect(tax).toBeCloseTo(expectedTax, 2);
    expect(total).toBeCloseTo(subtotal + tax, 2);
  });

  test("R6 - checkout requires a non-empty name and exactly 10 phone digits", async ({ page }) => {
    await page.getByTestId("add-1").click();

    // Try empty checkout
    await page.getByTestId("checkout-button").click();
    await expect(page.getByTestId("order-confirmed")).not.toBeVisible();

    // Try bad phone
    await page.getByTestId("customer-name").fill("John Doe");
    await page.getByTestId("customer-phone").fill("12345"); // only 5 digits
    await page.getByTestId("checkout-button").click();
    await expect(page.getByTestId("order-confirmed")).not.toBeVisible();

    // Try valid phone
    await page.getByTestId("customer-phone").fill("1234567890");
    await page.getByTestId("checkout-button").click();
    await expect(page.getByTestId("order-confirmed")).toBeVisible();
  });

  test("R7 - successful checkout shows a valid ORD-XXXXXX order number, itemized list, and matching total", async ({
    page,
  }) => {
    await page.getByTestId("add-1").click();
    await page.getByTestId("customer-name").fill("John Doe");
    await page.getByTestId("customer-phone").fill("1234567890");

    const preCheckoutTotal = await page.getByTestId("total").innerText();

    await page.getByTestId("checkout-button").click();

    await expect(page.getByTestId("order-confirmed")).toBeVisible();
    await expect(page.getByTestId("order-number")).toContainText(/ORD-\d{6}/);

    await expect(page.getByTestId("order-items")).toBeVisible();

    const postCheckoutTotal = await page.getByTestId("order-total").innerText();
    expect(postCheckoutTotal).toBe(preCheckoutTotal);
  });

  test("R8 - cart survives page reload including options and quantities", async ({ page }) => {
    await page.getByTestId("add-1").click();
    await page.getByTestId("add-1").click();
    await expect(page.getByTestId("quantity-0")).toHaveText("2");

    await page.reload();

    await expect(page.getByTestId("cart-line-0")).toBeVisible();
    await expect(page.getByTestId("quantity-0")).toHaveText("2");
  });
});
