import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db';
import check from '../utils/check';
import redis from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const auth = req.header('Authorization') || null;
    if (!auth) return check.unauthorized(res);

    const buff = Buffer.from(auth.replace('Basic ', ''), 'base64');
    const credentials = {
      email: buff.toString('utf-8').split(':')[0],
      password: buff.toString('utf-8').split(':')[1],
    };

    if (!credentials.email || !credentials.password) return check.unauthorized(res);

    credentials.password = sha1(credentials.password);

    const userExists = await db.getUser(credentials);
    if (!userExists) return check.unauthorized(res);

    const token = uuidv4();
    const key = `auth_${token}`;
    await redis.set(key, userExists._id.toString(), 86400);

    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const xToken = req.header('X-Token') || null;
    if (!xToken) return check.unauthorized(res);

    const authToken = await redis.get(`auth_${xToken}`);
    if (!authToken) return check.unauthorized(res);

    await redis.del(`auth_${xToken}`);
    return res.status(204).send();
  }
}

module.exports = AuthController;
