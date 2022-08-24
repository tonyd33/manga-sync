import _ from "lodash";

import { LocalMangaAttributes } from "../db/models/LocalManga";
import { LocalChapterAttributes } from "../db/models/LocalChapter";
import { RemoteChapterAttributes } from "../db/models/RemoteChapter";

export default class MangaWrapper {
    localManga: LocalMangaAttributes;
    remoteChapters: RemoteChapterAttributes[];
    localChapters: LocalChapterAttributes[];
    rcNamesToPull: Set<string>;

    constructor({
        localManga,
        localChapters,
        remoteChapters,
    }: {
        localManga: LocalMangaAttributes;
        localChapters: LocalChapterAttributes[];
        remoteChapters: RemoteChapterAttributes[];
    }) {
        this.localManga = localManga;
        this.localChapters = localChapters;
        this.remoteChapters = remoteChapters;

        // By default, only want chapters we don't have
        const lcs = new Set(localChapters.map((lc) => lc.chapter));
        this.rcNamesToPull = new Set(
            remoteChapters
                .map((rc) => rc.chapter)
                .filter((chapter) => !lcs.has(chapter))
        );
    }

    hasLocalChapter(chapter: string): boolean {
        return !!this.localChapters.find((lc) => lc.chapter === chapter);
    }

    listRemoteChapters(): RemoteChapterAttributes[] {
        return _.uniqBy(this.remoteChapters, (rc) => rc.chapter);
    }

    remoteChaptersToPull(): RemoteChapterAttributes[] {
        return this.listRemoteChapters().filter((rc) =>
            this.rcNamesToPull.has(rc.chapter)
        );
    }
}
