import * as core from "@actions/core";
import { Inputs, State } from "./constants";
import { restoreCache } from "./restore-fn";

async function run() {
    try {
        const inputPath = core.getInput(Inputs.Path, { required: true });
        const primaryKey = core.getInput(Inputs.Key, { required: true });
        const restoreKeys = core.getInput(Inputs.RestoreKeys);

        await restoreCache(inputPath, primaryKey, restoreKeys);
    } catch (error) {
        core.setFailed(error.message);
    }
}
run();

export default run;
