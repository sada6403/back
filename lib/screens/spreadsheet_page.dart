import 'package:flutter/material.dart';
import '../services/employee_service.dart';

class SpreadsheetPage extends StatefulWidget {
  const SpreadsheetPage({super.key});

  @override
  State<SpreadsheetPage> createState() => _SpreadsheetPageState();
}

class _SpreadsheetPageState extends State<SpreadsheetPage> {
  List<Employee> _employees = [];
  final List<Employee> _newEmployees = [];
  bool _isDirty = false;

  // Controllers map to handle edits: { 'employeeId_field': controller }
  final Map<String, TextEditingController> _controllers = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    setState(() {
      _employees = List.from(EmployeeService.getEmployees());
      _isDirty = false;
      _newEmployees.clear();
      _controllers.clear();
    });
  }

  @override
  void dispose() {
    for (var c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _getController(String key, String initialValue) {
    if (!_controllers.containsKey(key)) {
      _controllers[key] = TextEditingController(text: initialValue);
    }
    return _controllers[key]!;
  }

  void _markDirty() {
    if (!_isDirty) setState(() => _isDirty = true);
  }

  void _addNewRow() {
    setState(() {
      _newEmployees.add(
        EmployeeService.create(
          firstName: '',
          lastName: '',
          dob: DateTime(2000),
          position: 'IT Sector', // Default
          salary: 0,
          branch: '',
          joinedDate: DateTime.now(),
        ),
      );
      _markDirty();
    });
  }

  Future<void> _saveAll() async {
    // 1. Update existing employees from controllers
    for (var emp in _employees) {
      final id = emp.id;
      final fnameCtrl = _controllers['${id}_fname'];
      final lnameCtrl = _controllers['${id}_lname'];
      final posCtrl = _controllers['${id}_pos'];
      final salCtrl = _controllers['${id}_sal'];
      final branchCtrl = _controllers['${id}_branch'];

      if (fnameCtrl != null) emp.firstName = fnameCtrl.text;
      if (lnameCtrl != null) emp.lastName = lnameCtrl.text;
      if (posCtrl != null) emp.position = posCtrl.text; // Note: validation?
      if (salCtrl != null) {
        emp.salary = double.tryParse(salCtrl.text) ?? emp.salary;
      }
      if (branchCtrl != null) emp.branch = branchCtrl.text;

      await EmployeeService.updateEmployee(id, emp);
    }

    // 2. Add new employees
    for (var emp in _newEmployees) {
      final id = emp.id;
      final fnameCtrl = _controllers['${id}_fname'];
      final lnameCtrl = _controllers['${id}_lname'];
      final posCtrl = _controllers['${id}_pos'];
      final salCtrl = _controllers['${id}_sal'];
      final branchCtrl = _controllers['${id}_branch'];

      // if user didn't touch it, it uses default empty strings/0 from create()
      if (fnameCtrl != null) emp.firstName = fnameCtrl.text;
      if (lnameCtrl != null) emp.lastName = lnameCtrl.text;
      if (posCtrl != null) emp.position = posCtrl.text;
      if (salCtrl != null) {
        emp.salary = double.tryParse(salCtrl.text) ?? 0.0;
      }
      if (branchCtrl != null) emp.branch = branchCtrl.text;

      // Basic validation: ensure at least a name
      if (emp.firstName.isNotEmpty) {
        await EmployeeService.addEmployee(emp);
      }
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Changes saved successfully!')),
    );

    // Refresh data
    await EmployeeService.fetchEmployees();
    _loadData(); // resync
  }

  Widget _buildCell(Employee e, String field, String val) {
    final key = '${e.id}_$field';
    final ctrl = _getController(key, val);
    return TextFormField(
      controller: ctrl,
      onChanged: (_) => _markDirty(),
      decoration: const InputDecoration(
        isDense: true,
        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        border: InputBorder.none,
      ),
      style: const TextStyle(fontSize: 13),
    );
  }

  @override
  Widget build(BuildContext context) {
    final allRows = [..._newEmployees, ..._employees];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee Spreadsheet'),
        actions: [
          TextButton.icon(
            onPressed: _addNewRow,
            icon: const Icon(Icons.add),
            label: const Text('Add Row'),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: _isDirty ? _saveAll : null,
            icon: const Icon(Icons.save),
            label: const Text('Save All'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _isDirty ? const Color(0xFF0EA5E9) : Colors.grey,
            ),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: SingleChildScrollView(
        scrollDirection: Axis.vertical,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 20,
            headingRowColor: MaterialStateProperty.all(const Color(0xFF1E293B)),
            columns: const [
              DataColumn(label: Text('ID')),
              DataColumn(label: Text('First Name')),
              DataColumn(label: Text('Last Name')),
              DataColumn(label: Text('Position')),
              DataColumn(label: Text('Branch')),
              DataColumn(label: Text('Salary (LKR)')),
            ],
            rows: allRows.map((e) {
              return DataRow(
                cells: [
                  DataCell(
                    Text(
                      e.id,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  DataCell(_buildCell(e, 'fname', e.firstName)),
                  DataCell(_buildCell(e, 'lname', e.lastName)),
                  DataCell(_buildCell(e, 'pos', e.position)),
                  DataCell(_buildCell(e, 'branch', e.branch)),
                  DataCell(_buildCell(e, 'sal', e.salary.toString())),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}
