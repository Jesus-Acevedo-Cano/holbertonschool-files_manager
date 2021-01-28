import AppController from '../controllers/AppController';

const express = require('express');

const router = (app) => {
  const paths = express.Router();
  app.use(express.json());
  app.use('/', paths);

  paths.get('/status', ((req, res) => AppController.getStatus(req, res)));
  paths.get('/stats', ((req, res) => AppController.getStats(req, res)));
};

export default router;
