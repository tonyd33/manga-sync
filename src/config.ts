import os from "os";
import path from "path";
import fs from "fs";

interface Config {
    dbPath: string;
}

async function loadOrMakeConfig() {
    const configDir = path.join(os.homedir(), ".config/manga-sync");
    if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
    }

    const config = path.join(configDir, "config.json");
    if (!fs.existsSync(config)) {
        const defaultConfig: Config = {
            dbPath: path.join(configDir, "db.sql"),
        };
        await fs.promises.writeFile(
            config,
            JSON.stringify(defaultConfig, null, 2),
            "utf-8"
        );
    }

    return JSON.parse(await fs.promises.readFile(config, "utf-8"));
}

const config = await loadOrMakeConfig();

export default config;
