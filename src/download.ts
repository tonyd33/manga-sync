import fs from "fs";
import path from "path";

import axios from "axios";
import _ from "lodash";
import PQueue from "p-queue";
import archiver from "archiver";

export async function downloadChapter({
    mangaPath,
    pages,
    name,
}: {
    mangaPath: string;
    /** array of urls of chapter pages, ordered */
    pages: string[];
    name: string;
}) {
    const chapterPath = path.join(mangaPath, name);
    await fs.promises.mkdir(chapterPath, { recursive: true });

    const queue = new PQueue({
        concurrency: 10,
        interval: 1000,
        intervalCap: 15,
    });

    const numPagesPadding =
        Math.max(Math.ceil(Math.log(pages.length) / Math.log(10)), 2) + 1;
    await queue.addAll(
        pages.map((page, index) => async () => {
            await downloadFile({
                filename: path.join(
                    chapterPath,
                    `${_.padStart(
                        index.toString(),
                        numPagesPadding,
                        "0"
                    )}${path.extname(page)}`
                ),
                url: page,
            });
        })
    );
    await queue.onEmpty();
    // Don't parallelize this because we don't want to destroy the directory
    // if zipping fails
    // TODO: Maybe just pipe to archive rather than downloading
    await zipDirectory(chapterPath);
    await fs.promises.rm(chapterPath, { recursive: true, force: true });

    return `${chapterPath}.cbz`;
}

async function downloadFile({
    filename,
    url,
}: {
    filename: string;
    url: string;
}): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios({
                method: "GET",
                url,
                responseType: "stream",
            });
            const stream = fs.createWriteStream(filename);
            response.data.pipe(stream);
            stream.on("finish", () => resolve());
        } catch (err) {
            reject(err);
        }
    });
}

async function zipDirectory(dirname: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const filename = `${dirname}.cbz`;
            const archiveOutput = fs.createWriteStream(filename);

            const archive = archiver("zip");
            archive.on("error", (err: any) => reject(err));
            archiveOutput.on("close", () => resolve());

            archive.directory(dirname, false);
            archive.pipe(archiveOutput);
            archive.finalize();
        } catch (err) {
            reject(err);
        }
    });
}
