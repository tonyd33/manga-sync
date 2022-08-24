export enum MangaSite {
    mangadex = "mangadex",
    manganato = "manganato",
}

export interface ScrapedManga {
    source: MangaSite;
    id: string;
    title: string;
    author: string | null;
}

export interface ScrapedChapter {
    source: MangaSite;
    id: string;
    title: string | null;
    chapter: string;
}

export interface Scraper {
    site: MangaSite;
    search(query: string): Promise<ScrapedManga[]>;
    getChapters(mangaId: string): Promise<ScrapedChapter[]>;
    getChapterPages(chapterId: string): Promise<string[]>;
}
