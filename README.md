# Coffee Cart Express

Build a simple coffee shop ordering SPA using React + TypeScript + npm.

This is a specimen application for an automated test/fix harness.

MENU

- Espresso — $2.50 — options: size, milk

- Cappuccino — $4.00 — options: size, milk

- Latte — $4.50 — options: size, milk

- Filter Coffee — $3.00 — options: size, milk

- Cold Brew — $4.25 — options: size, milk

- Butter Croissant — $3.50 — no options

COFFEE OPTIONS

- Size: Small (+$0.00), Medium (+$0.50), Large (+$1.00)

- Default size: Small

- Milk: Whole, Oat, None

- Default milk: Whole

- Milk has no price effect.

- Butter Croissant has no size or milk options.

MONEY

- Store monetary values internally as integer cents, not floating-point dollars.

- Line total = (base price + size modifier) × quantity.

- Tax = Math.round(subtotal * 0.08).

- Total = subtotal + tax.

- Display every monetary value with exactly two decimal places.

- Examples: $2.50, $4.00, $4.50. Never display $4.5.

CART RULES

1. When the cart is empty, display exactly "Your cart is empty".

2. Checkout must be disabled when the cart is empty.

3. Adding the same item with identical options increments its quantity instead of creating another line.

4. Adding the same item with different options creates a separate cart line.

5. Quantity can never be below 1.

6. Decrementing an item whose quantity is 1 removes that line.

7. Display "Subtotal", "Tax", and "Total".

CHECKOUT

- Require a non-empty customer name.

- Require exactly 10 phone digits.

- Submit must remain disabled until the checkout information is valid.

- On successful submission, display exactly "Order confirmed".

- Generate an order number matching /^ORD-\d{6}$/.

- Display an itemized list of the order.

- Display a total matching the submitted cart total.

PERSISTENCE

- Persist the cart using localStorage.

- Use exactly this key: "coffee-cart-v1".

- Cart must survive a page reload, including selected options and quantities.

TESTABILITY

- Add useful data-testid attributes to all interactive elements that the automated Playwright tests will need to interact with.

- Keep the application behavior deterministic so it can be tested reliably.

SCOPE

- Build only the coffee ordering SPA.

- Do NOT add authentication, database, Supabase, payments, admin, inventory, email/SMS, order history, or other backend functionality.

- Do not add unnecessary features or animations.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25c08e08-4e83-4818-85dd-3dd2f75f20f1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
