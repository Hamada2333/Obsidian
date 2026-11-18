import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold/80">404 · Event horizon</p>
      <h1 className="mt-4 font-display text-5xl text-fg">Lost beyond the horizon</h1>
      <p className="mt-3 max-w-sm text-sm text-fg-muted">This page fell into the black hole. Nothing escapes — except you.</p>
      <Link href="/" className="mt-8 rounded-full border border-gold/30 bg-gold/10 px-5 py-2 text-sm text-gold-soft hover:bg-gold/20">
        Return home
      </Link>
    </div>
  );
}
