import 'dart:math';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class Employee {
  String id;
  String firstName;
  String lastName;
  DateTime dob; // Date of birth
  String position; // 'Field Visitor', 'Manager', 'IT Sector'
  double salary; // Monthly salary in LKR
  String branch;
  DateTime joinedDate; // When employee joined
  // Bank details
  String bankName;
  String bankBranch;
  String accountNo;
  String accountHolder;

  Employee({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.dob,
    required this.position,
    required this.salary,
    required this.branch,
    required this.joinedDate,
    this.bankName = '',
    this.bankBranch = '',
    this.accountNo = '',
    this.accountHolder = '',
  });

  // Calculate working period in days from joinedDate to today
  int getWorkingDaysFromNow() {
    final now = DateTime.now();
    return now.difference(joinedDate).inDays;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'firstName': firstName,
    'lastName': lastName,
    'dob': dob.toIso8601String(),
    'position': position,
    'salary': salary,
    'branch': branch,
    'bankName': bankName,
    'bankBranch': bankBranch,
    'accountNo': accountNo,
    'accountHolder': accountHolder,
    'joinedDate': joinedDate.toIso8601String(),
  };

  factory Employee.fromJson(Map<String, dynamic> m) => Employee(
    id:
        m['id'] as String? ??
        (m['_id'] as String? ?? ''), // Handling mongo _id vs id
    firstName: m['firstName'] as String,
    lastName: m['lastName'] as String,
    dob: DateTime.parse(m['dob'] as String),
    position: m['position'] as String,
    salary: (m['salary'] as num).toDouble(),
    branch: m['branch'] as String,
    bankName: m['bankName'] as String? ?? '',
    bankBranch: m['bankBranch'] as String? ?? '',
    accountNo: m['accountNo'] as String? ?? '',
    accountHolder: m['accountHolder'] as String? ?? '',
    joinedDate: DateTime.parse(m['joinedDate'] as String),
  );
}

class EmployeeService {
  static final List<Employee> _employees = [];
  // For Windows, localhost is often accessible but sometimes requires 127.0.0.1
  // Android Emulator requires 10.0.2.2
  static const String _baseUrl = 'http://localhost:3000/api/employees';

  static Future<void> init() async {
    // In HTTP version, init might just verify connection or fetch initial list
    await fetchEmployees();
    await _loadSalaryHistory();
  }

  static Future<void> fetchEmployees() async {
    try {
      final response = await http.get(Uri.parse(_baseUrl));
      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(response.body);
        _employees.clear();
        for (final e in list) {
          try {
            _employees.add(Employee.fromJson(e as Map<String, dynamic>));
          } catch (_) {}
        }
      }
    } catch (e) {
      print('Error fetching employees: $e');
    }
  }

  // salary payments history (each entry: {'date': DateTime, 'total': double})
  static final List<Map<String, dynamic>> _salaryPayments = [];

  static List<Map<String, dynamic>> getSalaryPayments() => List.unmodifiable(
    _salaryPayments.map(
      (m) => {'date': m['date'] as DateTime, 'total': m['total'] as double},
    ),
  );

  static DateTime? _lastSalaryPaid;

  static DateTime? getLastSalaryPaid() => _lastSalaryPaid;

  static Future<void> _loadSalaryHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastPaid = prefs.getString('salary_last_paid');
      if (lastPaid != null && lastPaid.isNotEmpty) {
        try {
          _lastSalaryPaid = DateTime.parse(lastPaid);
        } catch (_) {}
      }
      final paymentsJson = prefs.getString('salary_payments');
      if (paymentsJson != null && paymentsJson.isNotEmpty) {
        try {
          final List<dynamic> list = jsonDecode(paymentsJson);
          _salaryPayments.clear();
          for (final p in list) {
            _salaryPayments.add({
              'date': DateTime.parse(p['date']),
              'total': (p['total'] as num).toDouble(),
            });
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  static Future<void> _persistSalaryPayments() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(
        _salaryPayments
            .map(
              (m) => {
                'date': (m['date'] as DateTime).toIso8601String(),
                'total': m['total'],
              },
            )
            .toList(),
      );
      await prefs.setString('salary_payments', encoded);
    } catch (_) {}
  }

  static Future<void> _setLastSalaryPaid(DateTime dt) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('salary_last_paid', dt.toIso8601String());
      _lastSalaryPaid = dt;
    } catch (_) {}
  }

  static void _addSalaryPaymentRecord(DateTime date, double total) {
    _salaryPayments.insert(0, {'date': date, 'total': total});
    _persistSalaryPayments();
  }

  static List<Employee> getEmployees() => List.unmodifiable(_employees);

  static Future<void> addEmployee(Employee e) async {
    try {
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(e.toJson()),
      );
      if (response.statusCode == 201) {
        // Refresh local list or just insert
        _employees.insert(0, e);
      }
    } catch (e) {
      debugPrint('Error adding employee: $e');
    }
  }

  static Future<void> updateEmployee(String id, Employee updated) async {
    try {
      final response = await http.put(
        Uri.parse('$_baseUrl/$id'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(updated.toJson()),
      );
      if (response.statusCode == 200) {
        final idx = _employees.indexWhere((e) => e.id == id);
        if (idx != -1) _employees[idx] = updated;
      }
    } catch (e) {
      debugPrint('Error updating employee: $e');
    }
  }

  static Future<void> deleteEmployee(String id) async {
    try {
      final response = await http.delete(Uri.parse('$_baseUrl/$id'));
      if (response.statusCode == 200) {
        _employees.removeWhere((e) => e.id == id);
      }
    } catch (e) {
      debugPrint('Error deleting employee: $e');
    }
  }

  static Employee create({
    required String firstName,
    required String lastName,
    required DateTime dob,
    required String position,
    required double salary,
    required String branch,
    required DateTime joinedDate,
    String? id,
    String bankName = '',
    String bankBranch = '',
    String accountNo = '',
    String accountHolder = '',
  }) {
    final generatedId =
        id ??
        (DateTime.now().millisecondsSinceEpoch.toString() +
            Random().nextInt(999).toString());
    return Employee(
      id: generatedId,
      firstName: firstName,
      lastName: lastName,
      dob: dob,
      position: position,
      salary: salary,
      branch: branch,
      bankName: bankName,
      bankBranch: bankBranch,
      accountNo: accountNo,
      accountHolder: accountHolder,
      joinedDate: joinedDate,
    );
  }

  // Prepare payout items and total
  static Map<String, dynamic> prepareSalaryPayouts() {
    final items = _employees.map((e) {
      return {
        'id': e.id,
        'name': '${e.firstName} ${e.lastName}',
        'bankName': e.bankName,
        'bankBranch': e.bankBranch,
        'accountNo': e.accountNo,
        'accountHolder': e.accountHolder,
        'amount': e.salary,
      };
    }).toList();
    final total = _employees.fold<double>(0.0, (s, e) => s + e.salary);
    return {'total': total, 'items': items};
  }

  // Mark salaries as paid now
  static Future<void> markSalariesPaidNow() async {
    final now = DateTime.now();
    final prepared = prepareSalaryPayouts();
    final total = prepared['total'] as double;
    await _setLastSalaryPaid(now);
    _addSalaryPaymentRecord(now, total);
  }

  // Check if salaries can be paid now (only once per month and between day 3-10)
  static bool canPaySalariesNow() {
    final now = DateTime.now();
    if (now.day < 3 || now.day > 10) return false;
    if (_lastSalaryPaid != null) {
      if (_lastSalaryPaid!.year == now.year &&
          _lastSalaryPaid!.month == now.month) {
        return false;
      }
    }
    return true;
  }

  // List of available positions
  static const List<String> positions = [
    'Field Visitor',
    'Manager',
    'IT Sector',
  ];
}
