function statusToLight(status) {
  switch (status) {
    case "success":
    case "skipped":
      return "green";
    case "running":
    case "pending":
    case "created":
    case "manual":
    case "preparing":
    case "waiting_for_resource":
      return "yellow";
    case "failed":
    case "canceled":
      return "red";
    default:
      return "gray";
  }
}

const elements = {
  refreshBtn: document.getElementById("refresh-btn"),
  saveTokenBtn: document.getElementById("save-token-btn"),
  saveApiBtn: document.getElementById("save-api-btn"),
  savePollBtn: document.getElementById("save-poll-btn"),
  saveStartupBtn: document.getElementById("save-startup-btn"),
  saveUpdatePathBtn: document.getElementById("save-update-path-btn"),
  checkUpdateBtn: document.getElementById("check-update-btn"),
  installUpdateBtn: document.getElementById("install-update-btn"),
  loadBranchesBtn: document.getElementById("load-branches-btn"),
  submitProjectBtn: document.getElementById("submit-project-btn"),
  tokenInput: document.getElementById("token"),
  apiBaseInput: document.getElementById("api-base"),
  pollIntervalInput: document.getElementById("poll-interval"),
  launchOnStartupInput: document.getElementById("launch-on-startup"),
  updatePathInput: document.getElementById("update-path"),
  startupSupportNote: document.getElementById("startup-support-note"),
  updateStatus: document.getElementById("update-status"),
  tokenActive: document.getElementById("token-active"),
  tokenSource: document.getElementById("token-source"),
  envTokenFound: document.getElementById("env-token-found"),
  lastUpdate: document.getElementById("last-update"),
  addProjectForm: document.getElementById("add-project-form"),
  projectIdInput: document.getElementById("project-id"),
  projectBranchesInput: document.getElementById("project-branches"),
  projectsTable: document.getElementById("projects-table"),
  statusTable: document.getElementById("status-table"),
  repoProjectSelect: document.getElementById("repo-project-select"),
  repoBranchSelect: document.getElementById("repo-branch-select"),
  loadTreeBtn: document.getElementById("load-tree-btn"),
  branchTreeGraph: document.getElementById("branch-tree-graph"),
  graphLimitInput: document.getElementById("graph-limit"),
  loadGraphBtn: document.getElementById("load-graph-btn"),
  copyGraphSvgBtn: document.getElementById("copy-graph-svg-btn"),
  downloadGraphSvgBtn: document.getElementById("download-graph-svg-btn"),
  commitGraph: document.getElementById("commit-graph"),
  commitGraphSvgSource: document.getElementById("commit-graph-svg-source"),
  mergeEvents: document.getElementById("merge-events"),
  appTabButtons: document.querySelectorAll(".app-tab-btn"),
  appTabPanels: document.querySelectorAll(".app-tab-panel"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel")
};

let appState = {
  config: null,
  entries: []
};

const repoBranchesCache = new Map();
let lastCommitGraphSvg = "";

function projectDisplayName(project) {
  return project.name || "-";
}

function monitorEntryKey(projectId, branch) {
  return `${String(projectId || "").trim()}::${String(branch || "").trim()}`;
}

function pausedEntrySet() {
  const pausedEntries = appState && appState.config && appState.config.ui && Array.isArray(appState.config.ui.pausedEntries)
    ? appState.config.ui.pausedEntries
    : [];
  return new Set(pausedEntries);
}

function renderUpdateOffer(offer) {
  const info = offer || {};
  if (elements.installUpdateBtn) {
    elements.installUpdateBtn.disabled = !Boolean(info.available);
  }

  if (!elements.updateStatus) {
    return;
  }

  if (info.available) {
    elements.updateStatus.textContent = `Update available: ${info.latestVersion} (${info.fileName || "installer"})`;
    return;
  }

  if (info.error) {
    elements.updateStatus.textContent = `Update check error: ${info.error}`;
    return;
  }

  elements.updateStatus.textContent = "No newer installer found in update path.";
}

function renderBranchTreeSvg(branches) {
  const root = { key: "root", label: "root", fullPath: "", terminal: false, children: [] };
  const byPath = new Map([["", root]]);
  const colorByFamily = new Map();
  const palette = ["#d43f3a", "#2574a9", "#2c9f45", "#9c27b0", "#ff9800", "#009688", "#607d8b", "#6a4c93", "#b5651d", "#0f766e"];
  let colorIndex = 0;

  const getFamilyColor = (family) => {
    const key = family || "default";
    if (!colorByFamily.has(key)) {
      colorByFamily.set(key, palette[colorIndex % palette.length]);
      colorIndex += 1;
    }
    return colorByFamily.get(key);
  };

  (branches || []).forEach((branch) => {
    const full = String(branch || "").trim();
    if (!full) {
      return;
    }

    const parts = full.split("/").filter(Boolean);
    let parentPath = "";
    const family = parts[0] || "default";

    parts.forEach((part, index) => {
      const currentPath = parentPath ? `${parentPath}/${part}` : part;
      if (!byPath.has(currentPath)) {
        const node = {
          key: currentPath,
          label: part,
          fullPath: currentPath,
          family,
          terminal: false,
          children: []
        };
        byPath.set(currentPath, node);
        byPath.get(parentPath).children.push(node);
      }

      if (index === parts.length - 1) {
        byPath.get(currentPath).terminal = true;
      }

      parentPath = currentPath;
    });
  });

  if (root.children.length === 0) {
    return "No branches found.";
  }

  const verticalStep = 30;
  const horizontalStep = 170;
  let leafIndex = 0;
  let maxDepth = 0;

  const assignPositions = (node, depth) => {
    maxDepth = Math.max(maxDepth, depth);
    if (!node.children || node.children.length === 0) {
      node.x = depth * horizontalStep + 20;
      node.y = leafIndex * verticalStep + 26;
      leafIndex += 1;
      return node.y;
    }

    node.children.sort((a, b) => a.label.localeCompare(b.label));
    const childYs = node.children.map((child) => assignPositions(child, depth + 1));
    node.x = depth * horizontalStep + 20;
    node.y = childYs.reduce((sum, y) => sum + y, 0) / childYs.length;
    return node.y;
  };

  assignPositions(root, 0);

  const nodes = [];
  const edges = [];
  const labels = [];

  const walk = (node) => {
    node.children.forEach((child) => {
      const cx = child.x;
      const cy = child.y;
      const nx = node.x;
      const ny = node.y;
      const branchColor = getFamilyColor(child.family);
      edges.push(`<path d="M ${nx + 8} ${ny} C ${(nx + cx) / 2} ${ny}, ${(nx + cx) / 2} ${cy}, ${cx - 8} ${cy}" stroke="${branchColor}" stroke-width="1.8" fill="none" />`);
      walk(child);
    });

    if (node !== root) {
      const branchColor = getFamilyColor(node.family);
      const fillColor = node.terminal ? branchColor : "#ffffff";
      nodes.push(`<circle cx="${node.x}" cy="${node.y}" r="6" fill="${fillColor}" stroke="${branchColor}" stroke-width="2" />`);
      const label = escapeHtml(node.label);
      const extra = node.terminal ? ` <tspan fill="#6b7280">(${escapeHtml(node.fullPath)})</tspan>` : "";
      labels.push(`<text x="${node.x + 12}" y="${node.y + 4}" font-family="IBM Plex Mono, Menlo, monospace" font-size="12" fill="#1e293b">${label}${extra}</text>`);
    }
  };

  walk(root);

  const width = Math.max(920, (maxDepth + 1) * horizontalStep + 500);
  const height = Math.max(220, leafIndex * verticalStep + 20);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${edges.join("")}${nodes.join("")}${labels.join("")}</svg>`;
}

function normalizeCommits(commits) {
  const seen = new Set();
  const result = [];
  for (const commit of commits || []) {
    const id = String((commit && commit.id) || "");
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(commit);
  }
  return result;
}

function compactLaneAssignments(laneByCommit, rowByCommit, preferredCommitId = "") {
  const intervalsByLane = new Map();

  for (const [commitId, lane] of laneByCommit.entries()) {
    const row = rowByCommit.get(commitId);
    if (row === undefined) {
      continue;
    }
    if (!intervalsByLane.has(lane)) {
      intervalsByLane.set(lane, { start: row, end: row });
    } else {
      const interval = intervalsByLane.get(lane);
      interval.start = Math.min(interval.start, row);
      interval.end = Math.max(interval.end, row);
    }
  }

  const preferredLane = preferredCommitId ? laneByCommit.get(preferredCommitId) : undefined;

  const lanes = Array.from(intervalsByLane.entries())
    .map(([lane, interval]) => ({
      lane,
      start: interval.start,
      end: interval.end,
      span: interval.end - interval.start + 1
    }));

  const oldToNew = new Map();
  const columnIntervals = [];
  const intervalsOverlap = (a, b) => a.start <= b.end && b.start <= a.end;

  const canPlaceInColumn = (col, laneInterval) => {
    const occupied = columnIntervals[col] || [];
    return occupied.every((existing) => !intervalsOverlap(existing, laneInterval));
  };

  const placeInColumn = (col, laneInterval) => {
    if (!columnIntervals[col]) {
      columnIntervals[col] = [];
    }
    columnIntervals[col].push(laneInterval);
    oldToNew.set(laneInterval.lane, col);
  };

  if (preferredLane !== undefined && intervalsByLane.has(preferredLane)) {
    const interval = intervalsByLane.get(preferredLane);
    placeInColumn(0, {
      lane: preferredLane,
      start: interval.start,
      end: interval.end,
      span: interval.end - interval.start + 1
    });
  }

  const remaining = lanes
    .filter((item) => !oldToNew.has(item.lane))
    .sort((a, b) => (a.span - b.span) || (a.start - b.start) || (a.end - b.end) || (a.lane - b.lane));

  for (const item of remaining) {
    const startColumn = preferredLane !== undefined ? 1 : 0;
    let placed = false;

    for (let col = startColumn; col < columnIntervals.length; col += 1) {
      if (!canPlaceInColumn(col, item)) {
        continue;
      }
      placeInColumn(col, item);
      placed = true;
      break;
    }

    if (!placed) {
      placeInColumn(columnIntervals.length, item);
    }
  }

  const compactLaneByCommit = new Map();
  for (const [commitId, lane] of laneByCommit.entries()) {
    compactLaneByCommit.set(commitId, oldToNew.get(lane) ?? lane);
  }

  return compactLaneByCommit;
}

function assignLanes(commits, preferredHeadCommitId = "") {
  const rowByCommit = new Map();
  const laneByCommit = new Map();
  const commitIdSet = new Set((commits || []).map((commit) => commit.id));

  commits.forEach((commit, index) => {
    rowByCommit.set(commit.id, index);
  });

  const activeLanes = [];
  if (preferredHeadCommitId && commitIdSet.has(preferredHeadCommitId)) {
    activeLanes[0] = preferredHeadCommitId;
  }

  const findOrCreateLaneForCommit = (commitId) => {
    let lane = activeLanes.findIndex((id) => id === commitId);
    if (lane >= 0) {
      return lane;
    }

    lane = activeLanes.findIndex((id) => !id);
    if (lane < 0) {
      lane = activeLanes.length;
    }

    activeLanes[lane] = commitId;
    return lane;
  };

  const reserveFreeLane = () => {
    const lane = activeLanes.findIndex((id) => !id);
    if (lane >= 0) {
      return lane;
    }
    return activeLanes.length;
  };

  commits.forEach((commit) => {
    const lane = findOrCreateLaneForCommit(commit.id);
    laneByCommit.set(commit.id, lane);

    const parents = Array.isArray(commit.parentIds) ? commit.parentIds.filter((id) => commitIdSet.has(id)) : [];

    if (parents.length > 0) {
      activeLanes[lane] = parents[0];
      if (!laneByCommit.has(parents[0])) {
        laneByCommit.set(parents[0], lane);
      }

      for (let i = 1; i < parents.length; i += 1) {
        const parentId = parents[i];
        if (laneByCommit.has(parentId)) {
          continue;
        }
        const parentLane = reserveFreeLane();
        activeLanes[parentLane] = parentId;
        laneByCommit.set(parentId, parentLane);
      }
    } else {
      activeLanes[lane] = "";
    }

    for (let i = activeLanes.length - 1; i >= 0; i -= 1) {
      if (activeLanes[i]) {
        break;
      }
      activeLanes.pop();
    }
  });

  return { laneByCommit, rowByCommit };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toRelativeTime(input) {
  if (!input) {
    return "unknown";
  }
  const ts = new Date(input).getTime();
  if (!Number.isFinite(ts)) {
    return "unknown";
  }

  const deltaSec = Math.floor((Date.now() - ts) / 1000);
  if (deltaSec < 60) {
    return `${deltaSec}s ago`;
  }
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) {
    return `${deltaMin}m ago`;
  }
  const deltaH = Math.floor(deltaMin / 60);
  if (deltaH < 24) {
    return `${deltaH}h ago`;
  }
  const deltaD = Math.floor(deltaH / 24);
  if (deltaD < 30) {
    return `${deltaD}d ago`;
  }
  const deltaMo = Math.floor(deltaD / 30);
  if (deltaMo < 12) {
    return `${deltaMo}mo ago`;
  }
  return `${Math.floor(deltaMo / 12)}y ago`;
}

function activateTab(panelId) {
  elements.tabButtons.forEach((button) => {
    const active = button.dataset.tabTarget === panelId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

function activateAppTab(panelId) {
  elements.appTabButtons.forEach((button) => {
    const active = button.dataset.appTabTarget === panelId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  elements.appTabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

function renderCommitGraphSvg(commits, branchHeads, mergeRequests = [], preferredBranch = "") {
  const normalizedCommits = normalizeCommits(commits);
  if (!normalizedCommits || normalizedCommits.length === 0) {
    return "No commits found.";
  }

  const preferredHead = (branchHeads || []).find((head) => head && head.name === preferredBranch);
  const preferredHeadCommitId = preferredHead ? preferredHead.commitId : "";
  const { laneByCommit, rowByCommit } = assignLanes(normalizedCommits, preferredHeadCommitId);
  const compactLaneByCommit = compactLaneAssignments(laneByCommit, rowByCommit, preferredHeadCommitId);
  const lanePalette = ["#d43f3a", "#2574a9", "#2c9f45", "#9c27b0", "#ff9800", "#009688", "#607d8b", "#795548"];
  const rowGap = 28;
  const laneGap = 26;
  const topPad = 48;
  const leftPad = 26;
  const labelX = 220;

  const maxLane = normalizedCommits.reduce((max, commit) => Math.max(max, compactLaneByCommit.get(commit.id) || 0), 0);
  const width = Math.max(980, labelX + 680, leftPad + (maxLane + 1) * laneGap + 120);
  const height = topPad + normalizedCommits.length * rowGap + 30;

  const branchLabelByCommit = new Map();
  (branchHeads || []).forEach((head) => {
    if (!head || !head.commitId) {
      return;
    }
    if (!branchLabelByCommit.has(head.commitId)) {
      branchLabelByCommit.set(head.commitId, []);
    }
    branchLabelByCommit.get(head.commitId).push(head.name);
  });

  const mrByCommit = new Map();
  (mergeRequests || []).forEach((mr) => {
    const key = mr.mergeCommitSha || mr.squashCommitSha || mr.sha;
    if (!key) {
      return;
    }
    if (!mrByCommit.has(key)) {
      mrByCommit.set(key, []);
    }
    mrByCommit.get(key).push(mr);
  });

  const laneLines = [];
  for (let lane = 0; lane <= maxLane; lane += 1) {
    const x = leftPad + lane * laneGap;
    laneLines.push(`<line x1="${x}" y1="8" x2="${x}" y2="${height - 10}" stroke="#e2e8f3" stroke-width="1" />`);
  }

  const edges = [];
  const nodes = [];
  const labels = [];

  labels.push(`<text x="12" y="16" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="12" fill="#334155">Legend: solid = first parent, dashed = merge parent, double-ring = merge commit, branch-head names are shown near graph nodes</text>`);

  normalizedCommits.forEach((commit, row) => {
    const x = leftPad + (compactLaneByCommit.get(commit.id) || 0) * laneGap;
    const y = topPad + row * rowGap;
    const color = lanePalette[(compactLaneByCommit.get(commit.id) || 0) % lanePalette.length];
    const parents = Array.isArray(commit.parentIds) ? commit.parentIds : [];

    parents.forEach((parentId, parentIndex) => {
      const parentRow = rowByCommit.get(parentId);
      const parentLane = compactLaneByCommit.get(parentId);
      if (parentRow === undefined || parentLane === undefined) {
        if (parentIndex > 0) {
          const offX = x + 36 + parentIndex * 10;
          const offY = y + 12;
          edges.push(`<path d="M ${x} ${y} C ${x + 18} ${y}, ${offX - 8} ${offY}, ${offX} ${offY}" stroke="#b91c1c" stroke-width="2" fill="none" stroke-dasharray="4 4" />`);
          labels.push(`<text x="${offX + 5}" y="${offY + 4}" font-family="IBM Plex Mono, Menlo, monospace" font-size="11" fill="#b91c1c">merge parent not in window</text>`);
        }
        return;
      }

      const px = leftPad + parentLane * laneGap;
      const py = topPad + parentRow * rowGap;
      const edgeColor = lanePalette[parentLane % lanePalette.length];
      const dash = parentIndex > 0 ? " stroke-dasharray=\"5 4\"" : "";
      edges.push(`<path d="M ${x} ${y} C ${x} ${(y + py) / 2}, ${px} ${(y + py) / 2}, ${px} ${py}" stroke="${edgeColor}" stroke-width="2" fill="none"${dash} />`);
    });

    const isMergeCommit = parents.length > 1;
    nodes.push(`<circle cx="${x}" cy="${y}" r="5" fill="${color}" />`);
    if (isMergeCommit) {
      nodes.push(`<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${color}" stroke-width="1.5" />`);
    }

    const title = escapeHtml(commit.title || "");
    const shortId = escapeHtml(commit.shortId || "");
    const authored = commit.authoredDate ? new Date(commit.authoredDate).toLocaleString() : "";
    const author = escapeHtml(commit.authorName || "");

    let branchBadges = "";
    const headBranches = branchLabelByCommit.get(commit.id) || [];
    if (headBranches.length > 0) {
      branchBadges = ` [${escapeHtml(headBranches.join(", "))}]`;
      const branchInline = headBranches.slice(0, 2).join(", ");
      const extraCount = headBranches.length > 2 ? ` +${headBranches.length - 2}` : "";
      labels.push(
        `<text x="${x + 10}" y="${y - 7}" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="10" fill="${color}">${escapeHtml(branchInline + extraCount)}</text>`
      );
    }

    const commitMrs = mrByCommit.get(commit.id) || [];
    const mrBadges = commitMrs.length > 0
      ? ` [${escapeHtml(commitMrs.map((mr) => `!${mr.iid} ${mr.sourceBranch}->${mr.targetBranch}`).join(", "))}]`
      : "";

    const relative = toRelativeTime(commit.authoredDate);
    const authorPart = author ? ` <${author}>` : "";

    labels.push(
      `<text x="${labelX}" y="${y + 4}" font-family="IBM Plex Mono, Menlo, monospace" font-size="12" fill="#1e293b">${shortId} -${branchBadges}${mrBadges} ${title} (${escapeHtml(relative)})${authorPart}${isMergeCommit ? " [merge]" : ""}</text>`
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${laneLines.join("")}${edges.join("")}${nodes.join("")}${labels.join("")}</svg>`;
}

function renderCommitGraphText(commits, branchHeads, mergeRequests = []) {
  if (!commits || commits.length === 0) {
    return "No commits found.";
  }

  const { laneByCommit, rowByCommit } = assignLanes(commits);
  const maxLane = commits.reduce((max, commit) => Math.max(max, laneByCommit.get(commit.id) || 0), 0);

  const branchLabelByCommit = new Map();
  (branchHeads || []).forEach((head) => {
    if (!head || !head.commitId) {
      return;
    }
    if (!branchLabelByCommit.has(head.commitId)) {
      branchLabelByCommit.set(head.commitId, []);
    }
    branchLabelByCommit.get(head.commitId).push(head.name);
  });

  const mrByCommit = new Map();
  (mergeRequests || []).forEach((mr) => {
    const key = mr.mergeCommitSha || mr.squashCommitSha || mr.sha;
    if (!key) {
      return;
    }
    if (!mrByCommit.has(key)) {
      mrByCommit.set(key, []);
    }
    mrByCommit.get(key).push(mr);
  });

  const lines = [];

  const graphPrefix = (chars) => chars.join(" ");

  commits.forEach((commit) => {
    const lane = laneByCommit.get(commit.id) || 0;
    const parents = Array.isArray(commit.parentIds) ? commit.parentIds : [];

    const nodeChars = Array(maxLane + 1).fill(" ");
    for (let col = 0; col <= maxLane; col += 1) {
      nodeChars[col] = "|";
    }
    nodeChars[lane] = "*";

    const heads = (branchLabelByCommit.get(commit.id) || []).slice().sort((a, b) => a.localeCompare(b));
    const mrItems = (mrByCommit.get(commit.id) || []).map((mr) => `!${mr.iid}`);
    const decorations = [...heads, ...mrItems];
    const decoText = decorations.length > 0 ? `(${decorations.join(", ")}) ` : "";
    const relative = toRelativeTime(commit.authoredDate);
    const title = commit.title || "";
    const author = commit.authorName || "";

    lines.push(`${graphPrefix(nodeChars)} ${commit.shortId || commit.id.slice(0, 8)} - ${decoText}${title} (${relative}) <${author}>`);

    if (parents.length > 0) {
      const connectorChars = Array(maxLane + 1).fill(" ");
      for (let col = 0; col <= maxLane; col += 1) {
        connectorChars[col] = "|";
      }

      parents.forEach((parentId, index) => {
        const pLane = rowByCommit.has(parentId) ? (laneByCommit.get(parentId) || lane) : lane;
        if (index === 0) {
          connectorChars[lane] = "|";
          if (pLane !== lane) {
            connectorChars[lane] = pLane > lane ? "\\" : "/";
          }
          return;
        }

        if (pLane > lane) {
          connectorChars[lane] = "\\";
          for (let col = lane + 1; col < pLane; col += 1) {
            connectorChars[col] = "_";
          }
          connectorChars[pLane] = "/";
        } else if (pLane < lane) {
          connectorChars[lane] = "/";
          for (let col = pLane + 1; col < lane; col += 1) {
            connectorChars[col] = "_";
          }
          connectorChars[pLane] = "\\";
        }
      });

      lines.push(graphPrefix(connectorChars));
    }
  });

  return lines.join("\n");
}

function renderMergeEvents(mergeRequests) {
  if (!mergeRequests || mergeRequests.length === 0) {
    elements.mergeEvents.innerHTML = "<strong>Merge Requests in graph window</strong><div>No merged MRs matched the currently loaded commits.</div>";
    return;
  }

  const items = mergeRequests
    .slice(0, 40)
    .map((mr) => {
      const source = escapeHtml(mr.sourceBranch || "?");
      const target = escapeHtml(mr.targetBranch || "?");
      const title = escapeHtml(mr.title || "");
      const iid = Number(mr.iid);
      const mergedAt = mr.mergedAt ? new Date(mr.mergedAt).toLocaleString() : "";
      const link = mr.webUrl
        ? `<a href="${escapeHtml(mr.webUrl)}" target="_blank" rel="noreferrer">!${iid}</a>`
        : `!${iid}`;
      return `<li>${link} ${source} -> ${target} - ${title}${mergedAt ? ` (${escapeHtml(mergedAt)})` : ""}</li>`;
    })
    .join("");

  elements.mergeEvents.innerHTML = `<strong>Merge Requests in graph window</strong><ul>${items}</ul>`;
}

function setCommitGraphOutput(content) {
  const text = String(content || "");
  const isSvg = text.trimStart().startsWith("<svg");

  if (isSvg) {
    lastCommitGraphSvg = text;
    elements.commitGraph.innerHTML = text;
    elements.commitGraphSvgSource.value = text;
    elements.copyGraphSvgBtn.disabled = false;
    elements.downloadGraphSvgBtn.disabled = false;
    return;
  }

  lastCommitGraphSvg = "";
  elements.commitGraph.textContent = text || "No graph output.";
  elements.commitGraphSvgSource.value = "";
  elements.copyGraphSvgBtn.disabled = true;
  elements.downloadGraphSvgBtn.disabled = true;
}

function renderTreeProjectOptions(projects) {
  const previous = elements.repoProjectSelect.value;
  elements.repoProjectSelect.innerHTML = "";

  if (!projects || projects.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No projects available";
    elements.repoProjectSelect.appendChild(option);
    elements.repoProjectSelect.disabled = true;
    elements.repoBranchSelect.innerHTML = "";
    elements.repoBranchSelect.disabled = true;
    elements.loadTreeBtn.disabled = true;
    elements.loadGraphBtn.disabled = true;
    return;
  }

  elements.repoProjectSelect.disabled = false;
  elements.loadTreeBtn.disabled = false;
  elements.loadGraphBtn.disabled = false;

  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = `${projectDisplayName(project)} (${project.id})`;
    elements.repoProjectSelect.appendChild(option);
  });

  if (previous && projects.some((project) => project.id === previous)) {
    elements.repoProjectSelect.value = previous;
  }

  updateRepoBranchSelect();
}

async function updateRepoBranchSelect() {
  const projectId = String(elements.repoProjectSelect.value || "").trim();
  elements.repoBranchSelect.innerHTML = "";

  if (!projectId) {
    elements.repoBranchSelect.disabled = true;
    return;
  }

  elements.repoBranchSelect.disabled = true;

  try {
    let branches = repoBranchesCache.get(projectId);
    if (!branches) {
      const result = await window.monitorApi.listBranches(projectId);
      branches = Array.isArray(result.branches) ? result.branches : [];
      repoBranchesCache.set(projectId, branches);
    }

    const preferred = branches.includes("main") ? "main" : branches.includes("master") ? "master" : (branches[0] || "");
    const ordered = preferred ? [preferred, ...branches.filter((item) => item !== preferred)] : branches;

    ordered.forEach((branch) => {
      const option = document.createElement("option");
      option.value = branch;
      option.textContent = branch;
      elements.repoBranchSelect.appendChild(option);
    });

    if (ordered.length === 0) {
      const fallback = document.createElement("option");
      fallback.value = "";
      fallback.textContent = "No branches found";
      elements.repoBranchSelect.appendChild(fallback);
      elements.repoBranchSelect.disabled = true;
    } else {
      elements.repoBranchSelect.value = preferred;
      elements.repoBranchSelect.disabled = false;
    }
  } catch {
    const fallback = document.createElement("option");
    fallback.value = "main";
    fallback.textContent = "main";
    elements.repoBranchSelect.appendChild(fallback);
    elements.repoBranchSelect.value = "main";
    elements.repoBranchSelect.disabled = false;
  }
}

async function loadBranchesForProject(projectId, preselectedBranches = [], targetSelect = elements.projectBranchesInput, withLoadingButton = true) {
  const id = String(projectId || "").trim();
  if (!id) {
    return;
  }

  if (withLoadingButton) {
    elements.loadBranchesBtn.disabled = true;
    elements.loadBranchesBtn.textContent = "Loading...";
  }

  try {
    const result = await window.monitorApi.listBranches(id);
    targetSelect.innerHTML = "";

    const allBranches = ["latest", ...(result.branches || [])];
    const uniqueBranches = Array.from(new Set(allBranches));

    for (const branch of uniqueBranches) {
      const option = document.createElement("option");
      option.value = branch;
      option.textContent = branch === "latest" ? "latest (all branches)" : branch;
      option.selected = preselectedBranches.includes(branch) || (!preselectedBranches.length && branch === "main");
      targetSelect.appendChild(option);
    }
  } catch (error) {
    targetSelect.innerHTML = "";
    const fallback = document.createElement("option");
    fallback.value = "main";
    fallback.textContent = "main";
    fallback.selected = true;
    targetSelect.appendChild(fallback);
  } finally {
    if (withLoadingButton) {
      elements.loadBranchesBtn.disabled = false;
      elements.loadBranchesBtn.textContent = "Load Branches";
    }
  }
}

async function wireProjectBranchSelectors(projects) {
  const selectors = elements.projectsTable.querySelectorAll("select[data-project-branch-select]");

  for (const select of selectors) {
    const projectId = String(select.dataset.projectId || "").trim();
    const currentBranch = String(select.dataset.currentBranch || "").trim();
    if (!projectId) {
      continue;
    }

    const project = projects.find((item) => item.id === projectId);
    const selectedBranch = currentBranch || (project && project.branches && project.branches.length > 0 ? project.branches[0] : "main");

    await loadBranchesForProject(projectId, [selectedBranch], select, false);

    select.addEventListener("change", async () => {
      const nextBranch = String(select.value || "").trim();
      if (!nextBranch) {
        return;
      }

      const existingBranches = project && Array.isArray(project.branches) ? project.branches.slice() : [selectedBranch];
      const replacedBranches = existingBranches.map((branch) => (branch === selectedBranch ? nextBranch : branch));
      const unique = Array.from(new Set(replacedBranches.filter(Boolean)));

      select.disabled = true;
      try {
        await window.monitorApi.setProjectBranches({ id: projectId, branches: unique.length > 0 ? unique : [nextBranch] });
        await refreshState();
      } finally {
        select.disabled = false;
      }
    });
  }
}

async function wireStatusBranchSelectors(projects) {
  const selectors = elements.statusTable.querySelectorAll("select[data-status-branch-select]");

  for (const select of selectors) {
    const projectId = String(select.dataset.projectId || "").trim();
    const currentBranch = String(select.dataset.currentBranch || "").trim();
    if (!projectId) {
      continue;
    }

    await loadBranchesForProject(projectId, [currentBranch], select, false);

    select.addEventListener("change", async () => {
      const nextBranch = String(select.value || "").trim();
      if (!nextBranch) {
        return;
      }

      const project = (projects || []).find((item) => item.id === projectId);
      const existingBranches = project && Array.isArray(project.branches) ? project.branches.slice() : [currentBranch || "main"];
      const replacedBranches = existingBranches.map((branch) => (branch === currentBranch ? nextBranch : branch));
      const unique = Array.from(new Set(replacedBranches.filter(Boolean)));

      select.disabled = true;
      try {
        await window.monitorApi.setProjectBranches({ id: projectId, branches: unique.length > 0 ? unique : [nextBranch] });
        await refreshState();
      } finally {
        select.disabled = false;
      }
    });
  }
}

function renderProjects(projects) {
  elements.projectsTable.innerHTML = "";
  const pausedSet = pausedEntrySet();

  if (!projects || projects.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4">No projects configured yet.</td>`;
    elements.projectsTable.appendChild(row);
    return;
  }

  for (const project of projects) {
    const branches = Array.isArray(project.branches) && project.branches.length > 0 ? project.branches : ["main"];
    for (const branch of branches) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="break">${projectDisplayName(project)}</td>
        <td class="break">${project.id}</td>
        <td class="break">${branch}</td>
        <td>
          <div class="action-controls">
            <select data-project-branch-select="1" data-project-id="${project.id}" data-current-branch="${branch}" aria-label="Choose replacement branch for ${project.id}">
              <option>Loading...</option>
            </select>
            <button data-toggle-pause="1" data-project-id="${project.id}" data-current-branch="${branch}" data-paused="${pausedSet.has(monitorEntryKey(project.id, branch)) ? "1" : "0"}">${pausedSet.has(monitorEntryKey(project.id, branch)) ? "Resume" : "Pause"}</button>
            <button data-remove-project-branch="1" data-project-id="${project.id}" data-current-branch="${branch}">Remove</button>
          </div>
        </td>
      `;
      elements.projectsTable.appendChild(row);
    }
  }

  wireProjectBranchSelectors(projects);

  for (const button of elements.projectsTable.querySelectorAll("button[data-remove-project-branch]")) {
    button.addEventListener("click", async () => {
      const projectId = String(button.dataset.projectId || "").trim();
      const currentBranch = String(button.dataset.currentBranch || "").trim();
      if (!projectId || !currentBranch) {
        return;
      }

      const project = (appState && appState.config && appState.config.projects || []).find((item) => item.id === projectId);
      const existingBranches = project && Array.isArray(project.branches) ? project.branches.slice() : [];
      const remaining = existingBranches.filter((branch) => branch !== currentBranch);

      if (remaining.length === 0) {
        await window.monitorApi.removeProject(projectId);
      } else {
        await window.monitorApi.setProjectBranches({ id: projectId, branches: remaining });
      }

      await refreshState();
    });
  }

  for (const button of elements.projectsTable.querySelectorAll("button[data-toggle-pause]")) {
    button.addEventListener("click", async () => {
      const projectId = String(button.dataset.projectId || "").trim();
      const branch = String(button.dataset.currentBranch || "").trim();
      const currentlyPaused = String(button.dataset.paused || "0") === "1";
      if (!projectId || !branch) {
        return;
      }

      button.disabled = true;
      try {
        await window.monitorApi.setBranchPaused({ id: projectId, branch, paused: !currentlyPaused });
        await refreshState();
      } finally {
        button.disabled = false;
      }
    });
  }
}

function renderStatuses(entries) {
  elements.statusTable.innerHTML = "";

  if (!entries || entries.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8">No project branches to monitor.</td>`;
    elements.statusTable.appendChild(row);
    return;
  }

  const pausedSet = pausedEntrySet();

  for (const entry of entries.slice().sort((a, b) => `${a.projectId}:${a.branch}`.localeCompare(`${b.projectId}:${b.branch}`))) {
    const row = document.createElement("tr");
    const light = statusToLight(entry.pipelineStatus);
    const ongoing = entry.isOngoing ? " (ongoing)" : "";
    const details = entry.isPaused
      ? "Monitoring paused"
      : entry.error
      ? `Error: ${entry.error}`
      : entry.pipelineWebUrl
        ? `<a href="${entry.pipelineWebUrl}" target="_blank" rel="noreferrer">Pipeline #${entry.pipelineId || "?"}</a>`
        : "No pipeline found";

    row.innerHTML = `
      <td><span class="pill ${light}">${light.toUpperCase()}</span></td>
      <td class="break">${entry.projectName || "-"}</td>
      <td class="break">${entry.projectId}</td>
      <td>
        <select data-status-branch-select="1" data-project-id="${entry.projectId}" data-current-branch="${entry.branch}" aria-label="Change monitored branch for ${entry.projectId}">
          <option>${entry.branchDisplay || entry.branch}</option>
        </select>
      </td>
      <td>${entry.pipelineStatus || "unknown"}${ongoing}</td>
      <td>${entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "-"}</td>
      <td><button data-status-toggle-pause="1" data-project-id="${entry.projectId}" data-current-branch="${entry.branch}" data-paused="${pausedSet.has(monitorEntryKey(entry.projectId, entry.branch)) ? "1" : "0"}">${pausedSet.has(monitorEntryKey(entry.projectId, entry.branch)) ? "Resume" : "Pause"}</button></td>
      <td class="break">${details}</td>
    `;
    elements.statusTable.appendChild(row);
  }

  wireStatusBranchSelectors((appState && appState.config && appState.config.projects) || []);

  for (const button of elements.statusTable.querySelectorAll("button[data-status-toggle-pause]")) {
    button.addEventListener("click", async () => {
      const projectId = String(button.dataset.projectId || "").trim();
      const branch = String(button.dataset.currentBranch || "").trim();
      const currentlyPaused = String(button.dataset.paused || "0") === "1";
      if (!projectId || !branch) {
        return;
      }

      button.disabled = true;
      try {
        await window.monitorApi.setBranchPaused({ id: projectId, branch, paused: !currentlyPaused });
        await refreshState();
      } finally {
        button.disabled = false;
      }
    });
  }
}

function renderState(payload) {
  appState = payload;
  const { config, entries, generatedAt, hasToken, tokenSource, hasEnvToken, autoLaunchSupported, updateOffer } = payload;

  elements.apiBaseInput.value = config.gitlab.apiBaseUrl;
  elements.pollIntervalInput.value = String(config.pollIntervalSec);
  elements.launchOnStartupInput.checked = Boolean(config.ui && config.ui.launchOnStartup);
  elements.updatePathInput.value = String((config.ui && config.ui.updatePath) || "");
  elements.launchOnStartupInput.disabled = !autoLaunchSupported;
  elements.saveStartupBtn.disabled = !autoLaunchSupported;
  elements.startupSupportNote.textContent = autoLaunchSupported
    ? ""
    : "Auto launch is available in packaged builds on macOS and Windows.";
  elements.tokenActive.textContent = hasToken ? "Yes" : "No";
  elements.tokenSource.textContent = tokenSource || "none";
  elements.envTokenFound.textContent = hasEnvToken ? "Yes" : "No";
  elements.lastUpdate.textContent = generatedAt ? new Date(generatedAt).toLocaleString() : "-";
  renderUpdateOffer(updateOffer);

  renderProjects(config.projects);
  renderTreeProjectOptions(config.projects);
  renderStatuses(entries);
}

async function refreshState() {
  const payload = await window.monitorApi.getState();
  renderState(payload);
}

elements.refreshBtn.addEventListener("click", async () => {
  await window.monitorApi.refresh();
  await refreshState();
});

elements.saveTokenBtn.addEventListener("click", async () => {
  await window.monitorApi.setToken(elements.tokenInput.value);
  elements.tokenInput.value = "";
  await refreshState();
});

elements.saveApiBtn.addEventListener("click", async () => {
  await window.monitorApi.setApiBaseUrl(elements.apiBaseInput.value);
  await refreshState();
});

elements.savePollBtn.addEventListener("click", async () => {
  await window.monitorApi.setPollInterval(Number(elements.pollIntervalInput.value));
  await refreshState();
});

elements.saveStartupBtn.addEventListener("click", async () => {
  await window.monitorApi.setLaunchOnStartup(Boolean(elements.launchOnStartupInput.checked));
  await refreshState();
});

elements.saveUpdatePathBtn.addEventListener("click", async () => {
  await window.monitorApi.setUpdatePath(elements.updatePathInput.value);
  await refreshState();
});

elements.checkUpdateBtn.addEventListener("click", async () => {
  const offer = await window.monitorApi.checkUpdate();
  renderUpdateOffer(offer);
  await refreshState();
});

elements.installUpdateBtn.addEventListener("click", async () => {
  const result = await window.monitorApi.installUpdate();
  if (!result || !result.ok) {
    const message = result && result.message ? result.message : "Failed to launch installer";
    elements.updateStatus.textContent = `Install failed: ${message}`;
    return;
  }

  elements.updateStatus.textContent = `Installer launched: ${result.filePath}`;
});

elements.addProjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedBranch = String(elements.projectBranchesInput.value || "").trim();

  const payload = {
    id: elements.projectIdInput.value,
    branches: [selectedBranch || "main"]
  };

  await window.monitorApi.addProject(payload);

  elements.projectIdInput.value = "";
  elements.projectBranchesInput.innerHTML = "";
  elements.submitProjectBtn.textContent = "Add";
  await refreshState();
});

elements.loadBranchesBtn.addEventListener("click", async () => {
  const projectId = elements.projectIdInput.value.trim();
  if (!projectId) {
    return;
  }
  await loadBranchesForProject(projectId, []);
});

elements.repoProjectSelect.addEventListener("change", async () => {
  await updateRepoBranchSelect();
  elements.branchTreeGraph.textContent = "Project changed. Click Load Branch Tree.";
  setCommitGraphOutput("Project changed. Click Load Commit Graph.");
  elements.mergeEvents.textContent = "";
});

elements.loadTreeBtn.addEventListener("click", async () => {
  const projectId = String(elements.repoProjectSelect.value || "").trim();
  const selectedBranch = String(elements.repoBranchSelect.value || "").trim();
  if (!projectId) {
    elements.branchTreeGraph.textContent = "No project selected.";
    return;
  }

  elements.loadTreeBtn.disabled = true;
  elements.loadTreeBtn.textContent = "Loading...";

  try {
    const result = await window.monitorApi.listBranches(projectId);
    const allBranches = result.branches || [];
    let filteredBranches = allBranches;

    if (selectedBranch) {
      if (selectedBranch.includes("/")) {
        const family = selectedBranch.split("/")[0];
        filteredBranches = allBranches.filter((branch) => branch === selectedBranch || branch.startsWith(`${family}/`));
      } else {
        filteredBranches = allBranches;
      }

      if (filteredBranches.length === 0) {
        filteredBranches = [selectedBranch];
      }
    }

    elements.branchTreeGraph.innerHTML = renderBranchTreeSvg(filteredBranches);
  } catch (error) {
    elements.branchTreeGraph.textContent = `Failed to load branch tree: ${error.message || error}`;
  } finally {
    elements.loadTreeBtn.disabled = false;
    elements.loadTreeBtn.textContent = "Load Branch Tree";
  }
});

elements.loadGraphBtn.addEventListener("click", async () => {
  const projectId = String(elements.repoProjectSelect.value || "").trim();
  const selectedBranch = String(elements.repoBranchSelect.value || "").trim();
  if (!projectId) {
    setCommitGraphOutput("No project selected.");
    return;
  }

  const limit = Math.max(20, Math.min(300, Number(elements.graphLimitInput.value) || 160));
  elements.loadGraphBtn.disabled = true;
  elements.loadGraphBtn.textContent = "Loading...";

  try {
    const result = await window.monitorApi.getCommitGraph({ projectId, limit, branch: selectedBranch });

    const commitIds = new Set((result.commits || []).map((commit) => commit.id));
    const matchedMergeRequests = (result.mergedMergeRequests || []).filter((mr) =>
      commitIds.has(mr.mergeCommitSha) || commitIds.has(mr.squashCommitSha) || commitIds.has(mr.sha)
    );

    setCommitGraphOutput(renderCommitGraphSvg(
      result.commits || [],
      result.branchHeads || [],
      matchedMergeRequests,
      selectedBranch
    ));

    renderMergeEvents(matchedMergeRequests);
  } catch (error) {
    setCommitGraphOutput(`Failed to load commit graph: ${error.message || error}`);
    elements.mergeEvents.textContent = "";
  } finally {
    elements.loadGraphBtn.disabled = false;
    elements.loadGraphBtn.textContent = "Load Commit Graph";
  }
});

elements.copyGraphSvgBtn.addEventListener("click", async () => {
  if (!lastCommitGraphSvg) {
    return;
  }

  try {
    await navigator.clipboard.writeText(lastCommitGraphSvg);
    elements.copyGraphSvgBtn.textContent = "Copied";
    setTimeout(() => {
      elements.copyGraphSvgBtn.textContent = "Copy SVG";
    }, 1200);
  } catch {
    elements.copyGraphSvgBtn.textContent = "Copy failed";
    setTimeout(() => {
      elements.copyGraphSvgBtn.textContent = "Copy SVG";
    }, 1500);
  }
});

elements.downloadGraphSvgBtn.addEventListener("click", () => {
  if (!lastCommitGraphSvg) {
    return;
  }

  const blob = new Blob([lastCommitGraphSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "commit-graph.svg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tabTarget);
  });
});

elements.appTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateAppTab(button.dataset.appTabTarget);
  });
});

elements.copyGraphSvgBtn.disabled = true;
elements.downloadGraphSvgBtn.disabled = true;

window.monitorApi.onStatusUpdate((payload) => {
  renderState(payload);
});

refreshState();
