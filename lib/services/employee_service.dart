import 'dart:convert';
import 'dart:io'; // Added for File
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import 'session_service.dart';

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

  // Personal Details
  String nic;
  String civilStatus;
  String gender;
  String postalAddress;
  String permanentAddress;
  String education; // Stored as a simple string summary for now
  Map<String, dynamic> educationData; // Store full object
  List<dynamic> workExperience;
  List<dynamic> references;

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
    this.nic = '',
    this.civilStatus = '',
    this.gender = '',
    this.postalAddress = '',
    this.permanentAddress = '',
    this.education = '',
    this.educationData = const {},
    this.workExperience = const [],
    this.references = const [],
  });

  Employee copyWith({
    String? userId,
    String? id,
    String? fullName,
    String? email,
    String? phone,
    DateTime? dob,
    String? role,
    String? position,
    double? salary,
    String? branchName,
    String? branchId,
    DateTime? joinedDate,
    String? password,
    String? status,
    double? targetAmount,
    String? assignedArea,
    String? bankName,
    String? bankBranch,
    String? accountNo,
    String? accountHolder,
    String? nic,
    String? civilStatus,
    String? gender,
    String? postalAddress,
    String? permanentAddress,
    String? education,
    Map<String, dynamic>? educationData,
    List<dynamic>? workExperience,
    List<dynamic>? references,
  }) {
    return Employee(
      userId: userId ?? this.userId,
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      dob: dob ?? this.dob,
      role: role ?? this.role,
      position: position ?? this.position,
      salary: salary ?? this.salary,
      branchName: branchName ?? this.branchName,
      branchId: branchId ?? this.branchId,
      joinedDate: joinedDate ?? this.joinedDate,
      password: password ?? this.password,
      status: status ?? this.status,
      targetAmount: targetAmount ?? this.targetAmount,
      assignedArea: assignedArea ?? this.assignedArea,
      bankName: bankName ?? this.bankName,
      bankBranch: bankBranch ?? this.bankBranch,
      accountNo: accountNo ?? this.accountNo,
      accountHolder: accountHolder ?? this.accountHolder,
      nic: nic ?? this.nic,
      civilStatus: civilStatus ?? this.civilStatus,
      gender: gender ?? this.gender,
      postalAddress: postalAddress ?? this.postalAddress,
      permanentAddress: permanentAddress ?? this.permanentAddress,
      education: education ?? this.education,
      educationData: educationData ?? this.educationData,
      workExperience: workExperience ?? this.workExperience,
      references: references ?? this.references,
    );
  }

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
      'name': fullName,
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

      'nic': nic,
      'civilStatus': civilStatus,
      'gender': gender,
      'postalAddress': postalAddress,
      'permanentAddress': permanentAddress,
      'education': educationData.isNotEmpty ? educationData : education,
      'workExperience': workExperience,
      'references': references,
    };
  }

  factory Employee.fromJson(Map<String, dynamic> m, {String type = ''}) {
    // Backend variations
    // Managers: has 'email', 'name', 'code', 'role'='manager'
    // FieldVisitors: 'name', 'userId', 'phone', 'role'='field_visitor', 'bankDetails'

    String r = (m['role'] as String? ?? type).trim();
    if (r == 'manager' || r == 'branch_manager') r = 'Branch Manager';
    if (r == 'field_visitor' || r == 'field') r = 'Field Visitor';
    if (r == 'it_sector' || r == 'it' || r == 'admin') r = 'IT Sector';
    if (r == 'analyzer') r = 'Analyzer';

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

    // Education might be an object or string
    String edu = '';
    Map<String, dynamic> eduData = {};

    if (m['education'] != null) {
      if (m['education'] is Map) {
        // Quick resume: e.g., "OL: Passed, AL: Passed"
        eduData = m['education'] as Map<String, dynamic>;
        edu =
            'OL: ${eduData['ol'] != null ? "Yes" : "-"}, AL: ${eduData['al'] != null ? "Yes" : "-"}';
      } else {
        edu = m['education'].toString();
      }
    }

    // Work Experience & References
    List<dynamic> workExp = m['workExperience'] is List
        ? m['workExperience']
        : [];
    List<dynamic> refs = m['references'] is List ? m['references'] : [];

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

      nic: m['nic'] as String? ?? '',
      civilStatus: m['civilStatus'] as String? ?? '',
      gender: m['gender'] as String? ?? '',
      postalAddress: m['postalAddress'] as String? ?? '',
      permanentAddress: m['permanentAddress'] as String? ?? '',
      education: edu,
      educationData: eduData,
      workExperience: workExp,
      references: refs,
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
      debugPrint('Fetch Employees Status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        if (body['success'] == true) {
          final data = body['data'];
          _employees.clear();

          // Managers
          if (data['managers'] != null) {
            final mgrs = data['managers'] as List;
            debugPrint('Found ${mgrs.length} managers in API');
            for (final m in mgrs) {
              _employees.add(
                Employee.fromJson(m as Map<String, dynamic>, type: 'Manager'),
              );
            }
          }
          // Field Visitors
          if (data['fieldVisitors'] != null) {
            final fvs = data['fieldVisitors'] as List;
            debugPrint('Found ${fvs.length} fieldVisitors in API');
            for (final fv in fvs) {
              _employees.add(
                Employee.fromJson(
                  fv as Map<String, dynamic>,
                  type: 'Field Visitor',
                ),
              );
            }
          }
          // Branch Managers
          if (data['branchManagers'] != null) {
            final bms = data['branchManagers'] as List;
            debugPrint('Found ${bms.length} Branch Managers in API');
            for (final bm in bms) {
              _employees.add(
                Employee.fromJson(
                  bm as Map<String, dynamic>,
                  type: 'Branch Manager',
                ),
              );
            }
          }

          // Check 'itSectors' first (new backend), fall back to 'employees' (legacy)
          final itSectors = data['itSectors'] ?? data['employees'];
          if (itSectors != null) {
            final its = itSectors as List;
            debugPrint('Found ${its.length} itSectors in API');
            for (final it in its) {
              _employees.add(
                Employee.fromJson(
                  it as Map<String, dynamic>,
                  type: 'IT Sector',
                ),
              );
            }
          }
          // Analyzers
          if (data['analyzers'] != null) {
            final azs = data['analyzers'] as List;
            debugPrint('Found ${azs.length} Analyzers in API');
            for (final az in azs) {
              _employees.add(
                Employee.fromJson(az as Map<String, dynamic>, type: 'Analyzer'),
              );
            }
          }
          debugPrint('Total Parsed Employees: ${_employees.length}');
          // Log Data View
          SessionService.logActivity(
            'DATA_VIEW',
            details: 'Fetched Employee List',
          );
        }
      } else {
        debugPrint('Fetch Employees Failed: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error fetching employees: $e');
    }
  }

  static List<Employee> getEmployees() => List.unmodifiable(_employees);

  static Future<void> addEmployee(Employee e) async {
    try {
      String url = '';
      if (e.role.contains('Manager')) {
        url = _authRegisterUrl;
      } else if (e.role == 'IT Sector') {
        url = ApiConfig.authRegisterITSector;
      } else {
        url = _fvUrl;
      }

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(e.toJson()),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        await fetchEmployees();
      } else {
        debugPrint('Failed to add employee: ${response.body}');
        throw Exception('Failed to add employee: ${response.body}');
      }
    } catch (err) {
      debugPrint('Error adding employee: $err');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> importITSectorExcel(
    List<Map<String, dynamic>> rows,
  ) async {
    // ... existing ...
    return {};
  }

  // Generic Excel file upload for bulk employees
  static Future<Map<String, dynamic>> uploadBulkEmployees(File file) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.bulkEmployees),
      );
      // Add token if needed, but existing backend middleware might vary.
      // Assuming open or basic implementation for now as per plan,
      // but let's add token safely as good practice.
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';
      if (token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      request.files.add(await http.MultipartFile.fromPath('file', file.path));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        await fetchEmployees(); // Refresh locally
        return body;
      } else {
        throw Exception('Bulk upload failed: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error uploading bulk employees: $e');
      rethrow;
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
        throw Exception('Update failed: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error updating employee: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> resetPassword(String userId) async {
    try {
      final baseUrl = ApiConfig.baseUrl;
      final url = '$baseUrl/employees/reset-password/$userId';

      debugPrint('Triggering password reset for: $userId');

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      );

      debugPrint('Reset response status: ${response.statusCode}');

      final contentType = response.headers['content-type'] ?? '';

      // Attempt to parse JSON regardless of status code if content type matches
      if (contentType.contains('application/json')) {
        final body = jsonDecode(response.body);
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return body;
        } else {
          // Server returned a JSON error (like 404 or 500)
          throw Exception(
            body['message'] ?? 'Server error (${response.statusCode})',
          );
        }
      } else {
        // Non-JSON response (The "non-JSON response (404)" error the user is seeing)
        if (response.statusCode == 404) {
          throw Exception(
            'Endpoint not found (404). This usually means the backend code on your server is old. Please pull latest code and restart PM2.',
          );
        } else {
          throw Exception(
            'Server error (${response.statusCode}). Expected JSON but got: ${response.body.take(100)}',
          );
        }
      }
    } catch (e) {
      debugPrint('Error resetting password: $e');
      rethrow;
    }
  }

  static Future<void> toggleStatus(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.patch(
        Uri.parse('$_usersUrl/$id/status'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        await fetchEmployees();
      } else {
        throw Exception('Failed to toggle status: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error toggling employee status: $e');
      rethrow;
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
        throw Exception('Employee not found');
      }

      String url = '';
      if (existing.role == 'Branch Manager' || existing.role == 'IT Sector') {
        url = '$_mgrUrl/${existing.id}';
      } else {
        url = '$_fvUrl/${existing.id}';
      }

      debugPrint('Sending DELETE request to: $url');

      // Get authentication token
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      if (token.isEmpty) {
        throw Exception('No authentication token. Please log in again.');
      }

      final response = await http.delete(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      debugPrint('Delete response status: ${response.statusCode}');
      debugPrint('Delete response body: ${response.body}');

      if (response.statusCode == 200) {
        // Remove from local cache
        _employees.removeWhere((e) => e.id == existing.id);
        debugPrint('Employee deleted successfully locally');

        // Refresh from server to ensure sync
        await fetchEmployees();
      } else {
        debugPrint('Delete API failed: ${response.body}');
        throw Exception('Delete failed: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error deleting employee: $e');
      rethrow;
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
    'Analyzer',
  ];

  static const List<String> branches = [
    'Jaffna (Kondavil)',
    'Jaffna (Chavakachcheri)',
    'Kalmunai',
    'Trincomalee',
    'Akkaraipattu',
    'Ampara',
    'Batticaloa',
    'Cheddikulam',
    'Kilinochchi',
    'Mannar',
    'Vavuniya',
    'Mallavi',
    'Mulliyawalai',
    'Nedunkeny',
    'Puthukkudiyiruppu',
    'Aschuveli',
    'Kandawalai',
    'Karachchi',
  ];
}

extension StringExtension on String {
  String take(int n) => length > n ? substring(0, n) : this;
}
