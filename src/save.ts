import * as core from "@actions/core";
import { Inputs, State } from "./constants";
import { saveCache } from "./save-fn";

async function run() {
    try {
        // Inputs are re-evaluted before the post action, so we want the original key used for restore
        const primaryKey = core.getState(State.CacheKey);
        if (!primaryKey) {
            core.warning(`Error retrieving key from state.`);
            return;
        }

        const inputPath = core.getInput(Inputs.Path, { required: true });

        await saveCache(inputPath, primaryKey);
    } catch (error) {
        core.setFailed(error.message);
    }
}
run();

export default run;
