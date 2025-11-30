// Rough stress estimation helper for Create contraptions

export function estimateStress(machines, baseStress = 256) {
  const total = machines * baseStress;
  let tier = "low";

  if (total > 4096) tier = "medium";
  if (total > 16384) tier = "high";

  return {
    machines,
    baseStress,
    total,
    tier,
    advice:
      tier === "low"
        ? "A couple of water wheels or a small steam engine array is enough."
        : tier === "medium"
        ? "Use multiple water wheels, a windmill, or a solid steam engine setup."
        : "High demand: consider large steam engines or splitting power networks."
  };
}
