const LIGHT = {
  GREEN: "green",
  YELLOW: "yellow",
  RED: "red",
  GRAY: "gray"
};

function mapPipelineStatusToLight(status) {
  switch (status) {
    case "success":
    case "skipped":
      return LIGHT.GREEN;
    case "running":
    case "pending":
    case "created":
    case "manual":
    case "preparing":
    case "waiting_for_resource":
      return LIGHT.YELLOW;
    case "failed":
    case "canceled":
      return LIGHT.RED;
    default:
      return LIGHT.GRAY;
  }
}

function aggregateLight(statusEntries) {
  if (!Array.isArray(statusEntries) || statusEntries.length === 0) {
    return LIGHT.GRAY;
  }

  let hasYellow = false;
  let hasGreen = false;

  for (const entry of statusEntries) {
    const light = mapPipelineStatusToLight(entry.pipelineStatus);
    if (light === LIGHT.RED) {
      return LIGHT.RED;
    }
    if (light === LIGHT.YELLOW) {
      hasYellow = true;
    }
    if (light === LIGHT.GREEN) {
      hasGreen = true;
    }
  }

  if (hasYellow) {
    return LIGHT.YELLOW;
  }
  if (hasGreen) {
    return LIGHT.GREEN;
  }
  return LIGHT.GRAY;
}

function lightEmoji(light) {
  switch (light) {
    case LIGHT.GREEN:
      return "🟢";
    case LIGHT.YELLOW:
      return "🟡";
    case LIGHT.RED:
      return "🔴";
    default:
      return "⚪";
  }
}

function isOngoingPipeline(status) {
  return ["running", "pending", "created", "preparing", "waiting_for_resource"].includes(status);
}

function parseBranchesInput(input) {
  if (!input || typeof input !== "string") {
    return ["main"];
  }

  const branches = input
    .split(",")
    .map((branch) => branch.trim())
    .filter(Boolean);

  return branches.length > 0 ? branches : ["main"];
}

module.exports = {
  LIGHT,
  mapPipelineStatusToLight,
  aggregateLight,
  lightEmoji,
  isOngoingPipeline,
  parseBranchesInput
};
