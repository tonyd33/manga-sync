import { DataTypes, Model, Optional } from "sequelize";

import db from "../db";

export interface LocalMangaAttributes {
    id: number;
    /** Relative path from `meta.root` */
    path: string;
    title: string;
}

export interface LocalMangaInstance
    extends Model<LocalMangaAttributes, Optional<LocalMangaAttributes, "id">>,
        LocalMangaAttributes {}

const LocalManga = db.define<LocalMangaInstance>(
    "LocalManga",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        path: { type: DataTypes.STRING, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: false },
    },
    { indexes: [{ fields: ["path", "title"], unique: true }] }
);

export default LocalManga;
