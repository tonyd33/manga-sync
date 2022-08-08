import LocalManga from "./models/LocalManga";
import LocalChapter from "./models/LocalChapter";
import RemoteChapter from "./models/RemoteChapter";

LocalManga.hasMany(LocalChapter, {
    foreignKey: "localMangaId",
});
LocalChapter.belongsTo(LocalManga, {
    foreignKey: "localMangaId",
    targetKey: "id",
});

LocalManga.hasMany(RemoteChapter, {
    foreignKey: "localMangaId",
});
RemoteChapter.belongsTo(LocalManga, {
    foreignKey: "localMangaId",
    targetKey: "id",
});
