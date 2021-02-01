import sha1 from 'sha1';
import Auth from '../utils/auth';
import dbClient from '../utils/db';
import ErrorMessage from '../utils/errorMessage';

const Bull = require('bull');

class UsersController {
  static async postNew(req, res) {
    const userQueue = new Bull('userQueue');

    const userEmail = req.body.email;
    if (!userEmail) return ErrorMessage.missing(res, 'email');

    const userPassword = req.body.password;
    if (!userPassword) return ErrorMessage.missing(res, 'password');

    const emailExist = await dbClient.getUser({ email: userEmail });
    if (emailExist) return ErrorMessage.emailExist(res);

    const passwordHashed = sha1(userPassword);
    const user = await dbClient.createUser({ email: userEmail, password: passwordHashed });

    userQueue.add({
      userId: user.insertedId,
    });

    return res.status(201).send({ id: user.insertedId, email: userEmail });
  }

  static async getMe(req, res) {
    const user = await Auth.authorized(req);
    if (!user) return ErrorMessage.unauthorized(res);

    delete user.password;

    return res.status(200).send({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
