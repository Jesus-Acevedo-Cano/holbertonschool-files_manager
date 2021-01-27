const redis = require("redis");

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (error) => console.log(error));
  }
  isAlive() {
    return this.client.connected;
  }
  async get(key) {
    return this.client.get(key) || null;
  }
  async set(key, value, duration) {
    this.client.set(key, value, 'EX', duration);
  }
  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
