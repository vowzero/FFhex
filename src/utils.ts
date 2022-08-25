import { BoyerMooreBytes } from "@/modules/Boyer-Moore";

/**
 * quickly to throttle even in event
 */
export function throttle(this: any, func: any, timeout: number) {
  let timer: any | null = null;
  return (...args: any) => {
    if (timer) return;
    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, timeout);
  }
}

/**
 * Return a new size that greater than size and is an integer multiple of alignSize
 */
export function calcBytesAlign(size: number, alignSize: number): number {
  return Math.floor((Math.floor(size) + alignSize - 1) / alignSize) * alignSize;
}


/** Original bytes data format to visual data form */
export class BytesFormat {
  [props: string]: any;
  private _offset: number = 0;
  private _dataview: DataView;
  private _littleEndian: boolean = false;

  constructor(dataview: DataView) {
    this._dataview = dataview;
  }

  set offset(offset: number) {
    this._offset = offset;
  }

  set littleEndian(littleEndian: boolean) {
    this._littleEndian = littleEndian;
  }

  private getBytes(length: number): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
      bytes.push(this._dataview.getUint8(this._offset + i));
    }
    if (this._littleEndian) bytes.reverse();
    return bytes;
  }
  get binary(): string {
    let byte = this._dataview.getUint8(this._offset);
    return byte.toString(2).padStart(8, '0');
  }

  get uint8(): string {
    return this._dataview.getUint8(this._offset).toString();
  }
  get uint16(): string {
    return this._dataview.getUint16(this._offset, this._littleEndian).toString();
  }
  get uint32(): string {
    return this._dataview.getUint32(this._offset, this._littleEndian).toString();
  }
  get uint64(): string {
    return this._dataview.getBigUint64(this._offset, this._littleEndian).toString();
  }
  get int8(): string {
    return this._dataview.getInt8(this._offset).toString();
  }
  get int16(): string {
    return this._dataview.getInt16(this._offset, this._littleEndian).toString();
  }
  get int32(): string {
    return this._dataview.getInt32(this._offset, this._littleEndian).toString();
  }
  get int64(): string {
    return this._dataview.getBigInt64(this._offset, this._littleEndian).toString();
  }
  get float16(): string {
    const bytes = this.getBytes(2);

    let s: number = (bytes[0] & 0x80) > 0 ? 1 : 0;
    let e: number = ((bytes[0] & 0x7C) >> 2);
    let x: number = (((bytes[0] & 0x03) << 8) + ((bytes[1] & 0xFF) << 0)) / (Math.pow(2, 10));
    let res: number = Math.pow(-1, s) * (1 + x) * Math.pow(2, e - 15);
    console.log(s, e, x)
    return res.toString();
  }
  get float32(): string {
    return this._dataview.getFloat32(this._offset, this._littleEndian).toString();
  }
  get float64(): string {
    return this._dataview.getFloat64(this._offset, this._littleEndian).toString();
  }
  get float128(): string {
    // javascript自带浮点精度影响。。。
    const bytes = this.getBytes(16);
    // e:15bit
    let s: number = (bytes[0] & 0x80) > 0 ? 1 : 0;
    let e: number = ((bytes[0] & 0x7F) << 8) + ((bytes[1] & 0xFF) << 0);
    let x: number = 0;
    for (let i = 2; i < 16; i++)x += bytes[i] << (8 * (15 - i));
    x /= Math.pow(2, 112);

    let res: number = Math.pow(-1, s) * ((1 + x) * Math.pow(2, e - 16383));
    console.log(s, e, x, 1 + x);
    return res.toString();
  }
  get ascii(): string {
    let code = this._dataview.getUint8(this._offset);
    if (code >= 32 && code <= 126) return String.fromCharCode(code);
    switch (code) {
      default: return '[unknown ascii code]';
      case 0x00: return '[NUL]';
      case 0x01: return '[SOH]';
      case 0x02: return '[STX]';
      case 0x03: return '[ETX]';
      case 0x04: return '[EOT]';
      case 0x05: return '[ENQ]';
      case 0x06: return '[ACK]';
      case 0x07: return '[BEL]';
      case 0x08: return '[BS]';
      case 0x09: return '[HT]';
      case 0x0A: return '[LF]';
      case 0x0B: return '[VT]';
      case 0x0C: return '[FF]';
      case 0x0D: return '[CR]';
      case 0x0E: return '[SO]';
      case 0x0F: return '[SI]';
      case 0x10: return '[DLE]';
      case 0x11: return '[DC1]';
      case 0x12: return '[DC2]';
      case 0x13: return '[DC3]';
      case 0x14: return '[DC4]';
      case 0x15: return '[NAK]';
      case 0x16: return '[SYN]';
      case 0x17: return '[ETB]';
      case 0x18: return '[CAN]';
      case 0x19: return '[EM]';
      case 0x1A: return '[SUB]';
      case 0x1B: return '[ESC]';
      case 0x1C: return '[FS]';
      case 0x1D: return '[GS]';
      case 0x1E: return '[RS]';
      case 0x1F: return '[US]';
      case 0x20: return '[SPACE]';
      case 0XFF: return '[DEL]';
    }
  }
  get utf8(): string {
    let bytes: number[];
    let unicode: number = 0;
    let firstByte = this._dataview.getUint8(this._offset);

    this.littleEndian = false;
    if ((firstByte & 0xFC) === 0xFC) { // 6bytes
      bytes = this.getBytes(6);
      unicode += (bytes[0] & 0x01) << 30;
      unicode += (bytes[1] & 0x3F) << 24;
      unicode += (bytes[2] & 0x3F) << 18;
      unicode += (bytes[3] & 0x3F) << 12;
      unicode += (bytes[4] & 0x3F) << 6;
      unicode += (bytes[5] & 0x3F) << 0;
    } else if ((firstByte & 0xF8) === 0xF8) { // 5bytes
      bytes = this.getBytes(5);
      unicode += (bytes[0] & 0x03) << 24;
      unicode += (bytes[1] & 0x3F) << 18;
      unicode += (bytes[2] & 0x3F) << 12;
      unicode += (bytes[3] & 0x3F) << 6;
      unicode += (bytes[4] & 0x3F) << 0;
    } else if ((firstByte & 0xF0) === 0xF0) { // 4bytes
      bytes = this.getBytes(4);
      unicode += (bytes[0] & 0x07) << 18;
      unicode += (bytes[1] & 0x3F) << 12;
      unicode += (bytes[2] & 0x3F) << 6;
      unicode += (bytes[3] & 0x3F) << 0;
    } else if ((firstByte & 0xE0) === 0xE0) { // 3bytes
      bytes = this.getBytes(3);
      unicode += (bytes[0] & 0x0F) << 12;
      unicode += (bytes[1] & 0x3F) << 6;
      unicode += (bytes[2] & 0x3F) << 0;
      console.log(bytes[0] & 0x0F << 0, bytes[1] & 0x3F << 0, bytes[2] & 0x3F << 0);
    } else if ((firstByte & 0xC0) === 0xC0) { // 2 bytes
      bytes = this.getBytes(2);
      unicode += (bytes[0] & 0x1F) << 6;
      unicode += (bytes[1] & 0x3F) << 0;
    } else if ((firstByte & 0x80) === 0) { // 1 byte
      return this.ascii;
    }
    return String.fromCharCode(unicode);
  }
  get utf16(): string {
    let bytes: number[];
    let unit: number;
    let unicode: number = 0;
    let firstByte = this._dataview.getUint8(this._offset);
    let secondByte = this._dataview.getUint16(this._offset + 1);
    if (firstByte == 0xFE && secondByte == 0xFF) { // BOM BE
      this.littleEndian = false;
      this._offset += 2;
    } else if (secondByte == 0xFE && firstByte == 0xFF) { // BOM LE
      this.littleEndian = true;
      this._offset += 2;
    }
    bytes = this.getBytes(2);
    unit = (bytes[0] << 8) + bytes[1];
    if (unit < 0xD800 || unit > 0xDFFF) {
      unicode = unit;
    } else {
      unicode += (unit - 0xD800) << 10;
      this._offset += 2;
      bytes = this.getBytes(2);
      unit = (bytes[0] << 8) + bytes[1];
      unicode += (unit - 0xDC00);
      unicode += 0x10000;
    }
    return String.fromCharCode(unicode);
  }
  get utf32(): string {
    let bytes: number[];
    let unicode: number = 0;
    bytes = this.getBytes(4);
    if (bytes[2] == 0xFE && bytes[3] == 0xFF) { // BOM BE
      this.littleEndian = false;
      this._offset += 4;
      bytes = this.getBytes(4);
    } else if (bytes[1] == 0xFE && bytes[0] == 0xFF) { // BOM LE
      this.littleEndian = true;
      this._offset += 4;
      bytes = this.getBytes(4);
    }
    unicode += (bytes[0] << 24) + (bytes[1] << 16) + (bytes[2] << 8) + (bytes[3] << 0);
    return String.fromCharCode(unicode);
  }
}

/**
 * A wrapper function makes ArrayBuffer have the same "at" function as the basic type
 */
export class ByteArray implements BoyerMooreBytes{
  private bytes: Uint8Array;
  constructor(arrbuf: ArrayBuffer) {
    this.bytes = new Uint8Array(arrbuf);
  }

  get length(): number { return this.bytes.length; }

  public at(index: number) {
    return this.bytes.at(index);
  }
}
