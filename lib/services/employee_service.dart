import 'dart:math';
import 'dart:convert';

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
    id: m['id'] as String,
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
  static const String _storageKey = 'employees_v1';

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_storageKey);
      // load last salary paid date if present
      final lastPaid = prefs.getString('salary_last_paid');
      if (lastPaid != null && lastPaid.isNotEmpty) {
        try {
          _lastSalaryPaid = DateTime.parse(lastPaid);
        } catch (_) {}
      }
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final List<dynamic> list = jsonDecode(jsonStr);
        _employees.clear();
        for (final e in list) {
          try {
            _employees.add(Employee.fromJson(e as Map<String, dynamic>));
          } catch (_) {
            // ignore malformed entries
          }
        }
      }
    } catch (_) {
      // ignore storage errors
    }
  }

  static Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(_employees.map((e) => e.toJson()).toList());
      await prefs.setString(_storageKey, jsonStr);
    } catch (_) {
      // ignore save errors
    }
  }

  static DateTime? _lastSalaryPaid;

  static DateTime? getLastSalaryPaid() => _lastSalaryPaid;

  static Future<void> _setLastSalaryPaid(DateTime dt) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('salary_last_paid', dt.toIso8601String());
      _lastSalaryPaid = dt;
    } catch (_) {}
  }

  static List<Employee> getEmployees() => List.unmodifiable(_employees);

  static void addEmployee(Employee e) {
    _employees.insert(0, e);
    _saveToStorage();
  }

  static void updateEmployee(String id, Employee updated) {
    final idx = _employees.indexWhere((e) => e.id == id);
    if (idx != -1) _employees[idx] = updated;
    _saveToStorage();
  }

  static void deleteEmployee(String id) {
    _employees.removeWhere((e) => e.id == id);
    _saveToStorage();
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
    await _setLastSalaryPaid(now);
  }

  // Check if salaries can be paid now (only once per month and between day 5-10)
  static bool canPaySalariesNow() {
    final now = DateTime.now();
    if (now.day < 4|| now.day > 10) return false;
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
