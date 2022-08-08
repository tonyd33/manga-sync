import { DataTypes, Model, Optional } from "sequelize";

import { MangaSite } from "../../lib/types";
import db from "../db";

export interface RemoteChapterAttributes {
    id: number;
    localMangaId: number;
    /** Relative path from `LocalManga.path` */
    path: string;
    chapter: string;
    remoteId: string;
    source: MangaSite;
}

export type RemoteChapterCreationAttributes = Optional<
    RemoteChapterAttributes,
    "id"
>;
export interface RemoteChapterInstance
    extends Model<RemoteChapterAttributes, RemoteChapterCreationAttributes>,
        RemoteChapterAttributes {}

const RemoteChapter = db.define<RemoteChapterInstance>(
    "RemoteChapter",
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
    { indexes: [{ fields: ["remoteId", "source"], unique: true }] }
);

export default RemoteChapter;
