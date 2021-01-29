class ErrorMessage {
  static missing(res, nameMissArg) {
    return res.status(400).send({error: `Missing ${nameMissArg}`});
  }

  static emailExist(res) {
    return res.status(400).send({ error: 'Already exist' });
  }

  static unauthorized(res) {
    return res.status(401).send({error: 'Unauthorized'});
  }

  static errorParentId(res, message) {
    return res.status(400).send({error: message});
  }

  static notFound(res) {
    return res.status(404).send({error: 'Not found'});
  }
}

export default ErrorMessage;
