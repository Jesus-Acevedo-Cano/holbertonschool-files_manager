import AppController from '../controllers/AppController';

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
};

export default router;
