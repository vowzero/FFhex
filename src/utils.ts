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
    bytes[0]= 0xc0;
    bytes[1]= 0x00;
    bytes[2]= 0x00;
    bytes[3]= 0x00;
    bytes[4]= 0x00;
    bytes[5]= 0x00;
    bytes[6]= 0x00;
    bytes[7]= 0x00;
    bytes[8]= 0x00;
    bytes[9]= 0x00;
    bytes[10]=0x00;
    bytes[11]=0x00;
    bytes[12]=0x00;
    bytes[13]=0x00;
    bytes[14]=0x00;
    bytes[15]=0x01;
    // e:15bit
    let s: number = (bytes[0] & 0x80) > 0 ? 1 : 0;
    let e: number = ((bytes[0] & 0x7F) << 8) + ((bytes[1] & 0xFF) << 0);
    let x: number = 0;
    for (let i = 2; i < 16; i++)x += bytes[i] << (8 * (15 - i));
    x /= Math.pow(2, 112);

    let res: number = Math.pow(-1, s) * ((1 + x) * Math.pow(2, e - 16383));
    console.log(s,e,x,1+x);
    return res.toString();
  }
}

