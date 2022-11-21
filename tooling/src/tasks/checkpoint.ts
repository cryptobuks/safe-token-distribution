import {
  SNAPSHOT_FREQUENCY_IN_MINUTES,
  VESTING_CREATION_BLOCK,
} from "../config";
import { createMerkleTree } from "../domain/checkpoint";
import { validateShallow } from "../domain/schedule";
import {
  generate as generateIntervals,
  isPast as isPastInterval,
} from "../intervals";
import { loadAllocation, loadSchedule, saveDistribution } from "../persistence";
import { Snapshot, merge } from "../snapshot";
import { Provider } from "@ethersproject/providers";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("checkpoint:generate", "")
  .addOptionalParam(
    "inception",
    "vesting start block",
    VESTING_CREATION_BLOCK,
    types.int,
  )
  .addOptionalParam(
    "frequency",
    "distribution snapshot frequency in minutes",
    SNAPSHOT_FREQUENCY_IN_MINUTES,
    types.int,
  )
  .setAction(
    async ({ inception, frequency }, hre: HardhatRuntimeEnvironment) => {
      const log = (text: string) => console.info(`checkpoint:generate ${text}`);

      const providers = getProviders(hre);
      const schedule = loadSchedule();

      log("Starting");
      await ensureScheduleIsFresh(
        inception,
        frequency,
        schedule,
        providers.mainnet,
      );

      let distributionMainnet: Snapshot = {};
      let distributionGC: Snapshot = {};

      for (const entry of schedule) {
        const allocationMainnet = loadAllocation(
          "mainnet",
          entry.mainnet.blockNumber,
        );
        const allocationGC = loadAllocation("gc", entry.gc.blockNumber);

        if (!allocationMainnet || !allocationGC) {
          throw new Error(
            `Allocation Not Calculated ${entry.mainnet.blockNumber}`,
          );
        }
        distributionMainnet = merge(distributionMainnet, allocationMainnet);
        distributionGC = merge(distributionGC, allocationGC);
      }

      saveDistribution(createMerkleTree(distributionMainnet));
      saveDistribution(createMerkleTree(distributionGC));
    },
  );

async function ensureScheduleIsFresh(
  inception: number,
  frequency: number,
  schedule: any[],
  provider: Provider,
) {
  const intervals = generateIntervals(
    await provider.getBlock(inception),
    frequency,
  ).filter(isPastInterval);

  validateShallow(intervals, schedule);
  if (intervals.length !== schedule.length) {
    throw new Error(
      "The schedule found in Disk is valid, but should be expanded further",
    );
  }
}

function getProviders(hre: HardhatRuntimeEnvironment) {
  const mainnet = new hre.ethers.providers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  );

  const gc = new hre.ethers.providers.JsonRpcProvider(
    `https://rpc.gnosischain.com `,
  );

  return { mainnet, gc };
}