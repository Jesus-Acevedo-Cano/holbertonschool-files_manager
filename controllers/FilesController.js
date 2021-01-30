import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db';
import redis from '../utils/redis';
import check from '../utils/check';

const { ObjectId } = require('mongodb');
const fs = require('fs');

class FilesController {
  static async postUpload(req, res) {
    const xToken = req.header('X-Token') || null;
    if (!xToken) return check.unauthorized(res);

    const authToken = await redis.get(`auth_${xToken}`);
    if (!authToken) return check.unauthorized(res);

    const user = await db.getUser({ _id: ObjectId(authToken) });
    if (!user) return check.unauthorized(res);

    const { name } = req.body;
    if (!name) return check.missing(res, 'name');

    const { type } = req.body;
    if (!type || !['folder', 'file', 'image'].includes(type)) return check.missing(res, 'type');

    const { data } = req.body;
    if (!data && ['file', 'image'].includes(type)) return check.missing(res, 'data');

    const isPublic = req.body.isPublic || false;
    let parentId = req.body.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;
    if (parentId !== 0) {
      const parentFile = await db.getFile({ _id: ObjectId(parentId) });
      if (!parentFile) return check.errorParentId(res, 'Parent not found');
      if (!['folder'].includes(parentFile.type)) return check.errorParentId(res, 'Parent is not a folder');
    }
    const file = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };
    if (['folder'].includes(type)) {
      await db.createFile(file);
      return res.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const pathUuid = uuidv4();

    const buff = Buffer.from(data, 'base64');
    const path = `${folderPath}/${pathUuid}`;
    await fs.mkdir(folderPath, { recursive: true }, (err) => {
      if (!err) return true;
      return res.status(400).send({ error: err.message });
    });

    await fs.writeFile(path, buff, (err) => {
      if (!err) return true;
      return res.status(400).send({ error: err.message });
    });

    file.localPath = path;
    await db.createFile(file);
    return res.status(201).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }
}

module.exports = FilesController;
