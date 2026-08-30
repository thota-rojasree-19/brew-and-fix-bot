import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Coffee Shop — Order Online" },
      {
        name: "description",
        content:
          "Order espresso, cappuccino, latte, filter coffee, cold brew, and croissants online.",
      },
      { property: "og:title", content: "Coffee Shop — Order Online" },
      {
        property: "og:description",
        content:
          "Order espresso, cappuccino, latte, filter coffee, cold brew, and croissants online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoffeeShop,
});

// ---------------------------------------------------------------------------
// Domain model — all monetary values are integer cents.
// ---------------------------------------------------------------------------

type Size = "Small" | "Medium" | "Large";
type Milk = "Whole" | "Oat" | "None";

interface MenuItem {
  id: string;
  name: string;
  basePriceCents: number;
  hasOptions: boolean;
}

const MENU: MenuItem[] = [
  { id: "espresso", name: "Espresso", basePriceCents: 250, hasOptions: true },
  { id: "cappuccino", name: "Cappuccino", basePriceCents: 400, hasOptions: true },
  { id: "latte", name: "Latte", basePriceCents: 450, hasOptions: true },
  { id: "filter-coffee", name: "Filter Coffee", basePriceCents: 300, hasOptions: true },
  { id: "cold-brew", name: "Cold Brew", basePriceCents: 425, hasOptions: true },
  { id: "butter-croissant", name: "Butter Croissant", basePriceCents: 350, hasOptions: false },
];

const SIZES: { name: Size; modifierCents: number }[] = [
  { name: "Small", modifierCents: 0 },
  { name: "Medium", modifierCents: 50 },
  { name: "Large", modifierCents: 100 },
];

const MILKS: Milk[] = ["Whole", "Oat", "None"];

const SIZE_MODIFIER: Record<Size, number> = {
  Small: 0,
  Medium: 50,
  Large: 100,
};

interface CartLine {
  itemId: string;
  size: Size | null;
  milk: Milk | null;
  quantity: number;
}

interface ConfirmedOrder {
  orderNumber: string;
  customerName: string;
  phone: string;
  lines: CartLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

const CART_STORAGE_KEY = "coffee-cart-v1";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function lineUnitCents(line: CartLine): number {
  const item = MENU.find((m) => m.id === line.itemId);
  if (!item) return 0;
  const sizeMod = line.size ? SIZE_MODIFIER[line.size] : 0;
  return item.basePriceCents + sizeMod;
}

function lineTotalCents(line: CartLine): number {
  return lineUnitCents(line) * line.quantity;
}

function lineKey(line: CartLine): string {
  return `${line.itemId}|${line.size ?? ""}|${line.milk ?? ""}`;
}

function describeLine(line: CartLine): string {
  const item = MENU.find((m) => m.id === line.itemId);
  const name = item?.name ?? line.itemId;
  if (!line.size && !line.milk) return name;
  return `${name} (${line.size}, ${line.milk} milk)`;
}

function loadCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l.itemId === "string" &&
        typeof l.quantity === "number" &&
        l.quantity >= 1 &&
        MENU.some((m) => m.id === l.itemId),
    );
  } catch {
    return [];
  }
}

function generateOrderNumber(): string {
  const digits = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `ORD-${digits}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CoffeeShop() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [selections, setSelections] = useState<
    Record<string, { size: Size; milk: Milk }>
  >({});
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);

  useEffect(() => {
    const loaded = loadCart();
    setCart((prev) => {
      if (prev.length === 0) return loaded;
      const merged = [...loaded];
      for (const p of prev) {
        const idx = merged.findIndex((l) => lineKey(l) === lineKey(p));
        const existing = merged[idx];
        if (existing) {
          existing.quantity += p.quantity;
        } else {
          merged.push(p);
        }
      }
      return merged;
    });
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage failures
    }
  }, [cart, cartLoaded]);

  const subtotalCents = useMemo(
    () => cart.reduce((sum, line) => sum + lineTotalCents(line), 0),
    [cart],
  );
  const taxCents = Math.round(subtotalCents * 0.08);
  const totalCents = subtotalCents + taxCents;

  const getSelection = (itemId: string) =>
    selections[itemId] ?? { size: "Small" as Size, milk: "Whole" as Milk };

  const setSelection = (itemId: string, patch: Partial<{ size: Size; milk: Milk }>) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { ...getSelection(itemId), ...patch },
    }));
  };

  const addToCart = (item: MenuItem) => {
    const sel = getSelection(item.id);
    const line: CartLine = {
      itemId: item.id,
      size: item.hasOptions ? sel.size : null,
      milk: item.hasOptions ? sel.milk : null,
      quantity: 1,
    };
    setCart((prev) => {
      const idx = prev.findIndex((l) => lineKey(l) === lineKey(line));
      if (idx >= 0) {
        const existing = prev[idx];
        if (!existing) return prev;
        const next = [...prev];
        next[idx] = { ...existing, quantity: existing.quantity + 1 };
        return next;
      }
      return [...prev, line];
    });
  };

  const increment = (key: string) => {
    setCart((prev) =>
      prev.map((l) => (lineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l)),
    );
  };

  const decrement = (key: string) => {
    setCart((prev) =>
      prev
        .map((l) =>
          lineKey(l) === key ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity >= 1),
    );
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const checkoutValid = customerName.trim().length > 0 && phoneDigits.length === 10;

  const submitOrder = () => {
    if (!checkoutValid || cart.length === 0) return;
    setOrder({
      orderNumber: generateOrderNumber(),
      customerName: customerName.trim(),
      phone: phoneDigits,
      lines: cart,
      subtotalCents,
      taxCents,
      totalCents,
    });
    setCart([]);
    setCustomerName("");
    setPhone("");
  };

  // -------------------------------------------------------------------------
  // Confirmation screen
  // -------------------------------------------------------------------------
  if (order) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:px-6">
        <div className="rounded-2xl border bg-card p-6 shadow-lifted sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground">
            ✓
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight" data-testid="order-confirmed">
            Order confirmed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks, {order.customerName} — we'll text updates to {order.phone}.
          </p>
          <p
            className="mt-4 inline-block rounded-lg bg-secondary px-3 py-1.5 font-mono text-sm font-semibold tracking-wider text-secondary-foreground"
            data-testid="order-number"
          >
            {order.orderNumber}
          </p>

          <ul className="mt-6 divide-y" data-testid="order-items">
            {order.lines.map((line) => (
              <li key={lineKey(line)} className="flex items-baseline justify-between gap-4 py-3">
                <span>
                  {describeLine(line)}
                  <span className="text-muted-foreground"> × {line.quantity}</span>
                </span>
                <span className="font-medium tabular-nums">{formatCents(lineTotalCents(line))}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 rounded-xl bg-foam p-4 text-sm text-foam-foreground">
            <p className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCents(order.subtotalCents)}</span>
            </p>
            <p className="flex justify-between">
              <span>Tax</span>
              <span className="tabular-nums">{formatCents(order.taxCents)}</span>
            </p>
            <p className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums" data-testid="order-total">{formatCents(order.totalCents)}</span>
            </p>
          </div>

          <button
            type="button"
            data-testid="new-order-button"
            className="mt-8 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-card transition hover:brightness-110 active:scale-[0.99]"
            onClick={() => setOrder(null)}
          >
            Place another order
          </button>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Ordering screen
  // -------------------------------------------------------------------------
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-caramel">
          Freshly brewed, all day
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Coffee Shop
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Pick your drink, choose a size and milk, and we'll have it ready at the counter.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Menu */}
        <section aria-label="Menu">
          <h2 className="text-xl font-semibold">Menu</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {MENU.map((item, index) => {
              const sel = getSelection(item.id);
              return (
                <li
                  key={item.id}
                  className="flex flex-col rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-lifted"
                  data-testid={`menu-item-${index}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-display text-lg font-semibold leading-snug">
                      {item.name}
                    </span>
                    <span
                      className="rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold tabular-nums text-secondary-foreground"
                      data-testid={`price-${index}`}
                    >
                      {formatCents(item.basePriceCents)}
                    </span>
                  </div>

                  {item.hasOptions ? (
                    <div className="mt-4 space-y-3">
                      <fieldset>
                        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Size
                        </legend>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                          {SIZES.map((s) => (
                            <label
                              key={s.name}
                              className="flex cursor-pointer items-center gap-1.5 text-sm"
                            >
                              <input
                                type="radio"
                                name={`size-${item.id}`}
                                data-testid={`size-${index}-${s.name.toLowerCase()}`}
                                checked={sel.size === s.name}
                                onChange={() => setSelection(item.id, { size: s.name })}
                              />
                              {s.name}{" "}
                              <span className="text-muted-foreground">
                                (+{formatCents(s.modifierCents)})
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Milk
                        </legend>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                          {MILKS.map((m) => (
                            <label
                              key={m}
                              className="flex cursor-pointer items-center gap-1.5 text-sm"
                            >
                              <input
                                type="radio"
                                name={`milk-${item.id}`}
                                data-testid={`milk-${index}-${m.toLowerCase()}`}
                                checked={sel.milk === m}
                                onChange={() => setSelection(item.id, { milk: m })}
                              />
                              {m}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Baked fresh every morning.
                    </p>
                  )}

                  <button
                    type="button"
                    className="mt-auto w-full rounded-xl bg-primary px-3 py-2.5 pt-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:brightness-110 active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`add-${index}`}
                    onClick={() => addToCart(item)}
                    disabled={!cartLoaded}
                  >
                    Add to cart
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Cart + checkout */}
        <section
          aria-label="Cart"
          className="rounded-2xl border bg-card p-5 shadow-lifted sm:p-6 lg:sticky lg:top-6"
        >
          <h2 className="text-xl font-semibold">Cart</h2>

          {cart.length === 0 ? (
            <p
              className="mt-4 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
              data-testid="cart-empty"
            >
              Your cart is empty
            </p>
          ) : (
            <ul className="mt-4 space-y-3" data-testid="cart-lines">
              {cart.map((line, index) => {
                const key = lineKey(line);
                return (
                  <li
                    key={key}
                    className="rounded-xl bg-foam p-3.5 text-foam-foreground"
                    data-testid={`cart-line-${index}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium leading-snug">
                        {describeLine(line)}
                      </span>
                      <span
                        className="text-sm font-semibold tabular-nums"
                        data-testid={`line-total-${index}`}
                      >
                        {formatCents(lineTotalCents(line))}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="flex h-7 w-7 items-center justify-center rounded-full border bg-card text-base leading-none transition hover:bg-secondary active:scale-95"
                        data-testid={`decrement-${index}`}
                        onClick={() => decrement(key)}
                      >
                        −
                      </button>
                      <span
                        className="min-w-4 text-center text-sm font-semibold tabular-nums"
                        data-testid={`quantity-${index}`}
                      >
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="flex h-7 w-7 items-center justify-center rounded-full border bg-card text-base leading-none transition hover:bg-secondary active:scale-95"
                        data-testid={`increment-${index}`}
                        onClick={() => increment(key)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 space-y-1.5 border-t pt-4 text-sm">
            <p className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums" data-testid="subtotal">
                {formatCents(subtotalCents)}
              </span>
            </p>
            <p className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="tabular-nums" data-testid="tax">
                {formatCents(taxCents)}
              </span>
            </p>
            <p className="flex justify-between pt-1 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums" data-testid="total">
                {formatCents(totalCents)}
              </span>
            </p>
          </div>

          <h2 className="mt-7 text-xl font-semibold">Checkout</h2>
          <div className="mt-3 space-y-3.5">
            <div>
              <label htmlFor="customer-name" className="block text-sm font-medium">
                Name
              </label>
              <input
                id="customer-name"
                type="text"
                placeholder="Your name"
                className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                data-testid="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="customer-phone" className="block text-sm font-medium">
                Phone (10 digits)
              </label>
              <input
                id="customer-phone"
                type="tel"
                placeholder="5551234567"
                className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                data-testid="customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-card transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
              data-testid="checkout-button"
              disabled={cart.length === 0 || !checkoutValid}
              onClick={submitOrder}
            >
              Checkout
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
