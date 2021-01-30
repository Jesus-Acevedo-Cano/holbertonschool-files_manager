import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import ErrorMessage from '../utils/errorMessage';

const { ObjectId } = require('mongodb');
const fs = require('fs');

class FilesController {
  static async postUpload(req, res) {
    const xToken = req.header('X-Token') || null;
    if (!xToken) return ErrorMessage.unauthorized(res);

    const authToken = await redisClient.get(`auth_${xToken}`);
    if (!authToken) return ErrorMessage.unauthorized(res);

    const user = await dbClient.getUser({ _id: ObjectId(authToken) });
    if (!user) return ErrorMessage.unauthorized(res);

    const { name } = req.body;
    if (!name) return ErrorMessage.missing(res, 'name');

    const { type } = req.body;
    if (!type || !['folder', 'file', 'image'].includes(type)) return ErrorMessage.missing(res, 'type');

    const { data } = req.body;
    if (!data && ['file', 'image'].includes(type)) return ErrorMessage.missing(res, 'data');

    const isPublic = req.body.isPublic || false;
    let parentId = req.body.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;
    if (parentId !== 0) {
      const parentFile = await dbClient.getFile({ _id: ObjectId(parentId) });
      if (!parentFile) return ErrorMessage.errorParentId(res, 'Parent not found');
      if (!['folder'].includes(parentFile.type)) return ErrorMessage.errorParentId(res, 'Parent is not a folder');
    }

    const file = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    if (['folder'].includes(type)) {
      await dbClient.createFile(file);
      return res.status(201).send({
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
    await dbClient.createFile(file);
    return res.status(201).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getShow(req, res) {
    const xToken = req.header('X-Token') || null;
    if (!xToken) return ErrorMessage.unauthorized(res);

    const authToken = await redisClient.get(`auth_${xToken}`);
    if (!authToken) return ErrorMessage.unauthorized(res);

    const user = await dbClient.getUser({ _id: ObjectId(authToken) });
    if (!user) return ErrorMessage.unauthorized(res);

    const fileId = req.params.id;
    const file = await dbClient.getFile({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return ErrorMessage.notFound(res);

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const xToken = req.header('X-Token') || null;
    if (!xToken) return ErrorMessage.unauthorized(res);

    const authToken = await redisClient.get(`auth_${xToken}`);
    if (!authToken) return ErrorMessage.unauthorized(res);

    const user = await dbClient.getUser({ _id: ObjectId(authToken) });
    if (!user) return ErrorMessage.unauthorized(res);

    let parentId = req.query.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;

    if (parentId !== 0) {
      const folder = await dbClient.getFile({ _id: ObjectId(parentId) });
      if (!folder || folder.type !== 'folder') return res.status(200).send([]);
    }

    const pagination = req.query.page || 0;
    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [{ $match: aggregationMatch }, { $skip: pagination * 20 }, { $limit: 20 }];
    if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const pageFiles = await dbClient.aggregateFiles(aggregateData);
    const files = [];
    await pageFiles.forEach((file) => {
      const fileObj = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      };
      files.push(fileObj);
    });

    return res.send(files);
  }
}

module.exports = FilesController;
