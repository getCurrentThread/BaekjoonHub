import { b64EncodeUnicode } from "./util.js";
import urls from "@scripts/constants/url.js";
import log from "@scripts/commons/logger.js";

/** get a repo default branch
 * @see https://docs.github.com/en/rest/reference/repos
 * @param {string} hook - the github repository
 * @param {string} token - the github token
 * @return {Promise} - the promise for the branch sha
 */
export async function getDefaultBranchOnRepo(hook, token) {
  log.info("getDefaultBranchOnRepo called with hook:", hook);
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}`, {
    method: "GET",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  })
    .then((res) => {
      log.debug("getDefaultBranchOnRepo response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("getDefaultBranchOnRepo data:", data);
      return data.default_branch;
    });
}

/** get a reference
 * @see https://docs.github.com/en/rest/reference/git#get-a-reference
 * @param {string} hook - github repository
 * @param {string} token - reference name
 * @param {string} ref - reference name
 * @return {Promise} - the promise for the reference sha
 */
export async function getReference(hook, token, branch) {
  log.info("getReference called with hook:", hook, "branch:", branch);
  const defaultBranch = branch || (await getDefaultBranchOnRepo(hook, token));
  log.debug("getReference - defaultBranch:", defaultBranch);
  // return fetch(`https://api.github.com/repos/${hook}/git/refs`, {
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}/git/refs/heads/${defaultBranch}`, {
    method: "GET",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  })
    .then((res) => {
      log.debug("getReference response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("getReference data:", data);
      return { refSHA: data.object.sha, ref: data.ref };
    });
}
/** create a Blob
 * @see https://docs.github.com/en/rest/reference/git#create-a-blob
 * @param {string} hook - github repository
 * @param {string} token - github token
 * @param {string} content - the content on base64 to add the repository
 * @param {string} path - the path to add the repository
 * @return {Promise} - the promise for the tree_item object
 */
export async function createBlob(hook, token, content, path) {
  log.info("createBlob called with hook:", hook, "path:", path);
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({
      content: b64EncodeUnicode(content),
      encoding: "base64",
    }),
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "content-type": "application/json",
    },
  })
    .then((res) => {
      log.debug("createBlob response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("createBlob data:", data);
      return {
        path,
        sha: data.sha,
        mode: "100644",
        type: "blob",
      };
    });
}

/** create a new tree in git
 * @see https://docs.github.com/en/rest/reference/git#create-a-tree
 * @param {string} hook - the github repository
 * @param {string} token - the github token
 * @param {object} treeItems - the tree items
 * @param {string} refSHA - the root sha of the tree
 * @return {Promise} - the promise for the tree sha
 */
export async function createTree(hook, token, refSHA, treeItems) {
  log.info("createTree called with hook:", hook, "refSHA:", refSHA);
  
  const body = { tree: treeItems };
  if (refSHA !== null) {
    body.base_tree = refSHA;
  }
  
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}/git/trees`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "content-type": "application/json",
    },
  })
    .then((res) => {
      log.debug("createTree response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("createTree data:", data);
      return data.sha;
    });
}

/** create a commit in git
 * @see https://docs.github.com/en/rest/reference/git#create-a-commit
 * @param {string} hook - the github repository
 * @param {string} token - the github token
 * @param {string} message - the commit message
 * @param {string} treeSHA - the tree sha
 * @param {string} refSHA - the parent sha
 * @return {Promise} - the promise for the commit sha
 */
export async function createCommit(hook, token, message, treeSHA, refSHA) {
  log.info("createCommit called with hook:", hook, "message:", message);
  
  const body = { message, tree: treeSHA };
  if (refSHA !== null) {
    body.parents = [refSHA];
  }
  
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}/git/commits`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "content-type": "application/json",
    },
  })
    .then((res) => {
      log.debug("createCommit response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("createCommit data:", data);
      return data.sha;
    });
}

/** create a reference
 * @see https://docs.github.com/en/rest/reference/git#create-a-reference
 * @param {string} hook - the github repository
 * @param {string} token - the github token
 * @param {string} ref - the reference name
 * @param {string} commitSHA - the commit sha
 * @return {Promise} - the promise for the reference
 */
export async function createReference(hook, token, ref, commitSHA) {
  log.info("createReference called with hook:", hook, "ref:", ref, "commitSHA:", commitSHA);
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref, sha: commitSHA }),
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "content-type": "application/json",
    },
  })
    .then((res) => {
      log.debug("createReference response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("createReference data:", data);
      return data.ref;
    });
}

/** update a ref
 * @see https://docs.github.com/en/rest/reference/git#update-a-reference
 * @param {string} hook - the github repository
 * @param {string} token - the github token
 * @param {string} ref - the ref to update
 * @param {string} commitSHA - the commit sha
 * @param {boolean} force - force update
 * @return {Promise} - the promise for the http request
 */
export async function updateHead(hook, token, ref, commitSHA, force = true) {
  log.info("updateHead called with hook:", hook, "ref:", ref, "commitSHA:", commitSHA);
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}/git/${ref}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSHA, force }),
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "content-type": "application/json",
    },
  })
    .then((res) => {
      log.debug("updateHead response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("updateHead data:", data);
      return data.sha;
    });
}

/** get a tree recursively
 * @see https://docs.github.com/en/rest/reference/git#get-a-tree
 * @param {string} hook - the github repository
 * @param {string} token - the github token
 * @return {Promise} - the promise for the tree items
 */
export async function getTree(hook, token) {
  log.info("getTree called with hook:", hook);
  return fetch(`${urls.GITHUB_API_REPOS_URL}/${hook}/git/trees/HEAD?recursive=1`, {
    method: "GET",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  })
    .then((res) => {
      log.debug("getTree response:", res);
      return res.json();
    })
    .then((data) => {
      log.debug("getTree data:", data);
      // GitHub API 에러 응답인 경우 빈 배열 반환
      if (data.message || !data.tree) {
        log.warn("getTree error or empty response:", data);
        return [];
      }
      return data.tree;
    })
    .catch((error) => {
      log.error("getTree fetch error:", error);
      return [];
    });
}

export class GitHub {
  constructor(hook, token) {
    log.debug("GitHub constructor", hook, token);
    this.update(hook, token);
  }

  update(hook, token) {
    this.hook = hook;
    this.token = token;
  }

  async getReference(branch) {
    // hook, token, branch
    try {
      return await getReference(this.hook, this.token, branch);
    } catch (error) {
      log.debug("getReference failed, might be empty repository:", error);
      // For empty repositories, return null to indicate first commit
      return null;
    }
  }

  async getDefaultBranchOnRepo() {
    return getDefaultBranchOnRepo(this.hook, this.token);
  }

  async createBlob(content, path) {
    // hook, token, content, path
    return createBlob(this.hook, this.token, content, path);
  }

  async createTree(refSHA, treeItems) {
    // hook, token, baseSHA, tree_items
    log.debug("GitHub createTree", "refSHA:", refSHA, "tree_items:", treeItems);
    return createTree(this.hook, this.token, refSHA, treeItems);
  }

  async createCommit(message, treeSHA, refSHA) {
    // hook, token, message, tree, parent
    log.debug("GitHub createCommit", "message:", message, "treeSHA:", treeSHA, "refSHA:", refSHA);
    return createCommit(this.hook, this.token, message, treeSHA, refSHA);
  }

  async createReference(ref, commitSHA) {
    // hook, token, ref, commitSHA
    log.debug("GitHub createReference", "ref:", ref, "commitSHA:", commitSHA);
    return createReference(this.hook, this.token, ref, commitSHA);
  }

  async updateHead(ref, commitSHA) {
    // hook, token, commitSHA, force = true)
    log.debug("GitHub updateHead", "ref:", ref, "commitSHA:", commitSHA);
    return updateHead(this.hook, this.token, ref, commitSHA, true);
  }

  async getTree() {
    // hook, token
    return getTree(this.hook, this.token);
  }
  
  /**
   * Update or create a file in the repository
   * @param {string} filePath - The path of the file to update
   * @param {string} commitMessage - The commit message
   * @param {string} content - The content of the file
   * @returns {Promise<object>} - The result object with sha
   */
  async updateFile(filePath, commitMessage, content) {
    log.debug("GitHub updateFile", "filePath:", filePath, "commitMessage:", commitMessage);
    
    try {
      // Get the current reference (null for empty repository)
      const reference = await this.getReference();
      const isEmptyRepo = reference === null;
      
      log.debug("GitHub updateFile - repository state:", { isEmptyRepo });
      
      // Create blob for the file content
      const blob = await this.createBlob(content, filePath);
      
      // Create tree with the new blob
      let treeResult;
      if (isEmptyRepo) {
        treeResult = await this.createTree(null, [blob]);
      } else {
        treeResult = await this.createTree(reference.refSHA, [blob]);
      }
      log.debug("GitHub updateFile - tree result:", treeResult);
      
      // Create commit
      let commit;
      if (isEmptyRepo) {
        commit = await this.createCommit(commitMessage, treeResult, null);
      } else {
        commit = await this.createCommit(commitMessage, treeResult, reference.refSHA);
      }
      log.debug("GitHub updateFile - commit result:", commit);
      
      // Update or create head reference
      const commitSha = commit.sha || commit;
      log.debug("GitHub updateFile - using commit sha:", commitSha);
      
      if (isEmptyRepo) {
        await this.createReference("refs/heads/main", commitSha);
      } else {
        await this.updateHead(reference.ref, commitSha);
      }
      
      return {
        sha: commitSha,
        path: filePath,
      };
    } catch (error) {
      log.error("GitHub updateFile error:", error);
      throw error;
    }
  }
  
  /**
   * Update or create multiple files in a single commit
   * @param {Array} files - Array of {filePath, content} objects
   * @param {string} commitMessage - The commit message
   * @returns {Promise<object>} - The result object with sha
   */
  async updateMultipleFiles(files, commitMessage) {
    log.debug("GitHub updateMultipleFiles", "files:", files.length, "commitMessage:", commitMessage);
    
    try {
      // Get the current reference (null for empty repository)
      const reference = await this.getReference();
      const isEmptyRepo = reference === null;
      
      log.debug("GitHub updateMultipleFiles - repository state:", { isEmptyRepo });
      
      // Create blobs for all files
      const blobs = await Promise.all(
        files.map(file => this.createBlob(file.content, file.filePath))
      );
      
      // Create tree
      let treeResult;
      if (isEmptyRepo) {
        // For empty repo, create tree without base_tree
        treeResult = await this.createTree(null, blobs);
      } else {
        // For existing repo, use current reference as base
        treeResult = await this.createTree(reference.refSHA, blobs);
      }
      log.debug("GitHub updateMultipleFiles - tree result:", treeResult);
      
      // Create commit
      let commit;
      if (isEmptyRepo) {
        // For empty repo, create commit without parent
        commit = await this.createCommit(commitMessage, treeResult, null);
      } else {
        // For existing repo, use current reference as parent
        commit = await this.createCommit(commitMessage, treeResult, reference.refSHA);
      }
      log.debug("GitHub updateMultipleFiles - commit result:", commit);
      
      // Update or create head reference
      const commitSha = commit.sha || commit;
      log.debug("GitHub updateMultipleFiles - using commit sha:", commitSha);
      
      if (isEmptyRepo) {
        // For empty repo, create new reference
        await this.createReference("refs/heads/main", commitSha);
      } else {
        // For existing repo, update existing reference
        await this.updateHead(reference.ref, commitSha);
      }
      
      return {
        sha: commitSha,
        files: files.map(f => f.filePath),
      };
    } catch (error) {
      log.error("GitHub updateMultipleFiles error:", error);
      throw error;
    }
  }
}
