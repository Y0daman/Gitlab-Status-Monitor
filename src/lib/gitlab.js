async function requestJson(url, token) {
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
    return JSON.parse(bodyText);
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
  const endpoint = `${apiBaseUrl}/projects/${encodedProjectId}/pipelines?ref=${encodeURIComponent(branch)}&per_page=1`;
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
  fetchProjectDetails
};
