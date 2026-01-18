const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// GET all employees
router.get('/', async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single employee
router.get('/:id', async (req, res) => {
    try {
        const employee = await Employee.findOne({ id: req.params.id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create employee
router.post('/', async (req, res) => {
    const emp = new Employee({
        id: req.body.id,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dob: req.body.dob,
        position: req.body.position,
        salary: req.body.salary,
        branch: req.body.branch,
        joinedDate: req.body.joinedDate,
        bankName: req.body.bankName,
        bankBranch: req.body.bankBranch,
        accountNo: req.body.accountNo,
        accountHolder: req.body.accountHolder
    });

    try {
        const newEmployee = await emp.save();
        res.status(201).json(newEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update employee
router.put('/:id', async (req, res) => {
    try {
        const updatedEmployee = await Employee.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true }
        );
        if (!updatedEmployee) return res.status(404).json({ message: 'Employee not found' });
        res.json(updatedEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE delete employee
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Employee.findOneAndDelete({ id: req.params.id });
        if (!deleted) return res.status(404).json({ message: 'Employee not found' });
        res.json({ message: 'Employee deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
