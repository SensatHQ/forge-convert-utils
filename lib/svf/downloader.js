"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Downloader = void 0;
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const forge_server_utils_1 = require("forge-server-utils");
const __1 = require("..");
class Downloader {
    constructor(auth, host, region) {
        this.auth = auth;
        this.modelDerivativeClient = new forge_server_utils_1.ModelDerivativeClient(this.auth, host, region);
    }
    download(urn, options) {
        const context = {
            log: (options === null || options === void 0 ? void 0 : options.log) || ((message) => { }),
            outputDir: (options === null || options === void 0 ? void 0 : options.outputDir) || '.',
            cancelled: false,
            failOnMissingAssets: !!(options === null || options === void 0 ? void 0 : options.failOnMissingAssets)
        };
        return {
            ready: this._download(urn, context),
            cancel: () => { context.cancelled = true; }
        };
    }
    async _download(urn, context) {
        context.log(`Downloading derivative ${urn}`);
        const helper = new forge_server_utils_1.ManifestHelper(await this.modelDerivativeClient.getManifest(urn));
        const derivatives = helper.search({ type: 'resource', role: 'graphics' });
        const urnDir = path.join(context.outputDir || '.', urn);
        for (const derivative of derivatives.filter(d => d.mime === 'application/autodesk-svf')) {
            if (context.cancelled) {
                return;
            }
            const guid = derivative.guid;
            context.log(`Downloading viewable ${guid}`);
            const guidDir = path.join(urnDir, guid);
            fse.ensureDirSync(guidDir);
            const svf = await this.modelDerivativeClient.getDerivative(urn, encodeURI(derivative.urn));
            fse.writeFileSync(path.join(guidDir, 'output.svf'), new Uint8Array(svf));
            const reader = await __1.SvfReader.FromDerivativeService(urn, guid, this.auth);
            const manifest = await reader.getManifest();
            for (const asset of manifest.assets) {
                if (context.cancelled) {
                    return;
                }
                if (!asset.URI.startsWith('embed:')) {
                    context.log(`Downloading asset ${asset.URI}`);
                    try {
                        const assetData = await reader.getAsset(asset.URI);
                        const assetPath = path.join(guidDir, asset.URI);
                        const assetFolder = path.dirname(assetPath);
                        fse.ensureDirSync(assetFolder);
                        fse.writeFileSync(assetPath, assetData);
                    }
                    catch (err) {
                        if (context.failOnMissingAssets) {
                            throw err;
                        }
                        else {
                            context.log(`Could not download asset ${asset.URI}`);
                        }
                    }
                }
            }
        }
    }
}
exports.Downloader = Downloader;
