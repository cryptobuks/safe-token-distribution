import { Snapshot } from "../types";

export default function snapshotMerge(s1: Snapshot, s2: Snapshot): Snapshot {
  // !!this is MUCH slower!!
  // return Object.keys(s1).reduce(
  //   (result, key) => ({
  //     ...result,
  //     [key]: s1[key].add(s2[key] || 0),
  //   }),
  //   s2,
  // );

  //this is faster
  const [dest, src] =
    Object.keys(s1).length > Object.keys(s2).length
      ? [{ ...s1 }, s2]
      : [{ ...s2 }, s1];

  for (const key in src) {
    dest[key] = src[key].add(dest[key] || 0);
  }
  return dest;
}