import path from "path";
import fs from "fs";
import os from "os";

import inquirer from "inquirer";
import _ from "lodash";

import { ScrapedManga } from "./lib/types";
import { downloadChapter } from "./download";
import LocalManga, {
    LocalMangaAttributes,
    LocalMangaInstance,
} from "./db/models/LocalManga";
import RemoteChapter, {
    RemoteChapterAttributes,
    RemoteChapterCreationAttributes,
} from "./db/models/RemoteChapter";
import LocalChapter, { LocalChapterAttributes } from "./db/models/LocalChapter";
import logger from "./logger";
import MangaWrapper from "./lib/mangaWrapper";
import Scrapers from "./lib/scrapers/scrapers";
import RemoteManga, { RemoteMangaAttributes } from "./db/models/RemoteManga";

import "./db/associations";
import db from "./db/db";

interface CLIOptions {
    locale: string;
}

type LocalMangaInstanceWithExtras = LocalMangaInstance & {
    RemoteChapters: RemoteChapterAttributes[];
    LocalChapters: LocalChapterAttributes[];
};

export default class CLIHandler {
    options: CLIOptions;
    scrapers: Scrapers;

    constructor() {
        this.scrapers = new Scrapers();
    }

    async loadOptions(options: CLIOptions) {
        this.options = options;
        // TODO: Set global locale
        // MFA.setGlobalLocale(options.locale);
        await db.sync();
    }

    async newCommand() {
        const { search } = await inquirer.prompt([
            { type: "input", name: "search", message: "Search manga" },
        ]);
        const results = await this.scrapers.search(search);
        if (results.length === 0) {
            logger.log("Couldn't find any results.");
            return;
        }

        const mangaSources = await chooseMangaSources(results);
        const { mangaSavePath, title } = await inquirer.prompt([
            {
                type: "input",
                name: "mangaSavePath",
                message: "Save to",
                default: path.resolve(os.homedir(), "manga", mangaSources[0].title ?? search),
            },
            {
                type: "input",
                name: "title",
                message: "Title",
                default: mangaSources[0].title ?? search,
            },
        ]);

        const localManga = await LocalManga.create({
            path: mangaSavePath,
            title,
        });
        // TODO: Catch error
        await RemoteManga.bulkCreate(
            mangaSources.map((ms) => ({
                localMangaId: localManga.id,
                remoteId: ms.id,
                source: ms.source,
            }))
        );
        await fs.promises.mkdir(mangaSavePath, { recursive: true });
        logger.log(`Added ${title} to list.`);
    }

    async handlePullCommand() {
        const mangasToPull = await this.editPull();
        for (const localManga of mangasToPull) {
            await this.#pullManga(localManga);
        }
    }

    async #findMangaToPull(): Promise<MangaWrapper[]> {
        const localMangas = (await LocalManga.findAll({
            include: [RemoteChapter, LocalChapter],
        })) as LocalMangaInstanceWithExtras[];

        return localMangas.map(
            (lm) =>
                new MangaWrapper({
                    localManga: lm,
                    localChapters: lm.LocalChapters,
                    remoteChapters: lm.RemoteChapters,
                })
        );
    }

    async editPull(): Promise<MangaWrapper[]> {
        enum State {
            mangaSelect,
            mangaEdit,
            done,
        }
        let mangas = await this.#findMangaToPull();
        let state: State = State.mangaSelect;
        let mangaToEdit: MangaWrapper | null = null;

        async function askMangaSelect(): Promise<State> {
            const answer = await inquirer.prompt({
                type: "list",
                name: "mangaToEdit",
                message: "Choose manga to edit",
                choices: [
                    { name: "Done", value: null },
                    new inquirer.Separator(),
                    ...mangas.map((manga) => ({
                        name: `${manga.localManga.title} - ${manga.rcNamesToPull.size} chapter(s) to download`,
                        value: manga,
                    })),
                ],
            });
            mangaToEdit = answer.mangaToEdit;
            return mangaToEdit === null ? State.done : State.mangaEdit;
        }

        async function askMangaEdit(): Promise<State> {
            if (!mangaToEdit) return State.done;

            const answer = await inquirer.prompt([
                {
                    type: "checkbox",
                    message: "Select chapters to pull",
                    name: "chaptersToPull",
                    choices: _.orderBy(
                        mangaToEdit.listRemoteChapters(),
                        (rc) => Number(rc.chapter),
                        "asc"
                    ).map((rc) => ({
                        name: `Chapter ${rc.chapter} - ${rc.source}`,
                        value: rc,
                        checked: true,
                        disabled: mangaToEdit?.hasLocalChapter(rc.chapter)
                            ? "already downloaded"
                            : false,
                    })),
                },
            ]);
            mangaToEdit.rcNamesToPull = new Set(
                answer.chaptersToPull.map(
                    (rc: RemoteChapterAttributes) => rc.chapter
                )
            );
            logger.log(
                `Will pull ${mangaToEdit.rcNamesToPull.size} chapters for ${mangaToEdit.localManga.title}`
            );
            return State.mangaSelect;
        }

        do {
            switch (state) {
                case State.mangaSelect:
                    state = await askMangaSelect();
                    break;
                case State.mangaEdit:
                    state = await askMangaEdit();
                    break;
                default:
                    break;
            }
        } while (state !== State.done);

        return mangas.filter((lc) => lc.remoteChapters.length > 0);
    }

    async handleFetchComand() {
        const localMangas = (await LocalManga.findAll({
            include: RemoteManga,
        })) as (LocalMangaInstance & {
            RemoteMangas: RemoteMangaAttributes[];
        })[];
        const toUpsert: RemoteChapterCreationAttributes[] = [];
        for (const localManga of localMangas) {
            logger.log(`Fetching ${localManga.title}.`);
            const fetchedChapters = (await Promise.all(
                localManga.RemoteMangas.map((rm) =>
                    this.scrapers.getChapters(rm.remoteId, rm.source)
                )
            )).flat();
            toUpsert.push(
                ...fetchedChapters.map((c) => ({
                    localMangaId: localManga.id,
                    remoteId: c.id,
                    title: c.title,
                    chapter: c.chapter,
                    source: c.source,
                    path: c.chapter,
                }))
            );
        }
        await RemoteChapter.bulkCreate(toUpsert, {
            updateOnDuplicate: ["chapter", "path", "source"],
        });
        logger.log("Fetched remote sources");
    }

    async handleDeleteCommand() {
        const localMangas = await LocalManga.findAll();
        const { mangasToDelete } = await inquirer.prompt({
            type: "checkbox",
            name: "mangasToDelete",
            message: "Choose manga to delete",
            choices: localMangas.map((lm) => ({
                name: lm.title,
                value: lm,
            })),
        });
        await Promise.all([
            LocalManga.destroy({
                where: {
                    id: mangasToDelete.map(
                        (manga: LocalMangaAttributes) => manga.id
                    ),
                },
            }),
            ...mangasToDelete.map(async (manga: LocalMangaAttributes) =>
                fs.promises.rmdir(manga.path, { recursive: true })
            ),
        ]);
    }

    async #pullManga(manga: MangaWrapper) {
        if (!manga) {
            throw new Error("Couldn't find manga");
        }
        const toDownload = manga.remoteChaptersToPull();

        for (const { chapter, remoteId, source } of toDownload) {
            logger.log(`Downloading chapter ${chapter}.`);
            const pages = await this.scrapers.getChapterPages(remoteId, source);
            const chapterName = `Chapter ${chapter}`;
            await downloadChapter({
                mangaPath: manga.localManga.path,
                pages,
                // TODO: Better name lmao
                name: chapterName,
            });
            await LocalChapter.upsert({
                path: path.join(manga.localManga.path, `${chapterName}.cbz`),
                chapter: chapter,
                remoteId: remoteId,
                source,
                localMangaId: manga.localManga.id,
            });
            logger.log(`Downloaded chapter ${chapter}.`);
        }
    }
}

async function chooseMangaSources(
    results: ScrapedManga[]
): Promise<ScrapedManga[]> {
    const { mangas } = await inquirer.prompt([
        {
            type: "checkbox",
            message: "Choose sources for manga",
            name: "mangas",
            choices: results.map((result) => ({
                name: `${result.title} (${result.source})`,
                value: result,
            })),
        },
    ]);
    return mangas;
}
