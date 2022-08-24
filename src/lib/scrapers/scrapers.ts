import { MangaSite, ScrapedChapter, ScrapedManga, Scraper } from "../types";
import Mangadex from "./mangadex";
import Manganato from "./manganato";

// aggregates all scrapers
export default class Scrapers {
    scrapers: Scraper[];

    constructor() {
        const mangadex = new Mangadex();
        const manganato = new Manganato();
        this.scrapers = [mangadex, manganato];
    }

    #findScraper(source: MangaSite): Scraper {
        const scraper = this.scrapers.find((s) => s.site === source);
        if (!scraper) {
            throw new Error("Couldn't find scraper for this source");
        }
        return scraper;
    }

    async search(query: string) {
        return (
            await Promise.all(
                this.scrapers.map((scraper) => scraper.search(query))
            )
        ).flat();
    }

    async getChapters(mangaId: string, source: MangaSite) {
        const scraper = this.#findScraper(source);
        return await scraper.getChapters(mangaId);
    }

    async getChapterPages(chapterId: string, source: MangaSite) {
        const scraper = this.#findScraper(source);

        return scraper.getChapterPages(chapterId);
    }
}
