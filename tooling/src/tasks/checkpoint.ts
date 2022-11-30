import { task } from "hardhat/config";

import createMerkleTree from "../fns/createMerkleTree";
import snapshotMerge from "../fns/snapshotMerge";

import { loadAllocation, loadSchedule, saveCheckpoint } from "../persistence";

import { Snapshot } from "../types";

task("checkpoint:generate", "").setAction(async () => {
  const log = (text: string) => console.info(`checkpoint:generate ${text}`);

  const schedule = loadSchedule();

  log("Starting");

  let checkpointMainnet: Snapshot = {};
  let checkpointGC: Snapshot = {};

  for (const entry of schedule) {
    const allocationMainnet = loadAllocation(
      "mainnet",
      entry.mainnet.blockNumber,
    );
    const allocationGC = loadAllocation("gc", entry.gc.blockNumber);

    if (!allocationMainnet) {
      throw new Error(
        `Mainnet Allocation Not Calculated ${entry.mainnet.blockNumber}`,
      );
    }

    if (!allocationGC) {
      throw new Error(`GC Allocation Not Calculated ${entry.gc.blockNumber}`);
    }

    checkpointMainnet = snapshotMerge(checkpointMainnet, allocationMainnet);
    checkpointGC = snapshotMerge(checkpointGC, allocationGC);
  }

  const treeMainnet = createMerkleTree(checkpointMainnet);
  const treeGC = createMerkleTree(checkpointGC);

  saveCheckpoint(checkpointMainnet, treeMainnet);
  saveCheckpoint(checkpointGC, treeGC);

  return [treeMainnet.root, treeGC.root];
});
