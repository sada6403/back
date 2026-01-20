import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/employee_service.dart';

class SpreadsheetPage extends StatefulWidget {
  const SpreadsheetPage({super.key});

  @override
  State<SpreadsheetPage> createState() => _SpreadsheetPageState();
}

class _SpreadsheetPageState extends State<SpreadsheetPage> {
  List<Employee> _employees = [];
  final Set<String> _newEmployeeIds = {};
  bool _isDirty = false;
  final Map<String, TextEditingController> _controllers = {};

  // Column Configurations
  final double _rowHeight = 60.0;
  final double _headerHeight = 50.0;

  // Defined widths for perfect alignment
  final Map<int, double> _colWidths = {
    0: 100, // ID
    1: 150, // Role
    2: 130, // Branch
    3: 180, // Name
    4: 200, // Email
    5: 140, // Phone
    6: 120, // Salary
    7: 150, // Bank Name
    8: 150, // Bank Branch
    9: 150, // Account No
    10: 180, // Holder Name
    11: 120, // DOB
    12: 120, // Joined
  };

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    setState(() {
      _employees = List.from(EmployeeService.getEmployees());
      _newEmployeeIds.clear();
      _isDirty = false;
      _disposeControllers();
    });
  }

  void _disposeControllers() {
    for (var c in _controllers.values) {
      c.dispose();
    }
    _controllers.clear();
  }

  @override
  void dispose() {
    _disposeControllers();
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
      final tempId = 'NEW_${DateTime.now().millisecondsSinceEpoch}';
      final newEmp = EmployeeService.create(
        userId: tempId,
        fullName: '',
        email: '',
        phone: '',
        dob: DateTime(2000),
        role: EmployeeService.roles.first,
        salary: 0,
        branchName: EmployeeService.branches.first,
        joinedDate: DateTime.now(),
      );
      _employees.add(newEmp);
      _newEmployeeIds.add(tempId);
      _isDirty = true;
    });
  }

  Future<void> _onSavePressed() async {
    final curContext = context;
    final confirm = await showDialog<bool>(
      context: curContext,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Changes'),
        content: const Text('Save all changes to the database?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      await _saveAll();
    }
  }

  Future<void> _saveAll() async {
    for (var emp in _employees) {
      final id = emp.userId;
      final nameCtrl = _controllers['${id}_name'];
      final emailCtrl = _controllers['${id}_email'];
      final phoneCtrl = _controllers['${id}_phone'];
      final salCtrl = _controllers['${id}_sal'];
      final bankNameCtrl = _controllers['${id}_bnkName'];
      final bankBranchCtrl = _controllers['${id}_bnkBranch'];
      final accCtrl = _controllers['${id}_acc'];
      final holderCtrl = _controllers['${id}_holder'];

      if (nameCtrl != null) emp.fullName = nameCtrl.text;
      if (emailCtrl != null) emp.email = emailCtrl.text;
      if (phoneCtrl != null) emp.phone = phoneCtrl.text;
      if (salCtrl != null) {
        emp.salary = double.tryParse(salCtrl.text) ?? emp.salary;
      }
      if (bankNameCtrl != null) emp.bankName = bankNameCtrl.text;
      if (bankBranchCtrl != null) emp.bankBranch = bankBranchCtrl.text;
      if (accCtrl != null) emp.accountNo = accCtrl.text;
      if (holderCtrl != null) emp.accountHolder = holderCtrl.text;

      if (_newEmployeeIds.contains(id)) {
        final toCreate = EmployeeService.create(
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          dob: emp.dob,
          role: emp.role,
          salary: emp.salary,
          branchName: emp.branchName,
          joinedDate: emp.joinedDate,
          bankName: emp.bankName,
          bankBranch: emp.bankBranch,
          accountNo: emp.accountNo,
          accountHolder: emp.accountHolder,
        );
        await EmployeeService.addEmployee(toCreate);
      } else {
        await EmployeeService.updateEmployee(id, emp);
      }
    }
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Saved!')));
      await EmployeeService.fetchEmployees();
      _loadData();
    }
  }

  // --- UI COMPONENTS ---

  Widget _buildHeaderCell(int index, String text) {
    return Container(
      width: _colWidths[index],
      height: _headerHeight,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A), // Slate 900
        border: Border(
          right: BorderSide(
            color: Colors.white.withValues(alpha: 0.1),
            width: 1,
          ),
        ),
      ),
      child: Text(
        text.toUpperCase(),
        style: GoogleFonts.outfit(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 13,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  Widget _buildTypedCell(int index, Widget content, {bool isOdd = false}) {
    return Container(
      width: _colWidths[index],
      height: _rowHeight,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: isOdd ? Colors.grey[50] : Colors.white,
        border: Border(
          right: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
          bottom: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
      ),
      child: content,
    );
  }

  Widget _buildTextField(
    Employee e,
    String field,
    String val, {
    bool isNumber = false,
  }) {
    final key = '${e.userId}_$field';
    final ctrl = _getController(key, val);
    return TextFormField(
      controller: ctrl,
      onChanged: (_) => _markDirty(),
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      style: GoogleFonts.outfit(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.black,
      ),
      decoration: const InputDecoration(
        isDense: true,
        border: InputBorder.none,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalWidth = _colWidths.values.reduce((a, b) => a + b);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Employee Master Sheet',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF0F172A),
        actions: [
          if (_isDirty)
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 8.0,
                vertical: 8.0,
              ),
              child: ElevatedButton.icon(
                icon: const Icon(Icons.save_alt, size: 18),
                label: Text(
                  "Save Changes",
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981), // Emerald
                  foregroundColor: Colors.white,
                ),
                onPressed: _onSavePressed,
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // STICKY HEADER + SCROLLABLE BODY
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SizedBox(
                width: totalWidth,
                child: Column(
                  children: [
                    // 1. FIXED HEADER ROW
                    Row(
                      children: [
                        _buildHeaderCell(0, 'ID / Status'),
                        _buildHeaderCell(1, 'Role'),
                        _buildHeaderCell(2, 'Branch'),
                        _buildHeaderCell(3, 'Full Name'),
                        _buildHeaderCell(4, 'Email'),
                        _buildHeaderCell(5, 'Phone'),
                        _buildHeaderCell(6, 'Salary (LKR)'),
                        _buildHeaderCell(7, 'Bank Name'),
                        _buildHeaderCell(8, 'Bank Branch'),
                        _buildHeaderCell(9, 'Account No'),
                        _buildHeaderCell(10, 'Holder Name'),
                        _buildHeaderCell(11, 'DOB'),
                        _buildHeaderCell(12, 'Joined Date'),
                      ],
                    ),
                    // 2. SCROLLABLE ROWS
                    Expanded(
                      child: ListView.builder(
                        itemCount: _employees.length,
                        itemBuilder: (context, index) {
                          final e = _employees[index];
                          final isNew = _newEmployeeIds.contains(e.userId);
                          final isOdd = index % 2 != 0;

                          return Row(
                            children: [
                              _buildTypedCell(
                                0,
                                Center(
                                  child: Text(
                                    isNew ? 'NEW' : e.userId,
                                    style: GoogleFonts.outfit(
                                      fontWeight: FontWeight.w900,
                                      color: isNew
                                          ? Colors.blue.shade900
                                          : Colors.black,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                1,
                                DropdownButton<String>(
                                  value: EmployeeService.roles.contains(e.role)
                                      ? e.role
                                      : null,
                                  items: EmployeeService.roles
                                      .map(
                                        (r) => DropdownMenuItem(
                                          value: r,
                                          child: Text(
                                            r,
                                            style: GoogleFonts.outfit(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.black,
                                            ),
                                          ),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() {
                                        e.role = val;
                                        e.position = val;
                                        _isDirty = true;
                                      });
                                    }
                                  },
                                  underline: Container(),
                                  isExpanded: true,
                                ),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                2,
                                DropdownButton<String>(
                                  value:
                                      EmployeeService.branches.contains(
                                        e.branchName,
                                      )
                                      ? e.branchName
                                      : null,
                                  items: EmployeeService.branches
                                      .map(
                                        (b) => DropdownMenuItem(
                                          value: b,
                                          child: Text(
                                            b,
                                            style: GoogleFonts.outfit(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.black,
                                            ),
                                          ),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() {
                                        e.branchName = val;
                                        _isDirty = true;
                                      });
                                    }
                                  },
                                  underline: Container(),
                                  isExpanded: true,
                                ),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                3,
                                _buildTextField(e, 'name', e.fullName),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                4,
                                _buildTextField(e, 'email', e.email),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                5,
                                _buildTextField(e, 'phone', e.phone),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                6,
                                _buildTextField(
                                  e,
                                  'sal',
                                  e.salary.toString(),
                                  isNumber: true,
                                ),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                7,
                                _buildTextField(e, 'bnkName', e.bankName),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                8,
                                _buildTextField(e, 'bnkBranch', e.bankBranch),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                9,
                                _buildTextField(e, 'acc', e.accountNo),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                10,
                                _buildTextField(e, 'holder', e.accountHolder),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                11,
                                InkWell(
                                  onTap: () async {
                                    final d = await showDatePicker(
                                      context: context,
                                      initialDate: e.dob,
                                      firstDate: DateTime(1900),
                                      lastDate: DateTime.now(),
                                    );
                                    if (d != null) {
                                      setState(() {
                                        e.dob = d;
                                        _isDirty = true;
                                      });
                                    }
                                  },
                                  child: Text(
                                    DateFormat('yyyy-MM-dd').format(e.dob),
                                    style: GoogleFonts.outfit(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.black,
                                    ),
                                  ),
                                ),
                                isOdd: isOdd,
                              ),
                              _buildTypedCell(
                                12,
                                InkWell(
                                  onTap: () async {
                                    final d = await showDatePicker(
                                      context: context,
                                      initialDate: e.joinedDate,
                                      firstDate: DateTime(2000),
                                      lastDate: DateTime.now(),
                                    );
                                    if (d != null) {
                                      setState(() {
                                        e.joinedDate = d;
                                        _isDirty = true;
                                      });
                                    }
                                  },
                                  child: Text(
                                    DateFormat(
                                      'yyyy-MM-dd',
                                    ).format(e.joinedDate),
                                    style: GoogleFonts.outfit(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.black,
                                    ),
                                  ),
                                ),
                                isOdd: isOdd,
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // FOOTER: ADD ROW
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 10,
                  offset: Offset(0, -2),
                ),
              ],
            ),
            child: ElevatedButton.icon(
              onPressed: _addNewRow,
              icon: const Icon(Icons.add_circle, color: Colors.white),
              label: Text(
                'ADD NEW ROW',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F172A),
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
