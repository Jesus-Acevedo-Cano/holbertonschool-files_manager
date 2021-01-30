import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import ErrorMessage from '../utils/errorMessage';

const { ObjectId } = require('mongodb');

class UsersController {
  static async postNew(req, res) {
    const userEmail = req.body.email;
    if (!userEmail) return ErrorMessage.missing(res, 'email');

    const userPassword = req.body.password;
    if (!userPassword) return ErrorMessage.missing(res, 'password');

    const emailExist = await dbClient.getUser({ email: userEmail });
    if (emailExist) return ErrorMessage.emailExist(res);

    const passwordHashed = sha1(userPassword);
    const user = await dbClient.createUser({ email: userEmail, password: passwordHashed });

    return res.status(201).send({ id: user.insertedId, email: userEmail });
  }

  static async getMe(req, res) {
    const xToken = req.header('X-Token') || null;
    if (!xToken) return ErrorMessage.unauthorized(res);

    const authToken = await redisClient.get(`auth_${xToken}`);
    if (!authToken) return ErrorMessage.unauthorized(res);

    const user = await dbClient.getUser({ _id: ObjectId(authToken) });
    if (!user) return ErrorMessage.unauthorized(res);

    delete user.password;

    return res.status(200).send({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
