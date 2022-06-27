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
const zlib = __importStar(require("zlib"));
const fse = __importStar(require("fs-extra"));
const forge_server_utils_1 = require("forge-server-utils");
class Downloader {
    constructor(auth) {
        this.auth = auth;
        this.modelDerivativeClient = new forge_server_utils_1.ModelDerivativeClient(this.auth);
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
        const urnDir = path.join(context.outputDir, urn);
        for (const derivative of derivatives.filter(d => d.mime === 'application/autodesk-f2d')) {
            if (context.cancelled) {
                return;
            }
            const guid = derivative.guid;
            context.log(`Downloading viewable ${guid}`);
            const guidDir = path.join(urnDir, guid);
            fse.ensureDirSync(guidDir);
            const baseUrn = derivative.urn.substr(0, derivative.urn.lastIndexOf('/'));
            const manifestGzip = await this.modelDerivativeClient.getDerivative(urn, baseUrn + '/manifest.json.gz');
            fse.writeFileSync(path.join(guidDir, 'manifest.json.gz'), new Uint8Array(manifestGzip));
            const manifestGunzip = zlib.gunzipSync(manifestGzip);
            const manifest = JSON.parse(manifestGunzip.toString());
            for (const asset of manifest.assets) {
                if (context.cancelled) {
                    return;
                }
                context.log(`Downloading asset ${asset.URI}`);
                try {
                    const assetData = await this.modelDerivativeClient.getDerivative(urn, baseUrn + '/' + asset.URI);
                    fse.writeFileSync(path.join(guidDir, asset.URI), new Uint8Array(assetData));
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
exports.Downloader = Downloader;
