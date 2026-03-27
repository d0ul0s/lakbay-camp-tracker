const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const logActivity = require('../utils/logger');
const { attachPermissions, requirePermission } = require('../middleware/permissions');

router.use(attachPermissions);

router.get('/', requirePermission('expenses', 'view'), async (req, res) => {
  try {
    const expenses = await Expense.find();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', requirePermission('expenses', 'add'), async (req, res) => {
  const expense = new Expense({ ...req.body, createdBy: req.user.id });
  try {
    const newExpense = await expense.save();
    await logActivity(req, 'CREATE', 'Expense', newExpense._id, { category: newExpense.category, description: newExpense.description, amount: newExpense.amount });
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/batch', requirePermission('expenses', 'add'), async (req, res) => {
  try {
    const { expenses } = req.body;
    if (!Array.isArray(expenses)) return res.status(400).json({ message: 'Payload must be an array of expenses.' });
    
    const savedDocs = [];
    for (const data of expenses) {
      const expense = new Expense({ ...data, createdBy: req.user.id });
      const newExpense = await expense.save();
      await logActivity(req, 'CREATE', 'Expense', newExpense._id, { category: newExpense.category, description: newExpense.description, amount: newExpense.amount });
      savedDocs.push(newExpense);
    }
    
    res.status(201).json(savedDocs);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].expenses;
      if (!perms.editOwn && !perms.editAny) {
        return res.status(403).json({ message: 'Forbidden: you do not have edit permissions on expenses.' });
      }
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].expenses;
      if (expense.createdBy && expense.createdBy.toString() !== req.user.id && !perms.editAny) {
        return res.status(403).json({ message: 'Unauthorized: You can only edit your own logged expenses.' });
      }
    }

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
    await logActivity(req, action, 'Expense', updatedExpense._id, { description: updatedExpense.description }, expense, updatedExpense);

    res.json(updatedExpense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].expenses;
      if (!perms.deleteOwn && !perms.deleteAny) {
         return res.status(403).json({ message: 'Forbidden: you do not have delete permissions on expenses.' });
      }
    }
    
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].expenses;
      if (expense.createdBy && expense.createdBy.toString() !== req.user.id && !perms.deleteAny) {
         return res.status(403).json({ message: 'Unauthorized: You can only delete your own logged expenses.' });
      }
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
