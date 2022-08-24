import { Command } from "commander";
import MFA from "mangadex-full-api";
import _ from "lodash";

import CLIHandler from "./cliHandler.js";

const progname = "manga-sync";
const handler = new CLIHandler();

class RootCommand extends Command {
    createCommand(name: string) {
        const cmd = new Command(name);
        cmd.option(
            "-l, --locale <locale>",
            "Locale",
            (value: string) => {
                MFA.setGlobalLocale(value);
                return value;
            },
            "en"
        );
        return cmd;
    }
}

const program = new RootCommand();

program
    .name(progname)
    .description("CLI util to sync downloaded manga")
    .version("0.1.0");

program
    .command("new")
    .description("adds new manga")
    .action(async (options) => {
        await handler.loadOptions(options);
        await handler.newCommand();
    });

program
    .command("pull")
    .description("pulls manga")
    .action(async (options) => {
        await handler.loadOptions(options);
        await handler.handlePullCommand();
    });

program
    .command("fetch")
    .description("fetches manga")
    .action(async (options) => {
        await handler.loadOptions(options);
        await handler.handleFetchComand();
    });

program
    .command("delete")
    .description("deletes manga")
    .action(async (options) => {
        await handler.loadOptions(options);
        await handler.handleDeleteCommand();
    });
await program.parseAsync();
