import Link from "next/link";
import { BookOpen, Search, Trophy } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-indigo-600 shrink-0">
          <BookOpen className="w-5 h-5" />
          <span>Buzz Comic</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <Link
            href="/gallery"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Search className="w-4 h-4" />
            ギャラリー
          </Link>
          <Link
            href="/ranking"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Trophy className="w-4 h-4" />
            ランキング
          </Link>
        </nav>
        {/* Mobile nav */}
        <nav className="flex sm:hidden items-center gap-1 ml-auto text-sm">
          <Link href="/gallery" className="p-2 rounded-md text-gray-600 hover:text-gray-900" aria-label="ギャラリー">
            <Search className="w-5 h-5" />
          </Link>
          <Link href="/ranking" className="p-2 rounded-md text-gray-600 hover:text-gray-900" aria-label="ランキング">
            <Trophy className="w-5 h-5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
