import db from '../utils/db';
import redis from '../utils/redis';

class AppController {
  static getStatus(req, res) {
    const dict = { redis: redis.isAlive(), db: db.isAlive() };
    return res.status(200).send(dict);
  }

  static async getStats(req, res) {
    const dict = { users: await db.nbUsers(), files: await db.nbFiles() };
    return res.status(200).send(dict);
  }
}

module.exports = AppController;
