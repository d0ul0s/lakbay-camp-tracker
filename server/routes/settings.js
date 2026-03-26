const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ churchList: [], merchCosts: {} });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
      await settings.save();
      return res.json(settings);
    }
    settings.churchList = req.body.churchList !== undefined ? req.body.churchList : settings.churchList;
    settings.merchCosts = req.body.merchCosts !== undefined ? req.body.merchCosts : settings.merchCosts;
    settings.ministries = req.body.ministries !== undefined ? req.body.ministries : settings.ministries;
    settings.expenseCategories = req.body.expenseCategories !== undefined ? req.body.expenseCategories : settings.expenseCategories;
    settings.paymentMethods = req.body.paymentMethods !== undefined ? req.body.paymentMethods : settings.paymentMethods;
    settings.shirtSizePhoto = req.body.shirtSizePhoto !== undefined ? req.body.shirtSizePhoto : settings.shirtSizePhoto;
    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
