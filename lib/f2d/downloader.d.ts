import { ModelDerivativeClient } from 'forge-server-utils';
import { IAuthOptions } from 'forge-server-utils/dist/common';
export interface IDownloadOptions {
    outputDir?: string;
    log?: (message: string) => void;
    failOnMissingAssets?: boolean;
}
export interface IDownloadTask {
    ready: Promise<void>;
    cancel: () => void;
}
export declare class Downloader {
    protected auth: IAuthOptions;
    protected modelDerivativeClient: ModelDerivativeClient;
    constructor(auth: IAuthOptions);
    download(urn: string, options?: IDownloadOptions): IDownloadTask;
    private _download;
}
//# sourceMappingURL=downloader.d.ts.map