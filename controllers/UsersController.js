import sha1 from 'sha1';
import db from '../utils/db';
import check from '../utils/check';
import redis from '../utils/redis';

const { ObjectId } = require('mongodb');

class UsersController {
  static async postNew(req, res) {
    const userEmail = req.body.email;
    if (!userEmail) return check.missing(res, 'email');

    const userPassword = req.body.password;
    if (!userPassword) return check.missing(res, 'password');

    const emailExist = await db.getUser({ email: userEmail });
    if (emailExist) return check.emailExist(res);

    const passwordHashed = sha1(userPassword);
    const user = await db.createUser({ email: userEmail, password: passwordHashed });

    return res.status(201).send({ id: user.insertedId, email: userEmail });
  }

  static async getMe(req, res) {
    const xToken = req.header('X-Token') || null;
    if (!xToken) return check.unauthorized(res);

    const authToken = await redis.get(`auth_${xToken}`);
    if (!authToken) return check.unauthorized(res);

    const user = await db.getUser({ _id: ObjectId(authToken) });
    if (!user) return check.unauthorized(res);

    delete user.password;

    return res.status(200).send({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
