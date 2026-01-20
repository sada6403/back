import 'dart:math';
import 'package:flutter/material.dart';
import '../services/employee_service.dart';

class AdminSeeder {
  static final List<Map<String, String>> _itMembers = [
    {'name': 'Abisayan', 'phone': '0776182469'},
    {'name': 'Keerthanan', 'phone': '0743426403'},
    {'name': 'Monishan', 'phone': '0764459196'},
    {'name': 'Sabiharan', 'phone': '0703027685'},
  ];

  static Future<String> syncITTeam(BuildContext context) async {
    // Refresh list first
    await EmployeeService.fetchEmployees();
    final existingEmployees = EmployeeService.getEmployees();

    for (var member in _itMembers) {
      final name = member['name']!;
      final phone = member['phone']!;
      const defaultPassword = 'nfadmin2026'; // Fixed password for access

      // Check if exists
      final existingIndex = existingEmployees.indexWhere(
        (e) => e.phone == phone,
      );

      if (existingIndex >= 0) {
        // UPDATE existing
        final existing = existingEmployees[existingIndex];
        existing.password = defaultPassword;
        await EmployeeService.updateEmployee(existing.userId, existing);
        debugPrint('RESET PASSWORD for $name: $defaultPassword');
      } else {
        // CREATE new
        final userId = 'IT-${_generateRandomId()}';

        final newEmp = EmployeeService.create(
          fullName: name,
          email: '$name@nf.com'.toLowerCase(),
          phone: phone,
          dob: DateTime(2000, 1, 1),
          role: 'IT Sector',
          salary: 50000.0,
          branchName: 'Head Office',
          joinedDate: DateTime.now(),
          userId: userId,
        );
        newEmp.password = defaultPassword;

        await EmployeeService.addEmployee(newEmp);
        debugPrint('CREATED $name ($userId) with Password: $defaultPassword');
      }
    }

    return 'Synced IT Team.\nDefault Password: nfadmin2026';
  }

  static String _generateRandomId() {
    return (1000 + Random().nextInt(9000)).toString();
  }
}
