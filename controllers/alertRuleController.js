const AlertRule = require('../models/AlertRule');
const mongoose = require('mongoose');

// GET /api/alert-rules
exports.getAlertRules = async (req, res) => {
  try {
    const rules = await AlertRule.find({ createdBy: req.user._id }).populate('vehicles');
    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
};

// GET /api/alert-rules/:id
exports.getAlertRule = async (req, res) => {
  try {
    const rule = await AlertRule.findOne({ _id: req.params.id, createdBy: req.user._id }).populate('vehicles');
    if (!rule) return res.status(404).json({ error: 'Alert rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get alert rule' });
  }
};

// POST /api/alert-rules
exports.createAlertRule = async (req, res) => {
  try {
    const { name, type, threshold, vehicles, notifications } = req.body;

    const rule = await AlertRule.create({
      name,
      type,
      threshold,
      vehicles,
      notifications,
      createdBy: req.user._id
    });

    res.status(201).json(rule);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message || 'Failed to create alert rule' });
  }
};

// PUT /api/alert-rules/:id
exports.updateAlertRule = async (req, res) => {
  try {
    const rule = await AlertRule.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    );
    if (!rule) return res.status(404).json({ error: 'Alert rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
};

// DELETE /api/alert-rules/:id
exports.deleteAlertRule = async (req, res) => {
  try {
    const result = await AlertRule.deleteOne({ _id: req.params.id, createdBy: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Alert rule not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
};

// PATCH /api/alert-rules/:id/toggle
exports.toggleAlertRule = async (req, res) => {
  try {
    const rule = await AlertRule.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!rule) return res.status(404).json({ error: 'Alert rule not found' });

    rule.enabled = !rule.enabled;
    await rule.save();

    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle alert rule' });
  }
};
