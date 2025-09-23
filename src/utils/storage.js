const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Memory storage adapter
 */
class MemoryStorage {
  constructor() {
    this.data = {};
  }

  async get(key) {
    return this.data[key];
  }

  async set(key, value) {
    this.data[key] = value;
  }

  async clear() {
    this.data = {};
  }
}

/**
 * File storage adapter
 */
class FileStorage {
  constructor(filePath) {
    this.filePath = filePath || path.join(os.homedir(), '.claude-oauth', 'tokens.json');
  }

  async ensureDirectory() {
    const dir = path.dirname(this.filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async get(key) {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const json = JSON.parse(data);

      // Handle both flat format (authenticate.js) and nested format
      if (key === 'tokens') {
        // If the file has a 'tokens' key, return that
        if (json.tokens) return json.tokens;
        // Otherwise, if it has 'access' at root, it's flat format
        if (json.access) return json;
        // Otherwise return the nested value
        return json[key];
      }

      return json[key];
    } catch {
      return null;
    }
  }

  async set(key, value) {
    await this.ensureDirectory();

    // For tokens, save in flat format for compatibility with authenticate.js
    if (key === 'tokens') {
      await fs.writeFile(this.filePath, JSON.stringify(value, null, 2));
    } else {
      let data = {};
      try {
        const existing = await fs.readFile(this.filePath, 'utf8');
        data = JSON.parse(existing);
      } catch {
        // File doesn't exist or is invalid
      }

      data[key] = value;
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }
  }

  async clear() {
    try {
      await fs.unlink(this.filePath);
    } catch {
      // File doesn't exist
    }
  }
}

/**
 * Create storage adapter based on type
 * @param {string|Object} type - Storage type or custom adapter
 * @param {Object} options - Storage options
 * @returns {Object} Storage adapter
 */
function createStorage(type = 'memory', options = {}) {
  if (typeof type === 'object') {
    // Custom storage adapter
    return type;
  }

  switch (type) {
    case 'file':
      return new FileStorage(options.path);
    case 'memory':
    default:
      return new MemoryStorage();
  }
}

module.exports = {
  MemoryStorage,
  FileStorage,
  createStorage
};