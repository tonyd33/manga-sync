import MFA from "mangadex-full-api";

import { MangaSite, ScrapedManga, Scraper } from "../types";

export default class Mangadex implements Scraper {
    site = MangaSite.mangadex;

    constructor() {
        // TODO: Option
        MFA.setGlobalLocale("en");
    }

    async search(query: string): Promise<ScrapedManga[]> {
        const results = await MFA.Manga.search(query);
        const authors = await Promise.all(
            results.map((result) => MFA.resolveArray(result.authors))
        );
        return results.map((result, index) => ({
            title: result.title,
            id: result.id,
            source: this.site,
            author: authors[index][0]?.name ?? null,
        }));
    }

    async getChapters(mangaId: string) {
        return (
            await MFA.Manga.getFeed(mangaId, {
                limit: Infinity,
                // TODO: Change
                translatedLanguage: ["en"],
                order: { chapter: "asc" },
            })
        )
            .filter((c) => !c.isExternal)
            .map((c) => ({
                source: this.site,
                id: c.id,
                title: c.title || null,
                chapter: c.chapter,
            }));
    }

    async getChapterPages(chapterId: string) {
        const chapter = await MFA.Chapter.get(chapterId);
        return await chapter.getReadablePages();
    }
}
