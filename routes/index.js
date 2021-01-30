import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';

const express = require('express');

const router = (app) => {
  const paths = express.Router();
  app.use(express.json());
  app.use('/', paths);

  paths.get('/status', ((req, res) => AppController.getStatus(req, res)));
  paths.get('/stats', ((req, res) => AppController.getStats(req, res)));
  paths.post('/users', ((req, res) => UsersController.postNew(req, res)));
  paths.get('/connect', ((req, res) => AuthController.getConnect(req, res)));
  paths.get('/disconnect', ((req, res) => AuthController.getDisconnect(req, res)));
  paths.get('/users/me', ((req, res) => UsersController.getMe(req, res)));
  paths.post('/files', ((req, res) => FilesController.postUpload(req, res)));
  paths.get('/files/:id', ((req, res) => FilesController.getShow(req, res)));
  paths.get('/files', ((req, res) => FilesController.getIndex(req, res)));
  paths.put('/files/:id/publish', ((req, res) => FilesController.putPublish(req, res)));
  paths.put('/files/:id/unpublish', ((req, res) => FilesController.putUnpublish(req, res)));
  paths.get('/files/:id/data', ((req, res) => FilesController.getFile(req, res)));
};

export default router;
