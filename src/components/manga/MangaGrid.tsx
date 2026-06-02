import MangaCard, { MangaCardData } from "./MangaCard";
import { cn } from "@/lib/utils";

interface MangaGridProps {
  mangas: MangaCardData[];
  className?: string;
  columns?: 2 | 3 | 4;
  emptyMessage?: string;
}

export default function MangaGrid({
  mangas,
  className,
  columns = 4,
  emptyMessage = "漫画が見つかりませんでした",
}: MangaGridProps) {
  if (mangas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-4">📭</span>
        <p className="text-base">{emptyMessage}</p>
      </div>
    );
  }

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  }[columns];

  return (
    <div className={cn(`grid gap-4 ${gridCols}`, className)}>
      {mangas.map((manga, index) => (
        <MangaCard
          key={manga.id}
          manga={manga}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
