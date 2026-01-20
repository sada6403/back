import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class Employee {
  // Use userId for the functional ID (e.g. MGR-KM-000001)
  String userId;
  String id; // MongoDB _id
  String fullName;
  String email;
  String phone;
  DateTime dob;
  String role; // 'manager', 'field_visitor', 'it_sector'
  String position; // Display name
  double salary;
  String branchName;
  String branchId;
  DateTime joinedDate;
  String password; // Only for creation payload really, usually not returned
  String status;

  // Field Visitor Specific
  double targetAmount;
  String assignedArea;

  // Bank details
  String bankName;
  String bankBranch;
  String accountNo;
  String accountHolder;

  Employee({
    this.userId = '',
    this.id = '',
    required this.fullName,
    required this.email,
    required this.phone,
    required this.dob,
    required this.role,
    this.position = '',
    required this.salary,
    required this.branchName,
    this.branchId = '',
    required this.joinedDate,
    this.password = '',
    this.status = 'active',
    this.targetAmount = 0.0,
    this.assignedArea = '',
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

  Map<String, dynamic> toJson() {
    // Determine payload based on role, but standard fields mostly overlap
    return {
      if (id.isNotEmpty) '_id': id,
      'userId': userId,
      'fullName': fullName,
      'name': fullName, // Backend expects 'name' for some models
      'email': email,
      'phone': phone,
      'dob': dob.toIso8601String(),
      'role': role == 'Branch Manager'
          ? 'manager'
          : (role == 'Field Visitor' ? 'field_visitor' : role),
      'position': position,
      'salary': salary,
      'branchName': branchName,
      'branchId': branchId,
      'joinedDate': joinedDate.toIso8601String(),
      'status': status,
      'targetAmount': targetAmount,
      'assignedArea': assignedArea,
      // For Field Visitors
      'bankDetails': {
        'bankName': bankName,
        'branch': bankBranch,
        'accountNumber': accountNo,
        'accountName': accountHolder,
      },
      // For simple backend compat
      'bankName': bankName,
      'bankBranch': bankBranch,
      'accountNo': accountNo,
      'accountHolder': accountHolder,
      'password': password,
    };
  }

  factory Employee.fromJson(Map<String, dynamic> m, {String type = ''}) {
    // Backend variations
    // Managers: has 'email', 'name', 'code', 'role'='manager'
    // FieldVisitors: 'name', 'userId', 'phone', 'role'='field_visitor', 'bankDetails'

    String r = m['role'] as String? ?? type;
    if (r == 'manager') r = 'Branch Manager';
    if (r == 'field_visitor') r = 'Field Visitor';
    if (r == 'branch_manager') r = 'Manager';

    String name = m['fullName'] as String? ?? m['name'] as String? ?? '';
    String uId = m['userId'] as String? ?? m['code'] as String? ?? '';
    String ph = m['phone'] as String? ?? '';

    // Bank details might be nested
    String bName = '';
    String bBranch = '';
    String accNo = '';
    String accHolder = '';

    if (m['bankDetails'] != null) {
      final bd = m['bankDetails'];
      bName = bd['bankName'] ?? '';
      bBranch = bd['branch'] ?? '';
      accNo = bd['accountNumber'] ?? '';
      accHolder = bd['accountName'] ?? '';
    } else {
      bName = m['bankName'] as String? ?? '';
      bBranch = m['bankBranch'] as String? ?? '';
      accNo = m['accountNo'] as String? ?? '';
      accHolder = m['accountHolder'] as String? ?? '';
    }

    return Employee(
      userId: uId,
      id: m['_id']?.toString() ?? '',
      fullName: name,
      email: m['email'] as String? ?? '',
      phone: ph,
      dob: DateTime.tryParse(m['dob'] as String? ?? '') ?? DateTime.now(),
      role: r,
      position: r,
      salary: (m['salary'] as num?)?.toDouble() ?? 0.0,
      branchName: m['branchName'] as String? ?? '',
      branchId: m['branchId'] as String? ?? '',
      joinedDate:
          DateTime.tryParse(m['createdAt'] as String? ?? '') ?? DateTime.now(),
      status: m['status'] as String? ?? 'active',
      targetAmount: (m['targetAmount'] as num?)?.toDouble() ?? 0.0,
      assignedArea: m['assignedArea'] as String? ?? '',
      bankName: bName,
      bankBranch: bBranch,
      accountNo: accNo,
      accountHolder: accHolder,
    );
  }

  // Backwards compatibility for UI code that used 'id'
  // String get id => userId; // REMOVED to avoid confusion with MongoDB _id
  // set id(String val) => userId = val;
  String get firstName => fullName.split(' ').first;
  set firstName(String val) =>
      fullName = '$val ${fullName.split(' ').skip(1).join(' ')}';
  String get lastName => fullName.split(' ').length > 1
      ? fullName.split(' ').skip(1).join(' ')
      : '';
  String get branch => branchName;
  set branch(String val) => branchName = val;
}

class EmployeeService {
  static final List<Employee> _employees = [];
  // Pointing to NF Backend
  static String get _usersUrl => ApiConfig.users;
  static String get _fvUrl => ApiConfig.fieldVisitors;
  static String get _mgrUrl => ApiConfig.managers;
  static String get _authRegisterUrl => ApiConfig.authRegister;

  static Future<void> init() async {
    await fetchEmployees();
    await _loadSalaryHistory();
  }

  static Future<void> fetchEmployees() async {
    try {
      final response = await http.get(Uri.parse(_usersUrl));
      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        if (body['success'] == true) {
          final data = body['data'];
          _employees.clear();

          // Managers
          if (data['managers'] != null) {
            for (final m in data['managers']) {
              _employees.add(
                Employee.fromJson(m as Map<String, dynamic>, type: 'Manager'),
              );
            }
          }
          // Field Visitors
          if (data['fieldVisitors'] != null) {
            for (final fv in data['fieldVisitors']) {
              _employees.add(
                Employee.fromJson(
                  fv as Map<String, dynamic>,
                  type: 'Field Visitor',
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching employees: $e');
    }
  }

  static List<Employee> getEmployees() => List.unmodifiable(_employees);

  static Future<void> addEmployee(Employee e) async {
    try {
      String url = '';
      if (e.role == 'Branch Manager' || e.role == 'IT Sector') {
        url = _authRegisterUrl;
      } else {
        url = _fvUrl;
      }

      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(e.toJson()),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        await fetchEmployees();
      } else {
        debugPrint('Failed to add employee: ${response.body}');
      }
    } catch (err) {
      debugPrint('Error adding employee: $err');
    }
  }

  static Future<void> updateEmployee(String id, Employee updated) async {
    debugPrint('Attempting to update employee ID: $id');
    final existing = _employees.firstWhere(
      (e) => e.userId == id || e.id == id,
      orElse: () => Employee(
        fullName: '',
        email: '',
        phone: '',
        dob: DateTime.now(),
        role: '',
        salary: 0,
        branchName: '',
        joinedDate: DateTime.now(),
      ),
    );

    if (existing.id.isEmpty) {
      debugPrint('Update failed: Employee not found locally with ID $id');
      await fetchEmployees();
      return;
    }

    try {
      String url = '';
      if (updated.role == 'Branch Manager' || updated.role == 'IT Sector') {
        url = '$_mgrUrl/${existing.id}';
      } else {
        url = '$_fvUrl/${existing.id}';
      }

      debugPrint('Sending PUT request to: $url');
      final response = await http.put(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(updated.toJson()),
      );

      debugPrint('Update response status: ${response.statusCode}');
      if (response.statusCode == 200) {
        await fetchEmployees();
        debugPrint('Employee updated successfully');
      } else {
        debugPrint('Update API failed: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error updating employee: $e');
    }
  }

  static Future<void> deleteEmployee(String id) async {
    debugPrint('Attempting to delete employee with ID: $id');
    try {
      final existing = _employees.firstWhere(
        (e) => e.userId == id || e.id == id,
        orElse: () => Employee(
          fullName: '',
          email: '',
          phone: '',
          dob: DateTime.now(),
          role: '',
          salary: 0,
          branchName: '',
          joinedDate: DateTime.now(),
        ),
      );

      if (existing.id.isEmpty) {
        debugPrint('Delete failed: Employee not found locally with ID $id');
        // Force refresh just in case
        await fetchEmployees();
        return;
      }

      String url = '';
      if (existing.role == 'Branch Manager' || existing.role == 'IT Sector') {
        url = '$_mgrUrl/${existing.id}';
      } else {
        url = '$_fvUrl/${existing.id}';
      }

      debugPrint('Sending DELETE request to: $url');
      final response = await http.delete(Uri.parse(url));
      debugPrint('Delete response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        _employees.removeWhere((e) => e.id == existing.id);
        debugPrint('Employee deleted successfully locally');
      } else {
        debugPrint('Delete API failed: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error deleting employee: $e');
    }
  }

  static Employee create({
    required String fullName,
    required String email,
    required String phone,
    required DateTime dob,
    required String role,
    // required String position,
    required double salary,
    required String branchName,
    required DateTime joinedDate,
    String? userId,
    String bankName = '',
    String bankBranch = '',
    String accountNo = '',
    String accountHolder = '',
  }) {
    // ID generated in backend now
    return Employee(
      userId: userId ?? '',
      fullName: fullName,
      email: email,
      phone: phone,
      dob: dob,
      role: role,
      position: role,
      salary: salary,
      branchName: branchName,
      bankName: bankName,
      bankBranch: bankBranch,
      accountNo: accountNo,
      accountHolder: accountHolder,
      joinedDate: joinedDate,
    );
  }

  // --- Salary Handling (Local persistence for admin convenience) ---
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

  // Prepare payout items and total
  static Map<String, dynamic> prepareSalaryPayouts() {
    final items = _employees.map((e) {
      return {
        'id': e.userId,
        'name': e.fullName,
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

  // List of available positions / roles
  static const List<String> roles = [
    'Branch Manager',
    'Field Visitor',
    'IT Sector',
  ];

  static const List<String> branches = [
    'Kalmunai',
    'Trincomalee',
    'Chavakachcheri',
    'Kondavil',
    'Jaffna', // Fallback
  ];
}
