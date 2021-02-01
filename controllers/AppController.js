import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(req, res) {
    const dict = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    return res.status(200).send(dict);
  }

  static async getStats(req, res) {
    const dict = { users: await dbClient.nbUsers(), files: await dbClient.nbFiles() };
    return res.status(200).send(dict);
  }
}

module.exports = AppController;
