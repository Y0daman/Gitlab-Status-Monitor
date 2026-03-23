async function requestJson(url, token, options = {}) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["PRIVATE-TOKEN"] = token;
  }

  const response = await fetch(url, { headers });
  const contentType = String(response.headers.get("content-type") || "");
  const bodyText = await response.text();

  if (!response.ok) {
    const preview = bodyText.slice(0, 160).replace(/\s+/g, " ");
    throw new Error(`GitLab API error ${response.status}. Check token and API base URL. Response preview: ${preview}`);
  }

  try {
    const data = JSON.parse(bodyText);
    if (options.withHeaders) {
      return { data, headers: response.headers };
    }
    return data;
  } catch {
    const preview = bodyText.slice(0, 160).replace(/\s+/g, " ");
    if (contentType.includes("text/html") || bodyText.trim().startsWith("<")) {
      throw new Error("Received HTML instead of JSON. API base URL likely wrong. Use a URL ending with /api/v4.");
    }
    throw new Error(`Invalid JSON response from GitLab API. Response preview: ${preview}`);
  }
}

function encodeProjectId(projectId) {
  return encodeURIComponent(projectId);
}

async function fetchLatestPipeline({ apiBaseUrl, projectId, branch, token }) {
  const encodedProjectId = encodeProjectId(projectId);
  const refPart = branch ? `ref=${encodeURIComponent(branch)}&` : "";
  const endpoint = `${apiBaseUrl}/projects/${encodedProjectId}/pipelines?${refPart}per_page=1`;
  const pipelines = await requestJson(endpoint, token);

  if (!Array.isArray(pipelines) || pipelines.length === 0) {
    return null;
  }

  return pipelines[0];
}

async function fetchProjectBranches({ apiBaseUrl, projectId, token }) {
  const encodedProjectId = encodeProjectId(projectId);
  const endpoint = `${apiBaseUrl}/projects/${encodedProjectId}/repository/branches?per_page=100`;
  const branches = await requestJson(endpoint, token);

  if (!Array.isArray(branches)) {
    return [];
  }

  return branches
    .map((branch) => branch && branch.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

async function fetchProjectBranchesWithHeads({ apiBaseUrl, projectId, token }) {
  const encodedProjectId = encodeProjectId(projectId);
  const endpoint = `${apiBaseUrl}/projects/${encodedProjectId}/repository/branches?per_page=100`;
  const branches = await requestJson(endpoint, token);

  if (!Array.isArray(branches)) {
    return [];
  }

  return branches
    .map((branch) => ({
      name: branch && branch.name ? String(branch.name) : "",
      commitId: branch && branch.commit && branch.commit.id ? String(branch.commit.id) : ""
    }))
    .filter((entry) => entry.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchCommitGraph({ apiBaseUrl, projectId, token, limit = 200, branch = "" }) {
  const encodedProjectId = encodeProjectId(projectId);
  const commits = [];
  let page = 1;
  const perPage = Math.min(Math.max(Number(limit) || 200, 20), 100);

  while (commits.length < limit) {
    const refPart = branch ? `&ref_name=${encodeURIComponent(branch)}` : "";
    const allPart = branch ? "all=false" : "all=true";
    const endpoint = `${apiBaseUrl}/projects/${encodedProjectId}/repository/commits?${allPart}&with_stats=false&per_page=${perPage}&page=${page}${refPart}`;
    const result = await requestJson(endpoint, token, { withHeaders: true });
    const batch = Array.isArray(result.data) ? result.data : [];

    commits.push(...batch);

    const nextPage = result.headers.get("x-next-page");
    if (!nextPage || batch.length === 0) {
      break;
    }
    page = Number(nextPage);
    if (!Number.isFinite(page) || page <= 0) {
      break;
    }
  }

  const trimmed = commits.slice(0, limit).map((commit) => ({
    id: String(commit.id || ""),
    shortId: String(commit.short_id || "").slice(0, 8),
    title: String(commit.title || ""),
    authorName: String(commit.author_name || ""),
    authoredDate: String(commit.authored_date || ""),
    parentIds: Array.isArray(commit.parent_ids) ? commit.parent_ids.map((id) => String(id)) : []
  }));

  const branchHeads = await fetchProjectBranchesWithHeads({ apiBaseUrl, projectId, token });

  const mergedMergeRequests = await fetchMergedMergeRequests({ apiBaseUrl, projectId, token, limit: 200 });

  return {
    commits: trimmed,
    branchHeads,
    mergedMergeRequests
  };
}

async function fetchMergedMergeRequests({ apiBaseUrl, projectId, token, limit = 200 }) {
  const encodedProjectId = encodeProjectId(projectId);
  const perPage = 100;
  const rows = [];
  let page = 1;

  while (rows.length < limit) {
    const endpoint = `${apiBaseUrl}/projects/${encodedProjectId}/merge_requests?state=merged&scope=all&order_by=updated_at&sort=desc&per_page=${perPage}&page=${page}`;
    const result = await requestJson(endpoint, token, { withHeaders: true });
    const batch = Array.isArray(result.data) ? result.data : [];
    if (batch.length === 0) {
      break;
    }

    rows.push(
      ...batch.map((mr) => ({
        iid: Number(mr.iid),
        title: String(mr.title || ""),
        webUrl: String(mr.web_url || ""),
        sourceBranch: String(mr.source_branch || ""),
        targetBranch: String(mr.target_branch || ""),
        mergeCommitSha: String(mr.merge_commit_sha || ""),
        squashCommitSha: String(mr.squash_commit_sha || ""),
        sha: String(mr.sha || ""),
        mergedAt: String(mr.merged_at || "")
      }))
    );

    const nextPage = result.headers.get("x-next-page");
    if (!nextPage) {
      break;
    }
    page = Number(nextPage);
    if (!Number.isFinite(page) || page <= 0) {
      break;
    }
  }

  return rows.slice(0, limit);
}

async function fetchProjectDetails({ apiBaseUrl, projectId, token }) {
  const encodedProjectId = encodeProjectId(projectId);
  const endpoint = `${apiBaseUrl}/projects/${encodedProjectId}`;
  const project = await requestJson(endpoint, token);

  return {
    id: String(project.id || projectId),
    name: String(project.name_with_namespace || project.name || project.path_with_namespace || projectId)
  };
}

module.exports = {
  fetchLatestPipeline,
  fetchProjectBranches,
  fetchProjectDetails,
  fetchCommitGraph
};
