import { Link } from "@/lib/i18n/routing";
import LocaleSwitcher from "./locale-switcher";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold text-white">
          Dimissio
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
