import { DEMO_MODE } from "@/lib/demo";

// Demo Mode shows a simulated chooser unless switched off; a live deploy shows the button only once the
// Google provider is enabled in Firebase and this is set to "true".
const flag = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN;
export const GOOGLE_SIGNIN = flag ? flag === "true" : DEMO_MODE;
