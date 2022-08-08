import path from "path";
import fs from "fs";
import os from 'os';

import inquirer from "inquirer";
import MFA from "mangadex-full-api";
import _ from "lodash";

import { MangaSite } from "./lib/types";
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

    async loadOptions(options: CLIOptions) {
        this.options = options;
        MFA.setGlobalLocale(options.locale);
        await db.sync();
    }

    async newCommand() {
        const { search } = await inquirer.prompt([
            { type: "input", name: "search", message: "Search manga" },
        ]);
        const results = await MFA.Manga.search(search);
        if (results.length === 0) {
            logger.log("Couldn't find any results.");
            return;
        }

        const manga = await chooseManga(results);
        if (await LocalManga.findOne({ where: { remoteId: manga.id } })) {
            logger.log("This manga is already in the database.");
            return;
        }
        const { mangaSavePath, title } = await inquirer.prompt([
            {
                type: "input",
                name: "mangaSavePath",
                message: "Save to",
                default: path.resolve(os.homedir(), 'manga', manga.title),
            },
            {
                type: "input",
                name: "title",
                message: "Title",
                default: manga.title,
            },
        ]);

        await LocalManga.create({
            path: mangaSavePath,
            title,
            remoteId: manga.id,
            source: MangaSite.mangadex,
        });
        await fs.promises.mkdir(mangaSavePath, { recursive: true });
        logger.log(`Added ${manga.title} to list.`);
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
                        mangaToEdit.remoteChapters,
                        (rc) => Number(rc.chapter),
                        "asc"
                    ).map((rc) => ({
                        // TODO: Allow multiple sources using tree
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
        const localMangas = await LocalManga.findAll();
        const toUpsert: RemoteChapterCreationAttributes[] = [];
        for (const localManga of localMangas) {
            logger.log(`Fetching ${localManga.title}.`);
            const fetchedChapters = (
                await MFA.Manga.getFeed(localManga.remoteId, {
                    limit: Infinity,
                    translatedLanguage: [this.options.locale],
                    order: { chapter: "asc" },
                })
            ).filter((c) => !c.isExternal);
            toUpsert.push(
                ...fetchedChapters.map((c) => ({
                    localMangaId: localManga.id,
                    remoteId: c.id,
                    title: c.title || null,
                    chapter: c.chapter,
                    source: MangaSite.mangadex,
                    path: c.chapter,
                }))
            );
        }
        const upserted = await RemoteChapter.bulkCreate(toUpsert, {
            updateOnDuplicate: ["chapter", "path", "source"],
        });
        logger.log(`Upserted ${upserted.length} chapters.`);
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

        for (const remoteChapter of toDownload) {
            logger.log(`Downloading chapter ${remoteChapter.chapter}.`);
            const chapter = await MFA.Chapter.get(remoteChapter.remoteId);
            const chapterPath = await downloadChapter({
                mangaPath: manga.localManga.path,
                chapter,
            });
            await LocalChapter.upsert({
                path: chapterPath,
                chapter: remoteChapter.chapter,
                remoteId: remoteChapter.remoteId,
                source: MangaSite.mangadex,
                localMangaId: manga.localManga.id,
            });
            logger.log(`Downloaded chapter ${remoteChapter.chapter}.`);
        }
    }
}

async function chooseManga(results: MFA.Manga[]): Promise<MFA.Manga> {
    if (results.length === 1) {
        return results[0];
    }

    const { manga } = await inquirer.prompt([
        {
            type: "list",
            message: "Which manga?",
            name: "manga",
            choices: results.map((result) => ({
                name: result.title,
                value: result,
            })),
        },
    ]);
    return manga;
}
