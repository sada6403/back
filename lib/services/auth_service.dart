import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  // Static user data to hold session info
  static String? userId; // 'code' from backend
  static String? dbId; // MongoDB _id
  static String? token;
  static String firstName = '';
  static String lastName = '';
  static String role = '';
  static String branchId = '';
  static String branchName = '';
  static String? avatarPath;
  static String email = '';
  static String mobile = '';

  static String? sessionId;

  static Future<void> _startSession() async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/analysis/session/start'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'username': firstName,
          'role': role,
          // 'ipAddress': '', // Could fetch IP if needed
          'deviceInfo': 'Flutter App',
        }),
      );
      debugPrint(
        'Session Start Response: ${response.statusCode} - ${response.body}',
      );
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        sessionId = body['sessionId'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('session_id', sessionId!);
      } else {
        debugPrint('FAILED TO START SESSION: ${response.body}');
      }
    } catch (e) {
      debugPrint('Session Start Exception: $e');
    }
  }

  static Future<void> _endSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sid = sessionId ?? prefs.getString('session_id');
      if (sid == null) return;

      await http.post(
        Uri.parse('${ApiConfig.baseUrl}/analysis/session/end'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'sessionId': sid}),
      );
      sessionId = null;
      await prefs.remove('session_id');
    } catch (e) {
      debugPrint('Session End Error: $e');
    }
  }

  static Future<bool> login(
    String user,
    String pass, {
    String role = 'manager',
  }) async {
    debugPrint('Attempting login for: $user');
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.authLogin),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': user, 'password': pass, 'role': role}),
      );

      debugPrint('Login response status: ${response.statusCode}');
      debugPrint('Login response body: ${response.body}');

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final data = body['data'];

          userId = data['code'];
          dbId = data['id'];
          token = data['token'];
          firstName = data['name'] ?? '';
          AuthService.role = data['role'] ?? '';
          branchId = data['branchId'] ?? '';
          branchName = data['branchName'] ?? '';
          email = data['email'] ?? '';
          mobile = data['phone'] ?? '';

          if (token != null) {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('token', token!);
            await prefs.setString('user_role', AuthService.role);
            await prefs.setString('user_branch_id', branchId);
            debugPrint('Token saved to storage');
          }

          // Debug Role
          debugPrint('LOGIN SUCCESS: Role=$role');

          // Start Session for IT Sector / Admin (or if role is basically anything other than standard user)
          if (AuthService.role.toLowerCase().contains('it') ||
              AuthService.role.toLowerCase() == 'admin' ||
              AuthService.role == 'it_sector') {
            debugPrint('Starting Session for role: ${AuthService.role}');
            await _startSession();
          } else {
            debugPrint('Skipping Session Start for role: ${AuthService.role}');
          }

          return true;
        }
      }

      debugPrint('Login failed: ${response.statusCode} - ${response.body}');
      return false;
    } catch (e) {
      debugPrint('CRITICAL LOGIN ERROR: $e');
      return false;
    }
  }

  static Future<bool> changePassword(
    String oldPassword,
    String newPassword,
  ) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/auth/change-password');

      if (dbId == null) {
        debugPrint('Error: User DB ID not found');
        return false;
      }

      String backendRole = 'field_visitor';
      if (role.toLowerCase() == 'manager' ||
          role.toLowerCase().contains('manager')) {
        backendRole = 'manager';
      } else if (role.toLowerCase() == 'it_sector' ||
          role.toLowerCase() == 'admin' ||
          role.toLowerCase() == 'it') {
        backendRole = 'it_sector';
      }

      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'id': dbId,
          'role': backendRole,
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        }),
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        debugPrint('Change Password Failed: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Change Password Error: $e');
      return false;
    }
  }

  // Real Password Reset Flow
  static Future<bool> requestPasswordResetOtp(String userId) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId}),
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        debugPrint('Forgot Password Failed: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Forgot Password Error: $e');
      return false;
    }
  }

  static Future<String?> verifyPasswordResetOtp(
    String userId,
    String otp,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'otp': otp}),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['resetToken']; // Return the token if successful
      } else {
        debugPrint('Verify OTP Failed: ${response.body}');
        return null;
      }
    } catch (e) {
      debugPrint('Verify OTP Error: $e');
      return null;
    }
  }

  static Future<bool> completePasswordReset(
    String userId,
    String newPassword,
    String resetToken,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'newPassword': newPassword,
          'resetToken': resetToken,
        }),
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        debugPrint('Reset Password Failed: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Reset Password Error: $e');
      return false;
    }
  }

  // Deprecated Mocks (Removed or stubbed to prevent errors if still referenced elsewhere momentarily)
  static String generateOtp() => '';
  static bool verifyOtp(String enteredOtp) => false;

  static Map<String, String> getProfile() {
    return {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'mobile': mobile,
      'avatarPath': avatarPath ?? '',
      'role': role,
      'branch': branchName,
    };
  }

  static Future<bool> updateProfile({
    String? newFirstName,
    String? newLastName,
    String? newDob,
    String? newEmail,
    String? newMobile,
    String? newAvatarPath,
  }) async {
    // 1. Determine Endpoint based on Role
    String url = '';
    if (role == 'manager') {
      url = '${ApiConfig.managers}/$dbId';
    } else if (role == 'field_visitor' || role == 'field') {
      url = '${ApiConfig.fieldVisitors}/$dbId';
    } else if (role == 'it_sector' || role == 'admin' || role == 'it') {
      // Use general employees endpoint which handles all types now (including ITSector)
      url = '${ApiConfig.users}/$dbId';
    } else {
      // Unknown role, cannot update backend
      debugPrint('Core Error: Unknown role for update: $role');
      return false;
    }

    // 2. Prepare Body
    Map<String, dynamic> body = {};
    // Note: Backend expects specific field names.
    // Manager/IT: fullName, phone, email
    // FieldVisitor: name, phone, email (and others)

    // Rename 'Full Name' correctly for backend
    if (newFirstName != null) {
      if (role == 'field_visitor' || role == 'field') {
        body['name'] = newFirstName;
      } else {
        body['fullName'] = newFirstName;
      }
    }

    if (newEmail != null) body['email'] = newEmail;
    if (newMobile != null) body['phone'] = newMobile; // Backend uses 'phone'

    // Add other fields if needed, e.g. avatarPath could be sent if backend supported it
    // For now we only sync Name, Email, Phone

    if (body.isEmpty) {
      // No changes to save
      return true;
    }

    try {
      final response = await http.put(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        // 3. Update Local State only on Success
        if (newFirstName != null) firstName = newFirstName;
        // lastName removed from UI, so we don't update it explicitly
        if (newEmail != null) email = newEmail;
        if (newMobile != null) mobile = newMobile;
        if (newAvatarPath != null) avatarPath = newAvatarPath;

        return true;
      } else {
        debugPrint('Failed to update profile: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Error updating profile: $e');
      return false;
    }
  }

  static Future<void> logout() async {
    await _endSession();
    userId = null;
    dbId = null;
    token = null;
    firstName = '';
    role = '';
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
