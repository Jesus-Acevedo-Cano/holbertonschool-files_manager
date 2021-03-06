import { v4 as uuidv4 } from 'uuid';
import Auth from '../utils/auth';
import dbClient from '../utils/db';
import ErrorMessage from '../utils/errorMessage';

const fs = require('fs');
const Bull = require('bull');
const mime = require('mime-types');
const { ObjectId } = require('mongodb');

class FilesController {
  static async postUpload(req, res) {
    const fileQueue = new Bull('fileQueue');

    const user = await Auth.authorized(req);
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

    fileQueue.add({
      userId: file.userId,
      fileId: file._id,
    });

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
    const user = await Auth.authorized(req);
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
    const user = await Auth.authorized(req);
    if (!user) return ErrorMessage.unauthorized(res);

    let parentId = req.query.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;

    if (parentId !== 0) {
      if (!ObjectId(parentId)) return ErrorMessage.unauthorized(res);
      parentId = ObjectId(parentId);
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

  static async putPublish(req, res) {
    const user = await Auth.authorized(req);
    if (!user) return ErrorMessage.unauthorized(res);

    const fileId = req.params.id || '';

    let file = await dbClient.getFile({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return ErrorMessage.notFound(res);

    await dbClient.updateFile({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    file = await dbClient.getFile({ _id: ObjectId(fileId), userId: user._id });

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const user = await Auth.authorized(req);
    if (!user) return ErrorMessage.unauthorized(res);

    const fileId = req.params.id || '';

    let file = await dbClient.getFile({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return ErrorMessage.notFound(res);

    await dbClient.updateFile({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    file = await dbClient.getFile({ _id: ObjectId(fileId), userId: user._id });

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getFile(req, res) {
    const fileId = req.params.id || '';
    const size = req.query.size || 0;

    const file = await dbClient.getFile({ _id: ObjectId(fileId) });
    if (!file) return ErrorMessage.notFound(res);

    const { isPublic, userId, type } = file;

    let owner = false;
    const user = await Auth.authorized(req);
    if (user) owner = user._id.toString() === userId.toString();

    if (!isPublic && !owner) return ErrorMessage.notFound(res);
    if (type === 'folder') return ErrorMessage.notContent(res);

    const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;

    try {
      const fileData = fs.readFileSync(path);
      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileData);
    } catch (err) {
      return ErrorMessage.notFound(res);
    }
  }
}

module.exports = FilesController;
