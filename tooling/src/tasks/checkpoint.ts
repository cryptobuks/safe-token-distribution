import { task, types } from "hardhat/config";

import createMerkleTree from "../fns/createMerkleTree";
import snapshotMerge from "../fns/snapshotMerge";
import snapshotSort from "../fns/snapshotSort";

import { loadAllocation, loadSchedule, saveCheckpoint } from "../persistence";

import { BalanceMap } from "../types";

task(
  "checkpoint",
  "Reduces through past allocation files, consolidates it in a BalanceMap and persists it as a MerkleTree",
)
  .addOptionalParam(
    "persist",
    "Should the output files be persisted to the repo?",
    true,
    types.boolean,
  )
  .setAction(async ({ persist }) => {
    const log = (text: string) => console.info(`Task checkpoint -> ${text}`);

    const schedule = loadSchedule();

    log("Starting");

    let checkpointMainnet: BalanceMap = {};
    let checkpointGnosis: BalanceMap = {};

    for (const vestingSlice of schedule) {
      const allocationMainnet = loadAllocation("mainnet", vestingSlice.mainnet);
      const allocationGnosis = loadAllocation("gnosis", vestingSlice.gnosis);

      if (!allocationMainnet) {
        throw new Error(
          `Mainnet allocation not yet calculated ${vestingSlice.mainnet}`,
        );
      }

      if (!allocationGnosis) {
        throw new Error(
          `Gnosis allocation not yet calculated ${vestingSlice.gnosis}`,
        );
      }

      checkpointMainnet = snapshotMerge(checkpointMainnet, allocationMainnet);
      checkpointGnosis = snapshotMerge(checkpointGnosis, allocationGnosis);
    }

    const treeMainnet = createMerkleTree(checkpointMainnet);
    const treeGnosis = createMerkleTree(checkpointGnosis);

    if (persist) {
      log("Saving checkpoints and trees");
      saveCheckpoint(snapshotSort(checkpointMainnet), treeMainnet);
      saveCheckpoint(snapshotSort(checkpointGnosis), treeGnosis);
    }

    log("Done");

    return {
      merkleRootMainnet: treeMainnet.root,
      merkleRootGnosis: treeGnosis.root,
    };
  });
