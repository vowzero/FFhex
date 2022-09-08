import { FileReaderIO, FileReadResult } from "./IO";

interface PieceNode {
  bufferID: number | boolean;
  begin: number;
  length: number;
}

interface PieceBuffer {
  data: ArrayBufferLike;
  size: number;
  maxSize: number;
}

export class PieceTable {
  private _size: number = 0;
  private defaultBufferSize: number = 1024 * 64;
  protected origin?: FileReaderIO;
  protected buffers: PieceBuffer[];
  protected nodes: PieceNode[];

  get size() {
    return this._size;
  }

  constructor(fileIO?: FileReaderIO) {
    this.origin = fileIO;
    this.buffers = [];
    this.nodes = [];
    if (fileIO) {
      this.nodes.push({ bufferID: true, begin: 0, length: fileIO.length });
      this._size = fileIO.length;
    } else {
      this.nodes.push({ bufferID: false, begin: 0, length: 0 });
    }
    this.createNewBuffer();
  }

  private getSuitableBufferIndex(size: number) {
    let index = this.buffers.findIndex((x) => x.size + size <= x.maxSize);
    if (index !== -1) return index;
    else if (size > this.defaultBufferSize) {
      return this.createNewBuffer(size);
    } else {
      return this.createNewBuffer();
    }
  }

  private locateOffsetNodeIndex(offset: number): [number, number] {
    let curOffset = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      if (curOffset <= offset && curOffset + this.nodes[i].length >= offset) {
        return [i, curOffset];
      } else {
        curOffset += this.nodes[i].length;
      }
    }
    return [-1, -1];
  }

  private async getNodeUint8Array(node: PieceNode, begin: number, length: number): Promise<Uint8Array> {
    let arrBuf: ArrayBufferLike = null!;
    if (node.bufferID === true) {
      await this.origin!.readFileSlice(begin, length).then((x) => (arrBuf = x.result));
    } else {
      arrBuf = this.buffers[node.bufferID as number].data.slice(begin, begin + length);
    }
    return new Uint8Array(arrBuf);
  }

  public insert(offset: number, data: ArrayLike<number>) {
    if (offset < 0) offset = 0;
    let last = this.size;
    if (offset > last) offset = last;

    let bufferIndex = this.getSuitableBufferIndex(data.length);
    let newBegin = this.buffers[bufferIndex].size;
    let uint8 = new Uint8Array(this.buffers[bufferIndex].data);
    uint8.set(data, this.buffers[bufferIndex].size);
    this.buffers[bufferIndex].size += data.length;

    let [originIndex, originOffset] = this.locateOffsetNodeIndex(offset);
    if (originIndex == -1) throw new Error("Invalid offset");
    let origin = this.nodes[originIndex];
    let nodes = [
      {
        bufferID: origin.bufferID,
        begin: origin.begin,
        length: offset - originOffset,
      },
      {
        bufferID: bufferIndex,
        begin: newBegin,
        length: data.length,
      },
      {
        bufferID: origin.bufferID,
        begin: origin.begin + offset - originOffset,
        length: origin.length - (offset - originOffset),
      },
    ].filter((x) => x.length > 0);
    if (nodes.length == 2) {
      if (nodes[0].bufferID === nodes[1].bufferID && nodes[0].begin + nodes[0].length === nodes[1].begin) {
        nodes[0].length += nodes[1].length;
        nodes.splice(1, 1);
      }
    }
    this.nodes.splice(originIndex, 1, ...nodes);
    this._size += data.length;
  }

  public delete(offset: number, length: number) {
    if (offset < 0) throw new RangeError("Offset cannot be negative");
    if (length < 0) {
      this.delete(offset + length, -length);
      return;
    } else if (length == 0) return;
    else if (offset + length > this.size) length = this.size - offset;

    let [startIndex, startOffset] = this.locateOffsetNodeIndex(offset + 1);
    let [endIndex, endOffset] = this.locateOffsetNodeIndex(offset + length);
    if (startIndex == -1 || endIndex == -1) throw new Error("Invalid offset");

    let startLength = this.nodes[startIndex].length - (offset - startOffset);
    let endLength = this.nodes[endIndex].length - (offset + length - endOffset);
    if (startIndex == endIndex) {
      startLength = offset - startOffset;
    }
    let nodes: PieceNode[] = [];
    if (startLength != this.nodes[startIndex].length && startLength > 0) {
      nodes.push({
        bufferID: this.nodes[startIndex].bufferID,
        begin: this.nodes[startIndex].begin,
        length: startLength,
      });
    }
    if (endLength > 0)
      nodes.push({
        bufferID: this.nodes[endIndex].bufferID,
        begin: this.nodes[endIndex].begin + (offset + length - endOffset),
        length: endLength,
      });
    this.nodes.splice(startIndex, endIndex - startIndex + 1, ...nodes);
    this._size -= length;
  }

  public index(offset: number) {
    let [nodeIndex, nodeOffset] = this.locateOffsetNodeIndex(offset + 1);
    if (nodeIndex == -1) throw new Error("Invalid offset");
    let uint8 = new Uint8Array(this.buffers[this.nodes[nodeIndex].bufferID as number].data);
    return uint8.at(offset - nodeOffset + this.nodes[nodeIndex].begin);
  }

  public async slice(offset: number, length: number): Promise<FileReadResult> {
    if (offset + length > this.size) length = this.size - offset;
    let res: number[] = [];
    let [startIndex, startOffset] = this.locateOffsetNodeIndex(offset + 1);
    let endIndex = this.locateOffsetNodeIndex(offset + length)[0];
    if (startIndex == -1 || endIndex == -1) throw new Error("Invalid offset");
    let curOffset = startOffset;
    for (let i = startIndex; i <= endIndex; i++) {
      let startOffset = this.nodes[i].begin;
      let curLength = this.nodes[i].length;

      if (startIndex == endIndex) {
        curLength = length;
        startOffset += offset - curOffset;
      } else if (i == startIndex) {
        startOffset += offset - curOffset;
      } else if (i == endIndex) {
        curLength = offset + length - curOffset;
      }

      let pUint8 = this.getNodeUint8Array(this.nodes[i], startOffset, curLength);
      for (let j = 0; j < curLength; j++) {
        await pUint8.then((uint8) => res.push(uint8.at(j)!));
      }

      curOffset += this.nodes[i].length;
    }

    return { offset, length, result: Uint8Array.from(res).buffer };
  }

  public async *sliceGenerator(offset: number, length: number) {
    let [startIndex, startOffset] = this.locateOffsetNodeIndex(offset + 1);
    let endIndex = this.locateOffsetNodeIndex(offset + length)[0];
    if (startIndex == -1 || endIndex == -1) throw new Error("Invalid offset");
    let curOffset = startOffset;
    for (let i = startIndex; i <= endIndex; i++) {
      let startOffset = this.nodes[i].begin;
      let curLength = this.nodes[i].length;

      if (startIndex == endIndex) {
        curLength = length;
      } else if (i == startIndex) {
        startOffset += offset - curOffset;
      } else if (i == endIndex) {
        curLength = offset + length - curOffset;
      }

      let pUint8 = this.getNodeUint8Array(this.nodes[i], startOffset, curLength);
      let data: number = 0;
      for (let j = 0; j < curLength; j++) {
        await pUint8.then((uint8) => (data = uint8.at(j)!));
        yield data;
      }

      curOffset += this.nodes[i].length;
    }
  }

  public test() {
    let res = [];
    for (let piece of this.nodes) {
      if (piece.bufferID !== false) {
        let buf = this.buffers[piece.bufferID as number];
        let u8 = new Uint8Array(buf.data);
        for (let i = piece.begin; i < piece.begin + piece.length; i++) {
          res.push(u8.at(i));
        }
      }
    }
    console.log(res);
    console.log(this);
  }

  private createNewBuffer(maxSize?: number) {
    maxSize = maxSize || this.defaultBufferSize;
    this.buffers.push({ size: 0, maxSize, data: new ArrayBuffer(maxSize) });
    return this.buffers.length - 1;
  }
}
