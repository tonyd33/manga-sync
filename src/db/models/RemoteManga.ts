import { DataTypes, Model, Optional } from "sequelize";

import { MangaSite } from "../../lib/types";
import db from "../db";

export interface RemoteMangaAttributes {
    id: number;
    localMangaId: number;
    remoteId: string;
    source: MangaSite;
}
export type RemoteMangaCreationAttributes = Optional<
    RemoteMangaAttributes,
    "id"
>;
export interface RemoteMangaInstance
    extends Model<RemoteMangaAttributes, RemoteMangaCreationAttributes> {}

const RemoteManga = db.define<RemoteMangaInstance>(
    "RemoteManga",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        localMangaId: { type: DataTypes.INTEGER, allowNull: false },
        remoteId: { type: DataTypes.STRING, allowNull: false },
        source: {
            type: DataTypes.ENUM(...Object.values(MangaSite)),
            allowNull: false,
        },
    },
    {
        indexes: [
            { fields: ["remoteId", "source"], unique: true },
        ],
    }
);

export default RemoteManga;
