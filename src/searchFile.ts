import WorkerPool from "@/modules/WorkerPool";
import boyerMoore from "@/modules/Boyer-Moore";
import { ByteArray } from "@/utils";
import { FileReadResult } from "./modules/IO";
import { PieceTableClone } from "./modules/DataSource";

const commandSearch = (dataSource: PieceTableClone, offset: number, length: number, patternBuffer: ArrayBuffer) => {
  dataSource = new PieceTableClone(dataSource);
  dataSource.slice(offset, length).then((frr: FileReadResult) => {
    const byteArray = new ByteArray(frr.result as ArrayBuffer);
    const pattern = new ByteArray(patternBuffer as ArrayBuffer);
    const strMatchRes = boyerMoore<ByteArray>(byteArray, pattern);
    WorkerPool.resolve({ offset: frr.offset, results: strMatchRes });
  });
};

WorkerPool.register("search", commandSearch);
