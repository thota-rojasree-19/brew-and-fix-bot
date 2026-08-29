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
    setCart(loadCart());
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
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
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
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold" data-testid="order-confirmed">
          Order confirmed
        </h1>
        <p className="mt-2" data-testid="order-number">
          {order.orderNumber}
        </p>
        <p className="mt-1 text-muted-foreground">
          {order.customerName} — {order.phone}
        </p>
        <ul className="mt-4 space-y-1" data-testid="order-items">
          {order.lines.map((line) => (
            <li key={lineKey(line)} className="flex justify-between">
              <span>
                {describeLine(line)} × {line.quantity}
              </span>
              <span>{formatCents(lineTotalCents(line))}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t pt-3">
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCents(order.subtotalCents)}</span>
          </p>
          <p className="flex justify-between">
            <span>Tax</span>
            <span>{formatCents(order.taxCents)}</span>
          </p>
          <p className="flex justify-between font-bold" data-testid="order-total">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </p>
        </div>
        <button
          type="button"
          data-testid="new-order-button"
          className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => setOrder(null)}
        >
          Place another order
        </button>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Ordering screen
  // -------------------------------------------------------------------------
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">Coffee Shop</h1>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {/* Menu */}
        <section aria-label="Menu">
          <h2 className="text-xl font-semibold">Menu</h2>
          <ul className="mt-3 space-y-4">
            {MENU.map((item) => {
              const sel = getSelection(item.id);
              return (
                <li
                  key={item.id}
                  className="rounded-lg border p-4"
                  data-testid={`menu-item-${item.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span data-testid={`price-${item.id}`}>
                      {formatCents(item.basePriceCents)}
                    </span>
                  </div>

                  {item.hasOptions && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Size:</span>
                        {SIZES.map((s) => (
                          <label key={s.name} className="flex items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name={`size-${item.id}`}
                              data-testid={`size-${item.id}-${s.name.toLowerCase()}`}
                              checked={sel.size === s.name}
                              onChange={() => setSelection(item.id, { size: s.name })}
                            />
                            {s.name} (+{formatCents(s.modifierCents)})
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Milk:</span>
                        {MILKS.map((m) => (
                          <label key={m} className="flex items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name={`milk-${item.id}`}
                              data-testid={`milk-${item.id}-${m.toLowerCase()}`}
                              checked={sel.milk === m}
                              onChange={() => setSelection(item.id, { milk: m })}
                            />
                            {m}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                    data-testid={`add-${item.id}`}
                    onClick={() => addToCart(item)}
                  >
                    Add to cart
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Cart + checkout */}
        <section aria-label="Cart">
          <h2 className="text-xl font-semibold">Cart</h2>

          {cart.length === 0 ? (
            <p className="mt-3 text-muted-foreground" data-testid="cart-empty">
              Your cart is empty
            </p>
          ) : (
            <ul className="mt-3 space-y-3" data-testid="cart-lines">
              {cart.map((line) => {
                const key = lineKey(line);
                return (
                  <li
                    key={key}
                    className="rounded-lg border p-3"
                    data-testid={`cart-line-${key}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{describeLine(line)}</span>
                      <span data-testid={`line-total-${key}`}>
                        {formatCents(lineTotalCents(line))}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="h-7 w-7 rounded border"
                        data-testid={`decrement-${key}`}
                        onClick={() => decrement(key)}
                      >
                        −
                      </button>
                      <span data-testid={`quantity-${key}`}>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="h-7 w-7 rounded border"
                        data-testid={`increment-${key}`}
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

          <div className="mt-4 space-y-1 border-t pt-3">
            <p className="flex justify-between">
              <span>Subtotal</span>
              <span data-testid="subtotal">{formatCents(subtotalCents)}</span>
            </p>
            <p className="flex justify-between">
              <span>Tax</span>
              <span data-testid="tax">{formatCents(taxCents)}</span>
            </p>
            <p className="flex justify-between font-bold">
              <span>Total</span>
              <span data-testid="total">{formatCents(totalCents)}</span>
            </p>
          </div>

          <h2 className="mt-6 text-xl font-semibold">Checkout</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="customer-name" className="block text-sm">
                Name
              </label>
              <input
                id="customer-name"
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                data-testid="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="customer-phone" className="block text-sm">
                Phone (10 digits)
              </label>
              <input
                id="customer-phone"
                type="tel"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                data-testid="customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
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
