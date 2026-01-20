import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';

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

  // Fallback for mock login if API fails or for testing
  static const String _mockUser = 'KA0001';
  static const String _mockPass = '1234';

  static Future<bool> login(String user, String pass) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.authLogin),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'code': user, 'password': pass}),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final data = body['data'];

          userId = data['code'];
          dbId = data['id']; // Stored as 'id' in backend response
          token = body['token']; // If backend sends token
          firstName = data['name'] ?? '';
          role = data['role'] ?? '';
          branchId = data['branchId'] ?? '';
          branchName = data['branchName'] ?? '';
          email = data['email'] ?? '';
          mobile = data['phone'] ?? '';

          return true;
        }
      }

      // Fallback to mock for development if API is unreachable/failing
      if (user == _mockUser && pass == _mockPass) {
        userId = _mockUser;
        firstName = 'Admin';
        role = 'Manager';
        return true;
      }
    } catch (e) {
      debugPrint('Login Error: $e');
      // Fallback to mock on error
      if (user == _mockUser && pass == _mockPass) {
        userId = _mockUser;
        firstName = 'Admin';
        role = 'Manager';
        return true;
      }
    }
    return false;
  }

  // Deprecated synchronous verify - kept for compatibility if needed, but should use login()
  static bool verify(String user, String pass) {
    return user == _mockUser && pass == _mockPass;
  }

  static Future<bool> changePassword(String newPassword) async {
    try {
      // Determine correct endpoint in future if needed, for now use auth path
      // Note: Backend endpoint is /api/auth/change-password
      final url = Uri.parse('${ApiConfig.baseUrl}/auth/change-password');

      // Need ID. For managers it's _id (which we stored in token or separate field?
      // In login we stored userId = code. We need the database _id.
      // Let's assume we might need to fetch profile or store _id in login.
      // Checking login logic: data['id'] = user._id.toString(). So we have it?
      // Actually AuthService.userId stores 'code'.
      // We might need to store the actual DB ID.

      // Let's check where to get the DB ID.
      // In login: `userId = data['code'];` -> this is the user-facing ID (e.g. M001).
      // We need the Mongo _id.
      // Let's look at `getProfile` or login response handling again.
      // It seems we might not be storing the Mongo ID in a static field accessible here easily
      // unless we add it.

      // Temporary fix: Use the code/userId if backend supports it, OR
      // update login to store dbId.
      // Backend expects: { id, role, newPassword }. 'id' is expected to be _id.

      // Since I can't easily change AuthService state management structure right now without risk,
      // I will rely on the fact that for now we might have to use a lookup or add a field.
      // Let's add `static String? dbId;` to AuthService.

      if (dbId == null) {
        debugPrint('Error: User DB ID not found');
        return false;
      }

      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'id': dbId,
          'role': role == 'Manager'
              ? 'manager'
              : 'field_visitor', // Normalize role
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

  static String generateOtp() {
    return '1234'; // Mock for now, or implement SMS API
  }

  static bool verifyOtp(String enteredOtp) {
    return enteredOtp == '1234';
  }

  static void clearOtp() {}

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

  static void updateProfile({
    String? newFirstName,
    String? newLastName,
    String? newDob,
    String? newEmail,
    String? newMobile,
    String? newAvatarPath,
  }) {
    if (newFirstName != null) firstName = newFirstName;
    if (newLastName != null) lastName = newLastName;
    if (newEmail != null) email = newEmail;
    if (newMobile != null) mobile = newMobile;
    if (newAvatarPath != null) avatarPath = newAvatarPath;
  }

  static void logout() {
    userId = null;
    dbId = null;
    token = null;
    firstName = '';
    role = '';
  }
}
