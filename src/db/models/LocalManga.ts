import { DataTypes, Model, Optional } from "sequelize";

import { MangaSite } from "../../lib/types";
import db from "../db";

export interface LocalMangaAttributes {
    id: number;
    /** Relative path from `meta.root` */
    path: string;
    title: string;
    remoteId: string;
    source: MangaSite;
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
        remoteId: { type: DataTypes.STRING, allowNull: false },
        source: {
            type: DataTypes.ENUM(...Object.values(MangaSite)),
            allowNull: false,
        },
    },
    undefined
);

export default LocalManga;
