import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as io from "@actions/io";

import * as path from "path";

import * as cacheHttpClient from "./cacheHttpClient";
import { Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";

/**
 * Restore previously saved cache. Resolves with true if cache was hit.
 */
export async function restoreCache(
    inputPath: string,
    primaryKey: string,
    restoreKeys: string
) {
    console.log("restoring cache %s", inputPath);
    console.log("primary key %s", primaryKey);

    try {
        // Validate inputs, this can cause task failure
        let cachePath = utils.resolvePath(inputPath);
        core.debug(`Cache Path: ${cachePath}`);

        core.saveState(State.CacheKey, primaryKey);

        const restoredKeys = restoreKeys.split("\n").filter(x => x !== "");
        const keys = [primaryKey, ...restoredKeys];

        core.debug("Resolved Keys:");
        core.debug(JSON.stringify(keys));

        if (keys.length > 10) {
            core.setFailed(
                `Key Validation Error: Keys are limited to a maximum of 10.`
            );
            return false;
        }
        for (const key of keys) {
            if (key.length > 512) {
                core.setFailed(
                    `Key Validation Error: ${key} cannot be larger than 512 characters.`
                );
                return false;
            }
            const regex = /^[^,]*$/;
            if (!regex.test(key)) {
                core.setFailed(
                    `Key Validation Error: ${key} cannot contain commas.`
                );
                return false;
            }
        }

        try {
            const cacheEntry = await cacheHttpClient.getCacheEntry(keys);
            if (!cacheEntry) {
                core.info(
                    `Cache not found for input keys: ${keys.join(", ")}.`
                );
                return false;
            }

            let archivePath = path.join(
                await utils.createTempDirectory(),
                "cache.tgz"
            );
            core.debug(`Archive Path: ${archivePath}`);

            // Store the cache result
            utils.setCacheState(cacheEntry);

            // Download the cache from the cache entry
            await cacheHttpClient.downloadCache(cacheEntry, archivePath);

            const archiveFileSize = utils.getArchiveFileSize(archivePath);
            core.debug(`File Size: ${archiveFileSize}`);

            io.mkdirP(cachePath);

            // http://man7.org/linux/man-pages/man1/tar.1.html
            // tar [-options] <name of the tar archive> [files or directories which to add into archive]
            const args = ["-xz"];

            const IS_WINDOWS = process.platform === "win32";
            if (IS_WINDOWS) {
                args.push("--force-local");
                archivePath = archivePath.replace(/\\/g, "/");
                cachePath = cachePath.replace(/\\/g, "/");
            }
            args.push(...["-f", archivePath, "-C", cachePath]);

            const tarPath = await io.which("tar", true);
            core.debug(`Tar Path: ${tarPath}`);

            await exec(`"${tarPath}"`, args);

            const isExactKeyMatch = utils.isExactKeyMatch(
                primaryKey,
                cacheEntry
            );
            utils.setCacheHitOutput(isExactKeyMatch);

            core.info(
                `Cache restored from key: ${cacheEntry && cacheEntry.cacheKey}`
            );
            return isExactKeyMatch;
        } catch (error) {
            core.warning(error.message);
            utils.setCacheHitOutput(false);
            return false;
        }
    } catch (error) {
        core.setFailed(error.message);
        return false;
    }
}
