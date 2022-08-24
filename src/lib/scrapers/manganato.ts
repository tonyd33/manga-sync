import cheerio from "cheerio";
import axios from "axios";

import {
    ScrapedManga,
    MangaSite,
    Scraper,
    ScrapedChapter,
} from "../../lib/types";

const baseUrl = "https://manganato.com";
const readBaseUrl = "https://readmanganato.com";

const chapterRegex = /Chapter (\d*\.?\d+):?\s*(.*)/;

export default class Manganato implements Scraper {
    site = MangaSite.manganato;

    async search(query: string): Promise<ScrapedManga[]> {
        const page = await axios({
            url: `${baseUrl}/search/story/${query.replaceAll(' ', '_')}`,
            method: "GET",
        });
        const mangas: ScrapedManga[] = [];
        const $ = cheerio.load(page.data);
        for (const manga of $(
            "div[class=panel-search-story] > div[class=search-story-item]"
        )) {
            const cheerioManga = $(manga);
            const link = cheerioManga.find("a[class=item-img]").attr("href");
            if (!link) continue;

            const id = new URL(link).pathname.replace(/^\//, "");
            const title = cheerioManga.find("div > h3").text().trim();
            const author = cheerioManga
                .find("div > span[class~=item-author]")
                .text()
                .split(",")[0];

            mangas.push({ source: this.site, id, title, author });
        }

        return mangas;
    }

    async getChapters(mangaId: string) {
        const page = await axios({
            url: `${readBaseUrl}/${mangaId}`,
            method: "GET",
        });
        const $ = cheerio.load(page.data);
        const chapterList = $("div[class=panel-story-chapter-list]")
            .find("ul")
            .children();
        const chapters: ScrapedChapter[] = [];
        for (const chapter of chapterList) {
            const cheerioChapter = $(chapter);
            const anchor = cheerioChapter.find("a");
            const link = anchor.attr("href");
            const match = anchor.text().match(chapterRegex);
            if (!match || !link) continue;

            const id = new URL(link).pathname.replace(/^\//, "");
            chapters.push({
                source: this.site,
                id,
                title: match[2] || null,
                chapter: match[1],
            });
        }

        return chapters;
    }

    async getChapterPages(chapterId: string): Promise<string[]> {
        const page = await axios({
            url: `${readBaseUrl}/${chapterId}`,
            method: "GET",
        });
        const $ = cheerio.load(page.data);
        const pages: string[] = [];
        const images = $("div[class=container-chapter-reader] > img");
        for (const image of images) {
            const src = $(image).attr("src");
            if (src) {
                pages.push(src);
            }
        }
        return pages;
    }
}
