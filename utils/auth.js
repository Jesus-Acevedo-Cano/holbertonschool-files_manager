import dbClient from './db';
import redisClient from './redis';

const { ObjectId } = require('mongodb');

class Auth {
  static async authorized(req) {
    const xToken = req.header('X-Token') || null;
    if (xToken) {
      const authToken = await redisClient.get(`auth_${xToken}`);
      if (authToken) {
        const user = await dbClient.getUser({ _id: ObjectId(authToken) });
        if (user) return user;
      }
    }
    return null;
  }
}

export default Auth;
