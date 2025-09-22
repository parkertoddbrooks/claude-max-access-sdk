const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * In-memory storage (doesn't persist)
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
 * File-based storage (persists to disk)
 */
class FileStorage {
  constructor(filePath) {
    // Default to ~/.claude-oauth/tokens.json
    this.filePath = filePath || path.join(os.homedir(), '.claude-oauth', 'tokens.json');
  }

  async ensureDir() {
    const dir = path.dirname(this.filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async readData() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid
      return {};
    }
  }

  async writeData(data) {
    await this.ensureDir();
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async get(key) {
    const data = await this.readData();
    return data[key];
  }

  async set(key, value) {
    const data = await this.readData();
    data[key] = value;
    await this.writeData(data);
  }

  async clear() {
    await this.writeData({});
  }
}

/**
 * Custom storage adapter interface
 * Implement these methods for custom storage
 */
class StorageAdapter {
  async get(key) {
    throw new Error('get() must be implemented');
  }

  async set(key, value) {
    throw new Error('set() must be implemented');
  }

  async clear() {
    throw new Error('clear() must be implemented');
  }
}

module.exports = {
  MemoryStorage,
  FileStorage,
  StorageAdapter
};