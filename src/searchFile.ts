

import WorkerPool from "@/modules/WorkerPool";
import boyerMoore from "@/modules/Boyer-Moore";
import { ByteArray, FileReadResult, readFileSlice } from "@/utils";

const commandSearch = (file: Blob, offset: number, length: number, patternBuffer: ArrayBuffer) => {
  readFileSlice(file, offset, length).then((frr: FileReadResult) => {
    const byteArray = new ByteArray(frr.result as ArrayBuffer);
    const pattern = new ByteArray(patternBuffer as ArrayBuffer);
    const strMatchRes = boyerMoore<ByteArray>(byteArray, pattern);
    WorkerPool.resolve({ offset: frr.offset, results: strMatchRes });
  });
};

WorkerPool.register("search", commandSearch);
