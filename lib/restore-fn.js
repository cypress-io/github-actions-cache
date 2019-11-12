"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec_1 = require("@actions/exec");
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const cacheHttpClient = __importStar(require("./cacheHttpClient"));
const constants_1 = require("./constants");
const utils = __importStar(require("./utils/actionUtils"));
/**
 * Restore previously saved cache. Resolves with true if cache was hit.
 */
function restoreCache(inputPath, primaryKey, restoreKeys) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("restoring cache %s", inputPath);
        console.log("primary key %s", primaryKey);
        try {
            // Validate inputs, this can cause task failure
            let cachePath = utils.resolvePath(inputPath);
            core.debug(`Cache Path: ${cachePath}`);
            core.saveState(constants_1.State.CacheKey, primaryKey);
            const restoredKeys = restoreKeys.split("\n").filter(x => x !== "");
            const keys = [primaryKey, ...restoredKeys];
            core.debug("Resolved Keys:");
            core.debug(JSON.stringify(keys));
            if (keys.length > 10) {
                core.setFailed(`Key Validation Error: Keys are limited to a maximum of 10.`);
                return false;
            }
            for (const key of keys) {
                if (key.length > 512) {
                    core.setFailed(`Key Validation Error: ${key} cannot be larger than 512 characters.`);
                    return false;
                }
                const regex = /^[^,]*$/;
                if (!regex.test(key)) {
                    core.setFailed(`Key Validation Error: ${key} cannot contain commas.`);
                    return false;
                }
            }
            try {
                const cacheEntry = yield cacheHttpClient.getCacheEntry(keys);
                if (!cacheEntry) {
                    core.info(`Cache not found for input keys: ${keys.join(", ")}.`);
                    return false;
                }
                let archivePath = path.join(yield utils.createTempDirectory(), "cache.tgz");
                core.debug(`Archive Path: ${archivePath}`);
                // Store the cache result
                utils.setCacheState(cacheEntry);
                // Download the cache from the cache entry
                yield cacheHttpClient.downloadCache(cacheEntry, archivePath);
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
                const tarPath = yield io.which("tar", true);
                core.debug(`Tar Path: ${tarPath}`);
                yield exec_1.exec(`"${tarPath}"`, args);
                const isExactKeyMatch = utils.isExactKeyMatch(primaryKey, cacheEntry);
                utils.setCacheHitOutput(isExactKeyMatch);
                core.info(`Cache restored from key: ${cacheEntry && cacheEntry.cacheKey}`);
                return isExactKeyMatch;
            }
            catch (error) {
                core.warning(error.message);
                utils.setCacheHitOutput(false);
                return false;
            }
        }
        catch (error) {
            core.setFailed(error.message);
            return false;
        }
    });
}
exports.restoreCache = restoreCache;
