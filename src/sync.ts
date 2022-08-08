import MFA from "mangadex-full-api";

async function searchMangaForDB(title: string) {
    const results = await MFA.Manga.search({ title });
}
