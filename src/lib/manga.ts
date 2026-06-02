import { prisma } from "./db";

export const GENRES = [
  { value: "all", label: "すべて" },
  { value: "action", label: "アクション" },
  { value: "romance", label: "ロマンス" },
  { value: "comedy", label: "コメディ" },
  { value: "horror", label: "ホラー" },
  { value: "sf", label: "SF" },
  { value: "general", label: "一般" },
] as const;

export type GenreValue = (typeof GENRES)[number]["value"];

export type SortType = "newest" | "popular" | "score";

export interface MangaListOptions {
  genre?: string;
  sort?: SortType;
  page?: number;
  pageSize?: number;
  search?: string;
}

const mangaSelect = {
  id: true,
  title: true,
  description: true,
  coverImageUrl: true,
  genre: true,
  score: true,
  totalViews: true,
  totalLikes: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
} as const;

export async function getPublishedMangas(options: MangaListOptions = {}) {
  const { genre, sort = "newest", page = 1, pageSize = 24, search } = options;

  const where = {
    status: "published",
    ...(genre && genre !== "all" ? { genre } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "popular"
      ? { totalViews: "desc" as const }
      : { score: "desc" as const };

  const [mangas, total] = await Promise.all([
    prisma.manga.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: mangaSelect,
    }),
    prisma.manga.count({ where }),
  ]);

  return { mangas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getMangaById(id: string) {
  return prisma.manga.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true, bio: true },
      },
      panels: {
        orderBy: { order: "asc" },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });
}

export async function getRelatedMangas(mangaId: string, genre: string | null, limit = 6) {
  return prisma.manga.findMany({
    where: {
      status: "published",
      id: { not: mangaId },
      ...(genre ? { genre } : {}),
    },
    orderBy: { score: "desc" },
    take: limit,
    select: mangaSelect,
  });
}

export async function getTopMangas(limit = 12) {
  return prisma.manga.findMany({
    where: { status: "published" },
    orderBy: { score: "desc" },
    take: limit,
    select: mangaSelect,
  });
}

export async function getRankingMangas(
  period: "weekly" | "monthly" | "alltime" = "alltime",
  limit = 50
) {
  // For weekly/monthly we filter by publishedAt date
  const now = new Date();
  const dateFilter =
    period === "weekly"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === "monthly"
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      : null;

  return prisma.manga.findMany({
    where: {
      status: "published",
      ...(dateFilter ? { publishedAt: { gte: dateFilter } } : {}),
    },
    orderBy: { score: "desc" },
    take: limit,
    select: {
      ...mangaSelect,
      publishedAt: true,
    },
  });
}
