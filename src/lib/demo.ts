// Default on: the public build must never write unless explicitly switched off.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

// Public view-only account, printed on the login screen on purpose.
export const DEMO_ADMIN = { email: "admin@demo.com", password: "demo2026" };
export const DEMO_DISABLED_MESSAGE = "Action disabled in Demo Mode.";
