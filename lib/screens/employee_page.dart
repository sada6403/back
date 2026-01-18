import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';

import '../services/employee_service.dart';
import 'spreadsheet_page.dart';

// Upper-case formatter (top-level so it can be reused safely).
class _UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final upper = newValue.text.toUpperCase();
    return newValue.copyWith(text: upper, selection: newValue.selection);
  }
}

class EmployeePage extends StatefulWidget {
  const EmployeePage({super.key});

  @override
  State<EmployeePage> createState() => _EmployeePageState();
}

class _EmployeePageState extends State<EmployeePage> {
  final TextEditingController _searchCtrl = TextEditingController();
  String? _filterId;

  @override
  void initState() {
    super.initState();
    EmployeeService.init().then((_) {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Widget _buildPositionSummary() {
    final employees = EmployeeService.getEmployees();
    // compute counts for each of the three positions
    final counts = <String, int>{};
    for (final pos in EmployeeService.positions) {
      counts[pos] = employees.where((e) => e.position == pos).length;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: EmployeeService.positions.map((pos) {
              final cnt = counts[pos] ?? 0;
              return Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      pos,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '$cnt',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  // (UpperCase formatter defined at top-level)

  void _openAddEditDialog({Employee? employee}) async {
    final isEdit = employee != null;
    final idCtrl = TextEditingController(text: employee?.id ?? '');
    final firstNameCtrl = TextEditingController(
      text: employee?.firstName ?? '',
    );
    final lastNameCtrl = TextEditingController(text: employee?.lastName ?? '');
    DateTime? selectedDob = employee?.dob;
    String? selectedPosition = employee?.position;
    final salaryCtrl = TextEditingController(
      text: employee != null ? employee.salary.toString() : '',
    );
    final branchCtrl = TextEditingController(text: employee?.branch ?? '');
    // bank detail controllers
    final bankNameCtrl = TextEditingController(text: employee?.bankName ?? '');
    final bankBranchCtrl = TextEditingController(
      text: employee?.bankBranch ?? '',
    );
    final accountNoCtrl = TextEditingController(
      text: employee?.accountNo ?? '',
    );
    final accountHolderCtrl = TextEditingController(
      text: employee?.accountHolder ?? '',
    );
    DateTime? selectedJoinedDate = employee?.joinedDate;
    String workingDays = employee != null
        ? '${employee.getWorkingDaysFromNow()}'
        : '0';

    // We'll apply the formatter directly to the TextFields via inputFormatters.

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text(isEdit ? 'Edit Employee' : 'Add Employee'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Employee ID (only when adding). Format: AA0001
                    if (!isEdit)
                      TextField(
                        controller: idCtrl,
                        inputFormatters: [_UpperCaseTextFormatter()],
                        decoration: const InputDecoration(
                          labelText: 'Employee ID (e.g. KA0001)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    if (!isEdit) const SizedBox(height: 8),
                    TextField(
                      controller: firstNameCtrl,
                      inputFormatters: [_UpperCaseTextFormatter()],
                      decoration: const InputDecoration(
                        labelText: 'First Name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: lastNameCtrl,
                      inputFormatters: [_UpperCaseTextFormatter()],
                      decoration: const InputDecoration(
                        labelText: 'Last Name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: selectedDob ?? DateTime.now(),
                          firstDate: DateTime(1960),
                          lastDate: DateTime.now(),
                        );
                        if (picked != null) {
                          setState(() => selectedDob = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              selectedDob != null
                                  ? DateFormat(
                                      'yyyy-MM-dd',
                                    ).format(selectedDob!)
                                  : 'Select Date of Birth',
                              style: TextStyle(
                                color: selectedDob != null
                                    ? Colors.black
                                    : Colors.grey[600],
                              ),
                            ),
                            const Icon(
                              Icons.calendar_today,
                              color: Colors.blue,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        labelText: 'Position *',
                        border: OutlineInputBorder(),
                      ),
                      initialValue: selectedPosition,
                      items: EmployeeService.positions
                          .map(
                            (pos) =>
                                DropdownMenuItem(value: pos, child: Text(pos)),
                          )
                          .toList(),
                      onChanged: (value) {
                        setState(() => selectedPosition = value);
                      },
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Position is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: salaryCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Salary (LKR)',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: branchCtrl,
                      inputFormatters: [_UpperCaseTextFormatter()],
                      decoration: const InputDecoration(
                        labelText: 'Branch',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Divider(),
                    const SizedBox(height: 8),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Bank Details',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: bankNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Bank Name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: bankBranchCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Bank Branch',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: accountNoCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Account Number',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: accountHolderCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Account Holder Name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: selectedJoinedDate ?? DateTime.now(),
                          firstDate: DateTime(2000),
                          lastDate: DateTime.now(),
                        );
                        if (picked != null) {
                          selectedJoinedDate = picked;
                          final days = DateTime.now()
                              .difference(selectedJoinedDate!)
                              .inDays;
                          setState(() {
                            workingDays = '$days';
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              selectedJoinedDate != null
                                  ? DateFormat(
                                      'yyyy-MM-dd',
                                    ).format(selectedJoinedDate!)
                                  : 'Select Joined Date',
                              style: TextStyle(
                                color: selectedJoinedDate != null
                                    ? Colors.black
                                    : Colors.grey[600],
                              ),
                            ),
                            const Icon(
                              Icons.calendar_today,
                              color: Colors.blue,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(4),
                        color: Colors.grey[50],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Working Days:',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            workingDays,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () async {
                    final idValue = idCtrl.text.trim().toUpperCase();
                    final firstName = firstNameCtrl.text.trim().toUpperCase();
                    final lastName = lastNameCtrl.text.trim().toUpperCase();
                    final salary =
                        double.tryParse(salaryCtrl.text.trim()) ?? 0.0;
                    final branch = branchCtrl.text.trim().toUpperCase();

                    final idRegex = RegExp(r'^[A-Z]{2}\d{4}$');

                    if (!isEdit) {
                      if (idValue.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Employee ID is required'),
                          ),
                        );
                        return;
                      }
                      if (!idRegex.hasMatch(idValue)) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Employee ID must be like KA0001'),
                          ),
                        );
                        return;
                      }
                      // uniqueness check
                      final exists = EmployeeService.getEmployees().any(
                        (e) => e.id == idValue,
                      );
                      if (exists) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Employee ID already exists'),
                          ),
                        );
                        return;
                      }
                    }

                    if (firstName.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('First name is required')),
                      );
                      return;
                    }
                    if (lastName.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Last name is required')),
                      );
                      return;
                    }
                    if (selectedDob == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Date of birth is required'),
                        ),
                      );
                      return;
                    }
                    if (selectedPosition == null || selectedPosition!.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Position is required')),
                      );
                      return;
                    }
                    if (selectedJoinedDate == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Joined date is required'),
                        ),
                      );
                      return;
                    }
                    if (salary <= 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Salary must be positive'),
                        ),
                      );
                      return;
                    }
                    if (branch.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Branch is required')),
                      );
                      return;
                    }

                    if (isEdit) {
                      final updated = Employee(
                        id: employee.id,
                        firstName: firstName,
                        lastName: lastName,
                        dob: selectedDob!,
                        position: selectedPosition!,
                        salary: salary,
                        branch: branch,
                        joinedDate: selectedJoinedDate!,
                        bankName: bankNameCtrl.text.trim(),
                        bankBranch: bankBranchCtrl.text.trim(),
                        accountNo: accountNoCtrl.text.trim(),
                        accountHolder: accountHolderCtrl.text.trim(),
                      );
                      await EmployeeService.updateEmployee(
                        employee.id,
                        updated,
                      );
                    } else {
                      final created = EmployeeService.create(
                        id: idValue,
                        firstName: firstName,
                        lastName: lastName,
                        dob: selectedDob!,
                        position: selectedPosition!,
                        salary: salary,
                        branch: branch,
                        joinedDate: selectedJoinedDate!,
                        bankName: bankNameCtrl.text.trim(),
                        bankBranch: bankBranchCtrl.text.trim(),
                        accountNo: accountNoCtrl.text.trim(),
                        accountHolder: accountHolderCtrl.text.trim(),
                      );
                      await EmployeeService.addEmployee(created);
                    }

                    setState(() {});
                    Navigator.of(context).pop();
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showEmployeeDetails(Employee emp) {
    showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('${emp.firstName} ${emp.lastName}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Employee ID: ${emp.id}'),
              const SizedBox(height: 6),
              Text('Position: ${emp.position}'),
              const SizedBox(height: 6),
              Text('Branch: ${emp.branch}'),
              const SizedBox(height: 6),
              Text('DOB: ${emp.dob.toLocal()}'),
              const SizedBox(height: 6),
              Text('Joined: ${emp.joinedDate.toLocal()}'),
              const SizedBox(height: 6),
              Text('Working days: ${emp.getWorkingDaysFromNow()}'),
              const SizedBox(height: 6),
              Text('Salary: LKR ${emp.salary.toStringAsFixed(2)}'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(c).pop(),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(c).pop();
              _openAddEditDialog(employee: emp);
            },
            child: const Text('Edit'),
          ),
        ],
      ),
    );
  }

  void _onPaySalaries() async {
    final now = DateTime.now();
    // check date window
    if (now.day < 3 || now.day > 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Salaries can only be paid between day 3 and 10 of the month',
          ),
        ),
      );
      return;
    }
    // check already paid this month
    final last = EmployeeService.getLastSalaryPaid();
    if (last != null && last.year == now.year && last.month == now.month) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Salaries already paid for this month')),
      );
      return;
    }

    final data = EmployeeService.prepareSalaryPayouts();
    final total = data['total'] as double;
    final items = data['items'] as List<dynamic>;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Confirm Salary Payment'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Employees to pay: ${items.length}'),
              const SizedBox(height: 8),
              Text('Total amount: LKR ${total.toStringAsFixed(2)}'),
              const SizedBox(height: 12),
              const Text(
                'Sample payments (first 5):',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ...items
                  .take(5)
                  .map(
                    (it) => Text(
                      '${it['name']} - ${it['accountNo']} - LKR ${(it['amount'] as num).toStringAsFixed(2)}',
                    ),
                  ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(c).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(c).pop(true),
            child: const Text('Pay'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await EmployeeService.markSalariesPaidNow();
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Salaries paid successfully (LKR ${total.toStringAsFixed(2)})',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final employees = EmployeeService.getEmployees();

    // Apply filter if present
    final allEmployees = employees;
    final displayed = (_filterId == null || _filterId!.isEmpty)
        ? allEmployees
        : allEmployees.where((e) => e.id == _filterId).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Employees'),
        actions: [
          IconButton(
            tooltip: 'Spreadsheet View',
            icon: const Icon(Icons.table_chart),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (c) => const SpreadsheetPage()),
              );
            },
          ),
          IconButton(
            tooltip: 'Pay Salaries',
            icon: const Icon(Icons.payments),
            onPressed: _onPaySalaries,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildPositionSummary(),
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    inputFormatters: [_UpperCaseTextFormatter()],
                    decoration: const InputDecoration(
                      labelText: 'Search by Employee ID (e.g. KA0001)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final query = _searchCtrl.text.trim().toUpperCase();
                    final idRegex = RegExp(r'^[A-Z]{2}\d{4}$');
                    if (query.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Enter an Employee ID to search'),
                        ),
                      );
                      return;
                    }
                    if (!idRegex.hasMatch(query)) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Employee ID must be like KA0001'),
                        ),
                      );
                      return;
                    }
                    final found = allEmployees.any((e) => e.id == query);
                    if (!found) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Employee not found')),
                      );
                      setState(() {
                        _filterId = query; // will result in empty list display
                      });
                      return;
                    }
                    setState(() {
                      _filterId = query;
                    });
                  },
                  child: const Icon(Icons.search),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    _searchCtrl.clear();
                    setState(() {
                      _filterId = null;
                    });
                  },
                  icon: const Icon(Icons.clear),
                ),
              ],
            ),
          ),
          Expanded(
            child: displayed.isEmpty
                ? Center(
                    child: Text(
                      allEmployees.isEmpty
                          ? 'No employees yet'
                          : 'No employees found',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: displayed.length,
                    itemBuilder: (context, i) {
                      final emp = displayed[i];
                      final workingDays = emp.getWorkingDaysFromNow();
                      final joinedStr = DateFormat(
                        'yyyy-MM-dd',
                      ).format(emp.joinedDate);

                      return Card(
                        child: ListTile(
                          onTap: () => _showEmployeeDetails(emp),
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue,
                            child: Text(
                              '${emp.firstName[0]}${emp.lastName[0]}',
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                          title: Text('${emp.firstName} ${emp.lastName}'),
                          subtitle: Text(
                            '${emp.position} • ${emp.branch}\nJoined: $joinedStr • Working: $workingDays days\nSalary: LKR ${emp.salary.toStringAsFixed(2)}/month',
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                          isThreeLine: true,
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(
                                  Icons.remove_red_eye,
                                  color: Colors.grey,
                                ),
                                onPressed: () => _showEmployeeDetails(emp),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.edit,
                                  color: Colors.blue,
                                ),
                                onPressed: () =>
                                    _openAddEditDialog(employee: emp),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.delete,
                                  color: Colors.red,
                                ),
                                onPressed: () async {
                                  final ok = await showDialog<bool>(
                                    context: context,
                                    builder: (c) => AlertDialog(
                                      title: const Text('Delete'),
                                      content: const Text(
                                        'Delete this employee?',
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.of(c).pop(false),
                                          child: const Text('Cancel'),
                                        ),
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.of(c).pop(true),
                                          child: const Text('Delete'),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (ok == true) {
                                    EmployeeService.deleteEmployee(emp.id);
                                    setState(() {});
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openAddEditDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
