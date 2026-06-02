import Link from "next/link";
import { BookOpen, X, ExternalLink, Mail } from "lucide-react";

const FOOTER_LINKS = {
  サービス: [
    { href: "/gallery", label: "ギャラリー" },
    { href: "/ranking", label: "ランキング" },
    { href: "/generate", label: "漫画を生成" },
  ],
  サポート: [
    { href: "/about", label: "Buzz Comicについて" },
    { href: "/terms", label: "利用規約" },
    { href: "/privacy", label: "プライバシーポリシー" },
    { href: "/contact", label: "お問い合わせ" },
  ],
  クリエイター: [
    { href: "/dashboard", label: "ダッシュボード" },
    { href: "/auth/register", label: "クリエイター登録" },
    { href: "/guide", label: "ガイド" },
  ],
};

const SOCIAL_LINKS = [
  { href: "https://x.com/buzzcomic", icon: X, label: "X (Twitter)" },
  { href: "https://github.com/buzzcomic", icon: ExternalLink, label: "GitHub" },
  { href: "mailto:hello@buzz-comic.app", icon: Mail, label: "Email" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Buzz<span className="text-blue-600">Comic</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              AIを活用してバズる漫画を誰でも簡単に生成・投稿・収益化できる次世代コミックプラットフォーム。
            </p>
            <div className="flex gap-3 mt-5">
              {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 py-6 dark:border-slate-800 sm:flex-row">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Buzz Comic. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              利用規約
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              プライバシー
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
