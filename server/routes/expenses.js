const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const logActivity = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const expense = new Expense(req.body);
  try {
    const newExpense = await expense.save();
    await logActivity(req, 'CREATE', 'Expense', newExpense._id, { category: newExpense.category, description: newExpense.description, amount: newExpense.amount });
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    if (role === 'coordinator') {
      return res.status(403).json({ message: 'Unauthorized: Coordinators cannot edit expenses.' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (req.body.verifiedByTreasurer !== undefined) {
      if (expense.verifiedByTreasurer === req.body.verifiedByTreasurer) {
        return res.status(400).json({ message: 'State identical. Verification already processed.' });
      }
    }
    const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedExpense) return res.status(404).json({ message: 'Expense not found' });

    let action = 'UPDATE';
    if (req.body.verifiedByTreasurer !== undefined) {
      action = req.body.verifiedByTreasurer ? 'VERIFY' : 'UNVERIFY';
    }
    await logActivity(req, action, 'Expense', updatedExpense._id, { description: updatedExpense.description });

    res.json(updatedExpense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    if (role === 'coordinator') {
      return res.status(403).json({ message: 'Unauthorized: Coordinators cannot delete expenses.' });
    }
    const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
    if (!deletedExpense) return res.status(404).json({ message: 'Expense not found' });
    
    await logActivity(req, 'DELETE', 'Expense', deletedExpense._id, { description: deletedExpense.description });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
