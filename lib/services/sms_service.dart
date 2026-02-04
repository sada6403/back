import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class SmsService {
  // Base URL construction
  static String get _baseUrl => '${ApiConfig.baseUrl}/sms';

  /// Send OTP to a mobile number
  static Future<bool> sendOtp(String mobile) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/otp/send'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'mobile': mobile}),
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        debugPrint('Send OTP Failed: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Send OTP Error: $e');
      return false;
    }
  }

  /// Verify OTP
  static Future<bool> verifyOtp(String mobile, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/otp/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'mobile': mobile, 'otp': otp}),
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        debugPrint('Verify OTP Failed: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Verify OTP Error: $e');
      return false;
    }
  }

  /// Send Bulk SMS
  /// [recipients] is a list of mobile numbers
  /// [criteria] is optional filters like { 'role': 'manager' }
  static Future<Map<String, dynamic>> sendBulkSms({
    required String message,
    List<String>? recipients,
    Map<String, dynamic>? criteria,
  }) async {
    try {
      if (AuthService.token == null) {
        return {'success': false, 'message': 'Authentication required'};
      }

      final response = await http.post(
        Uri.parse('$_baseUrl/bulk'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AuthService.token}',
        },
        body: jsonEncode({
          'message': message,
          'recipients': recipients,
          'criteria': criteria,
        }),
      );

      final body = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return body;
      } else {
        return {
          'success': false,
          'message': body['message'] ?? 'Failed to send bulk SMS',
        };
      }
    } catch (e) {
      debugPrint('Bulk SMS Error: $e');
      return {'success': false, 'message': 'Network error occurred'};
    }
  }
}
