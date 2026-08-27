export type StoredInput={bytes:Uint8Array;originalName:string;mimeType:string};
export type StoredResult={objectKey:string;safeName:string;sizeBytes:number;checksum:string;storage:string};
export interface PrivateStorage{put(input:StoredInput):Promise<StoredResult>;get(objectKey:string):Promise<Uint8Array>;remove(objectKey:string):Promise<void>}
