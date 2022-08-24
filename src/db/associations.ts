import LocalManga from "./models/LocalManga";
import LocalChapter from "./models/LocalChapter";
import RemoteChapter from "./models/RemoteChapter";
import RemoteManga from "./models/RemoteManga";

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

LocalManga.hasMany(RemoteManga, {
    foreignKey: "localMangaId",
});
RemoteManga.belongsTo(LocalManga, {
    foreignKey: "localMangaId",
    targetKey: "id",
});
