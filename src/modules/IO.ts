export interface FileReadResult {
  offset: number;
  length: number;
  result: Uint8Array|ArrayBuffer;
}

export class FileReaderIO {
  private file: Blob;
  private sliceLength: number = 10000;

  get length(){
    return this.file.size;
  }

  constructor(file: Blob) {
    this.file = file;
  }

  public readFileSlice(offset: number, length?: number): Promise<FileReadResult>;
  public readFileSlice(offset: number): Promise<FileReadResult> {
    length = length || this.sliceLength;
    return new Promise<FileReadResult>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve({ offset, length, result: fr.result as ArrayBuffer });
      fr.onerror = reject;
      fr.readAsArrayBuffer(this.file.slice(offset, offset + length));
    });
  }
}
