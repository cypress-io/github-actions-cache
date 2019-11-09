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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cacheHttpClient = __importStar(require("./cacheHttpClient"));
const utils = __importStar(require("./utils/actionUtils"));
function saveCache(inputPath, primaryKey) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("saving cache path %s", inputPath);
        console.log("primary key %s", primaryKey);
        try {
            const state = utils.getCacheState();
            if (utils.isExactKeyMatch(primaryKey, state)) {
                core.info(`Cache hit occurred on the primary key ${primaryKey}, not saving cache.`);
                return;
            }
            let cachePath = utils.resolvePath(inputPath);
            core.debug(`Cache Path: ${cachePath}`);
            let archivePath = path.join(yield utils.createTempDirectory(), "cache.tgz");
            core.debug(`Archive Path: ${archivePath}`);
            // http://man7.org/linux/man-pages/man1/tar.1.html
            // tar [-options] <name of the tar archive> [files or directories which to add into archive]
            const args = ["-cz"];
            const IS_WINDOWS = process.platform === "win32";
            if (IS_WINDOWS) {
                args.push("--force-local");
                archivePath = archivePath.replace(/\\/g, "/");
                cachePath = cachePath.replace(/\\/g, "/");
            }
            args.push(...["-f", archivePath, "-C", cachePath, "."]);
            const tarPath = yield io.which("tar", true);
            core.debug(`Tar Path: ${tarPath}`);
            yield exec_1.exec(`"${tarPath}"`, args);
            const fileSizeLimit = 400 * 1024 * 1024; // 400MB
            const archiveFileSize = fs.statSync(archivePath).size;
            core.debug(`File Size: ${archiveFileSize}`);
            if (archiveFileSize > fileSizeLimit) {
                core.warning(`Cache size of ${archiveFileSize} bytes is over the 400MB limit, not saving cache.`);
                return;
            }
            const stream = fs.createReadStream(archivePath);
            yield cacheHttpClient.saveCache(stream, primaryKey);
        }
        catch (error) {
            core.warning(error.message);
        }
    });
}
exports.saveCache = saveCache;
