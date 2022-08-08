import { DataTypes, Model, Optional } from "sequelize";

import { MangaSite } from "../../lib/types";
import db from "../db";

export interface LocalChapterAttributes {
    id: number;
    localMangaId: number;
    /** Relative path from `LocalManga.path` */
    path: string;
    chapter: string;
    remoteId: string;
    source: MangaSite;
}
export type LocalChapterCreationAttributes = Optional<
    LocalChapterAttributes,
    "id"
>;
export interface LocalChapterInstance
    extends Model<LocalChapterAttributes, LocalChapterCreationAttributes> {}

const LocalChapter = db.define<LocalChapterInstance>(
    "LocalChapter",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        localMangaId: { type: DataTypes.INTEGER },
        path: { type: DataTypes.STRING, allowNull: false },
        chapter: { type: DataTypes.STRING },
        remoteId: { type: DataTypes.STRING, allowNull: false },
        source: {
            type: DataTypes.ENUM(...Object.values(MangaSite)),
            allowNull: false,
        },
    },
    {
        indexes: [
            {
                fields: ["chapter", "localMangaId"],
                unique: true,
            },
        ],
    }
);

export default LocalChapter;
