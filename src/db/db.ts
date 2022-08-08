import { Sequelize } from "sequelize";

import config from "../config";

const db = new Sequelize({
    dialect: "sqlite",
    storage: config.dbPath,
    logging: false,
});

export default db;
