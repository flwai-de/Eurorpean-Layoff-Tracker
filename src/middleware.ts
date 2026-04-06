import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except api, admin, _next, files with extensions
    "/((?!api|admin|_next|.*\\..*).*)",
  ],
};
